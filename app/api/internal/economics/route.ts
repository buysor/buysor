import {commerceDb} from '@/lib/commerce-store';
import {runtimeConfig} from '@/lib/commerce-runtime';
import {digest,json,errorResponse} from '@/lib/request-safety';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const secret=process.env.BUYSOR_OPS_TOKEN;
 if(!secret||secret.length<32||await digest(request.headers.get('authorization')||'')!==await digest(`Bearer ${secret}`))return json({error:'Not found'},404);
 const db=await commerceDb();const since=Date.now()-30*86400000;
 const orders=await db.prepare("SELECT status,COUNT(*) AS count,SUM(amount) AS gross_krw FROM billing_orders WHERE created_at>=? GROUP BY status").bind(since).all();
 const runs=await db.prepare('SELECT feature,state,COUNT(*) AS count,SUM(reserved_micro) AS reserved_micro,SUM(actual_micro) AS measured_micro,SUM(CASE WHEN actual_micro IS NULL THEN reserved_micro ELSE actual_micro END) AS conservative_micro FROM credit_runs WHERE created_at>=? GROUP BY feature,state').bind(since).all();
 const liabilities=await db.prepare('SELECT kind,SUM(available) AS remaining_credits FROM credit_lots WHERE expires_at IS NULL OR expires_at>? GROUP BY kind').bind(Date.now()).all();
 return json({windowDays:30,fxPlanning:runtimeConfig().fx,orders:orders.results,runs:runs.results,liabilities:liabilities.results,
  note:'Operational metrics, NOT accounting net profit. Deduct VAT, refunds, PG, support, acquisition, fixed expenses and taxes separately.'});
}catch(e){return errorResponse(e);}}
