import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const load=(p,imports={},suffix='')=>{let s=stripTypeScriptTypes(source(p),{mode:'transform'});for(const [a,b] of Object.entries(imports))s=s.replaceAll(`'${a}'`,`'${b}'`).replaceAll(`"${a}"`,`"${b}"`);return url(s+suffix);};
const policyURL=load('lib/commerce-policy.ts'),safetyURL=load('lib/request-safety.ts'),schemaURL=load('lib/commerce-schema.ts'),marketURL=load('lib/market.ts');
const policy=await import(policyURL),market=await import(marketURL);
const savedEnv={...process.env},savedFetch=fetch;let seq=0;
afterEach(()=>{globalThis.fetch=savedFetch;for(const k of Object.keys(process.env))if(!(k in savedEnv))delete process.env[k];Object.assign(process.env,savedEnv);});
const txn='txn_'+ 'a'.repeat(26),price='pri_'+'b'.repeat(26),id='6adc08e2-1c15-4bbd-9cbe-835d82f1f3c2';
async function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE credit_ledger(user_id TEXT,amount INTEGER,source TEXT,expires_on TEXT,created_at INTEGER,reference_key TEXT);CREATE TABLE decisions(id TEXT PRIMARY KEY,user_id TEXT,result_json TEXT,verdict TEXT,status TEXT,updated_at INTEGER,input_type TEXT,created_at INTEGER);CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,display_name TEXT,created_at INTEGER,updated_at INTEGER);CREATE TABLE user_profiles(user_id TEXT,completion INTEGER,updated_at INTEGER);CREATE TABLE purchase_feedback(user_id TEXT,stage TEXT,rating INTEGER,created_at INTEGER);CREATE TABLE attendance(user_id TEXT,attendance_date TEXT,daily_reward INTEGER,milestone_reward INTEGER,created_at INTEGER,PRIMARY KEY(user_id,attendance_date));`);
 const key='globalFixture'+ ++seq;
 globalThis[key]={prepare(sql){let args=[];return {bind(...a){args=a;return this;},runSync(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};},async run(){return this.runSync();},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};}};},async batch(items){db.exec('BEGIN IMMEDIATE');try{const out=items.map(i=>i.runSync());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const dbURL=url(`export function getD1Binding(){return globalThis['${key}'];}`);
 const storeURL=load('lib/commerce-store.ts',{'@/db':dbURL,'./commerce-schema':schemaURL,'./commerce-policy':policyURL,'./request-safety':safetyURL},`\n// ${seq}`);
 const store=await import(storeURL);await store.commerceDb();
 const api=await import(load('lib/global-payments.ts',{'./commerce-store':storeURL,'./commerce-policy':policyURL,'./commerce-runtime':url('export function requireCheckout(){}'),'./request-safety':safetyURL}));
 const analytics=await import(load('lib/analytics-store.ts',{'./commerce-store':storeURL},`\n// ${seq}`));
 const attendance=await import(load('lib/attendance.ts',{'@/db':dbURL,'./market':marketURL}));
 process.env.PADDLE_ENV='sandbox';process.env.PADDLE_API_KEY='pdl_sdbx_apikey_mock';process.env.PADDLE_PRICE_PACK20=price;process.env.PUBLIC_ORIGIN='https://buysor.test';
 db.prepare('INSERT INTO billing_orders(id,user_id,product_id,policy_version,amount,credits,status,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'owner','pack20',policy.BILLING_POLICY_VERSION,199,20,'pending',Date.now());
 db.prepare("INSERT INTO billing_market(order_id,provider,currency,price_id,transaction_id) VALUES(?,'paddle','USD',?,?)").run(id,price,txn);
 const transaction={id:txn,status:'completed',currency_code:'USD',custom_data:{order_id:id,user_id:'owner',policy_version:policy.BILLING_POLICY_VERSION},items:[{quantity:1,price:{id:price,billing_cycle:null,tax_mode:'external',unit_price:{amount:'199',currency_code:'USD'}}}],details:{totals:{subtotal:'199',discount:'0',tax:'20',total:'219',grand_total:'219'}},payments:[{amount:'219',status:'captured'}],adjustments:[]};
 return {db,store,api,analytics,attendance,transaction,respond:t=>Response.json({data:t})};
}
test('USD launch prices cover full credit redemption with provider fees and refund reserve',()=>{
 assert.deepEqual(policy.USD_CREDIT_PACKS.map(p=>[p.price,p.credits]),[[199,20],[799,100],[1999,300]]);
 for(const p of [...policy.USD_CREDIT_PACKS,policy.USD_MEMBERSHIP]){const price=p.price/100,net=price-price*.05-.50-price*.03-p.credits*24/1600;assert.ok(net/price>.40);}
 assert.equal(policy.MEMBERSHIP.price,9900);assert.equal(policy.POLICY_VERSION,'2026-09-18-v7');
});
test('decimal money preserves cents and currency, without reinterpreting legacy won',()=>{
 assert.equal(market.parseMoney('199.99','USD'),19999);assert.equal(market.parseMoney('9.5','GBP'),950);assert.equal(market.parseMoney('1900','KRW'),1900);
 for(const s of ['9.999','1,999','-1','1e3','NaN'])assert.equal(market.parseMoney(s,'USD'),null);
 assert.match(market.formatMoney(1900,'KRW'),/₩1,900/);assert.match(market.formatMoney(199,'USD'),/\$1.99/);
 assert.match(market.budgetLabel('budget:GBP:comfort:0'),/£150/);assert.match(market.budgetLabel('budget:USD:comfort:0','ko'),/\$200/);
});
test('dates follow local midnight and DST, with a safe unknown-zone fallback',()=>{
 const date=new Date('2026-03-08T07:30:00Z');assert.equal(market.dateInZone(date,'America/Los_Angeles'),'2026-03-07');assert.equal(market.dateInZone(date,'Europe/London'),'2026-03-08');assert.equal(market.validTimeZone('not/a/zone'),'UTC');
});
test('legacy budgets and km remain exact, while new regional choices can be selected',async()=>{
 const survey=await import(load('lib/user-model-survey.ts'));
 const locale=await import(load('lib/user-model-locale.ts',{'@/lib/market':marketURL}));
 const budget=survey.GENERAL_SURVEY.find(s=>s.id==='finance').questions.find(q=>q.id==='budgetComfort');
 const old=budget.options[0];const choices=locale.getSurveyOptions(budget,'en','US',old);
 assert.equal(choices[0].value,old);assert.match(choices[0].label,/₩/);assert.ok(choices.some(c=>c.value==='budget:USD:comfort:0'));
 const distance=survey.CATEGORY_SURVEYS['자동차'].questions.find(q=>q.id==='carDistance');
 assert.match(locale.getOptionLabel(distance,distance.options[0],'en','US'),/km/);
 assert.match(locale.getSurveyOptions(distance,'en','US')[0].value,/distance:mi:/);
});
test('Paddle verification rejects wrong owner, currency, price, tax, capture and transaction',async()=>{
 const {api,transaction,db,store,respond}=await fixture();
 globalThis.fetch=async()=>respond(transaction);
 await assert.rejects(()=>api.confirmGlobalOrder('attacker',id,txn),e=>e.status===404);
 await assert.rejects(()=>api.confirmGlobalOrder('owner',id,'txn_'+'z'.repeat(26)),e=>e.status===409);
 for(const wrong of [{currency_code:'GBP'},{custom_data:{...transaction.custom_data,user_id:'attacker'}},{items:[{...transaction.items[0],price:{...transaction.items[0].price,id:'pri_'+'z'.repeat(26)}}]},{details:{totals:{...transaction.details.totals,total:'199'}}},{payments:[{amount:'199',status:'captured'}]},{status:'ready'}]){
  globalThis.fetch=async()=>respond({...transaction,...wrong});await assert.rejects(()=>api.confirmGlobalOrder('owner',id,txn));
 }
 assert.equal((await store.wallet('owner')).available,0);assert.equal(db.prepare('SELECT status FROM billing_orders').get().status,'pending');
});
test('verified callback and webhook replays grant once and keep original won history',async()=>{
 const {api,transaction,db,store,respond}=await fixture();globalThis.fetch=async()=>respond(transaction);
 db.prepare("INSERT INTO billing_orders VALUES('legacy','owner','pack20','v7',1900,20,'pending',NULL,1,NULL)").run();
 await Promise.all([api.confirmGlobalOrder('owner',id,txn),api.confirmGlobalOrder('owner',id,txn)]);await api.reconcileGlobalPayment(txn,id);
 assert.equal((await store.wallet('owner')).available,20);assert.equal(db.prepare('SELECT COUNT(*) n FROM credit_lots').get().n,1);
 assert.equal(db.prepare("SELECT amount FROM billing_orders WHERE id='legacy'").get().amount,1900);assert.equal(db.prepare('SELECT total_amount FROM billing_market').get().total_amount,219);
});
test('refund timeouts lock credits and never create a second uncertain refund',async()=>{
 const {api,transaction,db,store,respond}=await fixture();globalThis.fetch=async()=>respond(transaction);await api.confirmGlobalOrder('owner',id,txn);let creates=0;
 globalThis.fetch=async(_url,options)=>{if(options.method==='POST'){creates++;throw new DOMException('timeout','TimeoutError');}return respond(transaction);};
 await assert.rejects(()=>api.refundGlobalOrder('owner',id));await assert.rejects(()=>api.refundGlobalOrder('owner',id));assert.equal(creates,1);assert.equal((await store.wallet('owner')).available,0);
 globalThis.fetch=async()=>respond({...transaction,adjustments:[{id:'adj_mock',transaction_id:txn,action:'refund',type:'full',status:'approved',currency_code:'USD',totals:{total:'219'}}]});
 await api.reconcileGlobalPayment(txn);assert.equal(db.prepare('SELECT status FROM billing_orders').get().status,'refunded');assert.equal((await store.wallet('owner')).available,0);
});
test('signed webhook payload and timestamp must verify before reconciliation',async()=>{
 const {api}=await fixture();const secret='secret'.repeat(6),raw='{"event_type":"transaction.completed"}',now=Date.now(),ts=Math.floor(now/1000),signature=createHmac('sha256',secret).update(`${ts}:${raw}`).digest('hex');
 assert.equal(await api.verifyPaddleSignature(raw,`ts=${ts};h1=${signature}`,secret,now),true);
 assert.equal(await api.verifyPaddleSignature(raw+' ',`ts=${ts};h1=${signature}`,secret,now),false);
 assert.equal(await api.verifyPaddleSignature(raw,`ts=${ts};h1=${signature}`,secret,now+301000),false);
 assert.equal(await api.verifyPaddleSignature(raw,`ts=${ts};ts=${ts};h1=${signature}`,secret,now),false);
});
test('operating revenue never sums cents with won, and outcomes retain each currency',async()=>{
 const {api,transaction,db,analytics,respond}=await fixture();globalThis.fetch=async()=>respond(transaction);await api.confirmGlobalOrder('owner',id,txn);
 db.prepare("INSERT INTO billing_orders VALUES('legacy','owner','pack20','v7',1900,20,'pending',NULL,1,NULL)").run();db.prepare("UPDATE billing_orders SET status='paid',payment_key='legacy_key',paid_at=? WHERE id='legacy'").run(Date.now());
 db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run('owner','owner@example.test','owner',1,1);
 await analytics.ensureAnalyticsSchema();db.prepare("INSERT INTO decisions(id,user_id,status,updated_at,created_at) VALUES('d1','owner','completed',?,?)").run(Date.now(),Date.now());
 db.prepare("INSERT INTO purchase_outcomes VALUES('o1','owner','d1','bought',12345,5,NULL,NULL,?,?)").run(Date.now(),Date.now());db.prepare("INSERT INTO purchase_outcome_market VALUES('d1','GBP')").run();
 const data=await analytics.getAdminAnalytics(7);assert.equal(data.summary.revenueToday,199);assert.equal(data.summary.legacyRevenueToday,1900);assert.deepEqual(data.summary.recordedPurchaseValues.map(v=>({...v})),[{currency:'GBP',amount:12345}]);
});
test('local check-ins work even when a legacy date key is occupied, without rewards',async()=>{
 const {attendance,db}=await fixture();const user={id:'owner',email:'owner@example.test'};const today=market.dateInZone(new Date(),'America/Los_Angeles');
 db.prepare('INSERT INTO attendance VALUES(?,?,0,0,?)').run(user.id,today,Date.now()-86400000);
 const data=await attendance.checkIn(user,'America/Los_Angeles');assert.equal(data.checkedToday,true);assert.equal(data.timeZone,'America/Los_Angeles');assert.equal(data.creditedReward,0);
 await attendance.checkIn(user,'America/Los_Angeles');assert.equal(db.prepare('SELECT COUNT(*) n FROM attendance_visits').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);
});
