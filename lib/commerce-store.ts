import { getD1Binding } from '@/db';
import { SCHEMA_SQL } from './commerce-schema';
import { POLICY_VERSION, type Feature } from './commerce-policy';
import { PublicError } from './request-safety';

type DB = ReturnType<typeof getD1Binding>;
type Run = {id:string;user_id:string;state:string;payload_hash:string;result_json:string|null;decision_id?:string|null;credits:number;reserved_micro:number};
let ready: Promise<void> | null = null;
export async function commerceDb(): Promise<DB> {
 const db=getD1Binding();
 if (!ready) ready=(async()=>{
   let applied=false;
   try { applied=Boolean(await db.prepare('SELECT version FROM commerce_meta WHERE version=?').bind(POLICY_VERSION).first()); } catch {}
   if (!applied) await db.batch(SCHEMA_SQL.map(sql=>db.prepare(sql)));
 })().catch(error=>{ready=null;throw error;});
 await ready; return db;
}
export async function wallet(userId:string) {
 const db=await commerceDb(); const now=Date.now();
 // Preserve pre-policy, non-expired balances exactly once. No retroactive confiscation.
 await db.prepare(`INSERT OR IGNORE INTO credit_lots(id,user_id,kind,granted,available,expires_at,source_key,created_at)
  SELECT 'legacy-v7:'||user_id||':'||expires_on,user_id,'verified_legacy',SUM(amount),SUM(amount),
   CAST(strftime('%s',expires_on||'T15:00:00Z') AS INTEGER)*1000,
   'legacy-v7:'||user_id||':'||expires_on,?
  FROM credit_ledger WHERE user_id=? AND source!='system_reset'
   AND created_at<=(SELECT applied_at FROM commerce_meta WHERE version=?)
   AND CAST(strftime('%s',expires_on||'T15:00:00Z') AS INTEGER)*1000>?
  GROUP BY user_id,expires_on HAVING SUM(amount)>0`).bind(now,userId,POLICY_VERSION,now).run();
 // A killed request cannot hold customer credits forever. Budget remains held.
 await db.prepare("UPDATE credit_runs SET state='failed',updated_at=? WHERE user_id=? AND state='reserved' AND created_at<?")
  .bind(now,userId,now-10*60*1000).run();
 const lots=await db.prepare('SELECT kind,available,expires_at FROM credit_lots WHERE user_id=? AND frozen=0 AND (expires_at IS NULL OR expires_at>?) ORDER BY expires_at')
  .bind(userId,now).all<{kind:string;available:number;expires_at:number|null}>();
 const total=(lots.results??[]).reduce((sum,r)=>sum+r.available,0);
 return {available:total,lots:lots.results??[]};
}
export async function existingRun(userId:string,key:string) {
 const db=await commerceDb();
 return db.prepare('SELECT * FROM credit_runs WHERE user_id=? AND request_key=?').bind(userId,key).first<Run>();
}
export async function reserveRun(input:{userId:string;key:string;hash:string;feature:Feature;credits:number;reserveMicro:number;dayCapMicro:number}) {
 const db=await commerceDb(); await wallet(input.userId);
 if(await db.prepare("SELECT id FROM billing_orders WHERE user_id=? AND status='review' LIMIT 1").bind(input.userId).first())throw new PublicError(409,'PAYMENT_REVIEW','결제 취소 내역을 확인 중입니다. 고객지원에 문의해 주세요.');
 const existing=await existingRun(input.userId,input.key); if(existing) return {run:existing,fresh:false};
 const now=Date.now(); const day=new Date(now).toISOString().slice(0,10);
 const lots=await db.prepare(`SELECT id,available FROM credit_lots WHERE user_id=? AND frozen=0 AND available>0 AND (expires_at IS NULL OR expires_at>?)
  ORDER BY CASE WHEN kind='bonus' THEN 0 ELSE 1 END,COALESCE(expires_at,9007199254740991),created_at,id`).bind(input.userId,now).all<{id:string;available:number}>();
 let need=input.credits; const allocations:Array<{id:string;amount:number}>=[];
 for(const l of lots.results??[]) {const amount=Math.min(need,l.available); if(amount>0) allocations.push({id:l.id,amount});need-=amount;if(!need)break;}
 if(need)throw new PublicError(402,'INSUFFICIENT_CREDITS','크레딧이 부족합니다. 충전 후 시작해 주세요.');
 const id=crypto.randomUUID();
 try {
  await db.batch([
   db.prepare('INSERT INTO credit_budget_days(day,cap_micro) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET cap_micro=MIN(cap_micro,excluded.cap_micro)').bind(day,input.dayCapMicro),
   db.prepare(`INSERT INTO credit_runs(id,user_id,request_key,payload_hash,feature,credits,state,budget_day,reserved_micro,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'reserved',?,?,?,?)`).bind(id,input.userId,input.key,input.hash,input.feature,input.credits,day,input.reserveMicro,now,now),
   ...allocations.map(l=>db.prepare('INSERT INTO credit_allocations(run_id,lot_id,amount) VALUES(?,?,?)').bind(id,l.id,l.amount)),
  ]);
 } catch(error) {
  const old=await existingRun(input.userId,input.key); if(old) return {run:old,fresh:false};
  const message=String(error);
  if(message.includes('DAILY_AI_BUDGET_EXCEEDED'))throw new PublicError(429,'DAILY_LIMIT','오늘의 분석 처리 한도에 도달했습니다. 크레딧은 차감되지 않았습니다.');
  throw new PublicError(409,'REQUEST_CONFLICT','진행 중인 분석을 먼저 확인해 주세요. 동시 요청은 차감하지 않습니다.');
 }
 return {run:{id,user_id:input.userId,state:'reserved',payload_hash:input.hash,result_json:null,credits:input.credits,reserved_micro:input.reserveMicro},fresh:true};
}
export async function completeRun(id:string,userId:string,result:unknown,decisionId?:string) {
 const db=await commerceDb(); const now=Date.now(); const text=JSON.stringify(result);
 const ops=[db.prepare("UPDATE credit_runs SET state='completed',result_json=?,decision_id=?,updated_at=? WHERE id=? AND user_id=? AND state='reserved'").bind(text,decisionId??null,now,id,userId)];
 if(decisionId)ops.push(db.prepare(`UPDATE decisions SET result_json=?,verdict=?,status='completed',updated_at=?
  WHERE id=? AND user_id=? AND EXISTS(SELECT 1 FROM credit_runs WHERE id=? AND state='completed')`)
  .bind(text,(result as {verdict:string}).verdict,now,decisionId,userId,id));
 const results=await db.batch(ops);
 if(Number(results[0].meta.changes)!==1)throw new PublicError(409,'REQUEST_EXPIRED','처리 시간을 초과했습니다. 사용권 상태를 다시 확인해 주세요.');
}
export async function failRun(id:string,userId:string) {
 const db=await commerceDb();
 await db.prepare("UPDATE credit_runs SET state='failed',updated_at=? WHERE id=? AND user_id=? AND state='reserved'").bind(Date.now(),id,userId).run();
}
export async function recordUsage(id:string,userId:string,usage:{micro:number;input:number;output:number;providerId:string}) {
 const db=await commerceDb();
 await db.prepare('UPDATE credit_runs SET actual_micro=?,input_tokens=?,output_tokens=?,provider_request_id=? WHERE id=? AND user_id=? AND actual_micro IS NULL')
 .bind(usage.micro,usage.input,usage.output,usage.providerId,id,userId).run();
}
