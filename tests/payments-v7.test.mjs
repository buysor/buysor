import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const load=(p,imports={},suffix='')=>{let s=stripTypeScriptTypes(read(p),{mode:'transform'});for(const [a,b]of Object.entries(imports))s=s.replaceAll(`'${a}'`,`'${b}'`);return url(s+suffix);};
const policy=load('lib/commerce-policy.ts'), safety=load('lib/request-safety.ts'),schema=load('lib/commerce-schema.ts');
const savedFetch=fetch,savedEnv={...process.env};let seq=0;
afterEach(()=>{globalThis.fetch=savedFetch;for(const k of Object.keys(process.env))if(!(k in savedEnv))delete process.env[k];Object.assign(process.env,savedEnv);});
async function setup(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE credit_ledger(user_id TEXT,amount INTEGER,source TEXT,expires_on TEXT,created_at INTEGER);CREATE TABLE decisions(id TEXT,user_id TEXT,result_json TEXT,verdict TEXT,status TEXT,updated_at INTEGER);');
 const key='paymentFixture'+ ++seq;
 globalThis[key]={prepare(sql){let args=[];return {bind(...a){args=a;return this;},runSync(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};},async run(){return this.runSync();},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};}};},async batch(items){db.exec('BEGIN IMMEDIATE');try{const out=items.map(i=>i.runSync());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const storeURL=load('lib/commerce-store.ts',{'@/db':url(`export function getD1Binding(){return globalThis['${key}'];}`),'./commerce-schema':schema,'./commerce-policy':policy,'./request-safety':safety},`\n// ${seq}`);
 const st=await import(storeURL);await st.commerceDb();
 const api=await import(load('lib/payments.ts',{'./commerce-store':storeURL,'./commerce-policy':policy,'./commerce-runtime':url('export function requireCheckout(){}'),'./request-safety':safety}));
 process.env.TOSS_SECRET_KEY='test_sk_mock';process.env.TOSS_MERCHANT_ID='merchant';process.env.PUBLIC_ORIGIN='https://buysor.test';
 db.prepare("INSERT INTO billing_orders VALUES('order1','owner','pack20','v7',1900,20,'pending',NULL,1,NULL)").run();
 const payment={orderId:'order1',paymentKey:'payment1',mId:'merchant',currency:'KRW',totalAmount:1900,balanceAmount:1900,status:'DONE',approvedAt:'2026-09-18T00:00:00Z'};
 const respond=p=>Response.json(p);return {db,st,api,payment,respond};
}
test('callback cannot grant for wrong owner, amount, merchant or currency',async()=>{
 const {api,payment,respond,st}=await setup();let calls=0;globalThis.fetch=async()=>{calls++;return respond(payment);};
 await assert.rejects(()=>api.confirmOrder('attacker','order1','payment1',1900),e=>e.status===404);
 await assert.rejects(()=>api.confirmOrder('owner','order1','payment1',1),e=>e.status===409);assert.equal(calls,0);
 for(const wrong of [{mId:'other'},{currency:'USD'},{totalAmount:1},{paymentKey:'other'}]){globalThis.fetch=async()=>respond({...payment,...wrong});await assert.rejects(()=>api.confirmOrder('owner','order1','payment1',1900),e=>e.status===409);}
 assert.equal((await st.wallet('owner')).available,0);
});
test('provider-verified confirmation and callback replay mint only one lot',async()=>{
 const {api,payment,respond,st,db}=await setup();let calls=0;globalThis.fetch=async()=>{calls++;return respond(payment);};
 await api.confirmOrder('owner','order1','payment1',1900);await api.confirmOrder('owner','order1','payment1',1900);
 assert.equal(calls,1);assert.equal((await st.wallet('owner')).available,20);assert.equal(db.prepare('SELECT COUNT(*) n FROM credit_lots').get().n,1);
});
test('unconfirmed or timed-out provider responses never mint credits',async()=>{
 const {api,payment,respond,st}=await setup();globalThis.fetch=async()=>respond({...payment,status:'READY'});
 await assert.rejects(()=>api.confirmOrder('owner','order1','payment1',1900));
 globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError');};await assert.rejects(()=>api.confirmOrder('owner','order1','payment1',1900));assert.equal((await st.wallet('owner')).available,0);
});
test('refund timeout freezes credits and retry reconciles without double cancel',async()=>{
 const {api,payment,respond,st,db}=await setup();globalThis.fetch=async()=>respond(payment);await api.confirmOrder('owner','order1','payment1',1900);let cancelCalls=0;
 globalThis.fetch=async(_u,options)=>{if(options.method==='POST'){cancelCalls++;throw new DOMException('timeout','TimeoutError');}return respond(payment);};
 await assert.rejects(()=>api.refundUnusedOrder('owner','order1'));assert.equal((await st.wallet('owner')).available,0);assert.equal(db.prepare('SELECT status FROM billing_orders').get().status,'refund_pending');
 globalThis.fetch=async()=>respond({...payment,status:'CANCELED',balanceAmount:0});await api.refundUnusedOrder('owner','order1');await api.refundUnusedOrder('owner','order1');assert.equal(cancelCalls,1);assert.equal((await st.wallet('owner')).available,0);
});
test('external cancellation removes unused credit; consumed cancellation blocks further AI',async()=>{
 const {api,payment,respond,st,db}=await setup();globalThis.fetch=async()=>respond(payment);await api.confirmOrder('owner','order1','payment1',1900);
 globalThis.fetch=async()=>respond({...payment,status:'CANCELED',balanceAmount:0});await api.reconcilePayment('order1');assert.equal((await st.wallet('owner')).available,0);assert.equal(db.prepare('SELECT status FROM billing_orders').get().status,'refunded');
 const x=await setup();globalThis.fetch=async()=>x.respond(x.payment);await x.api.confirmOrder('owner','order1','payment1',1900);x.db.prepare('UPDATE credit_lots SET available=19').run();globalThis.fetch=async()=>x.respond({...x.payment,status:'PARTIAL_CANCELED',balanceAmount:900});await x.api.reconcilePayment('order1');assert.equal((await x.st.wallet('owner')).available,0);assert.equal(x.db.prepare('SELECT status FROM billing_orders').get().status,'review');await assert.rejects(()=>x.st.reserveRun({userId:'owner',key:crypto.randomUUID(),hash:'h',feature:'standard',credits:10,reserveMicro:10,dayCapMicro:1000}),e=>e.status===409);
});
test('expired and frozen lots are excluded while valid owned credit stays usable',async()=>{
 const {api,payment,respond,st,db}=await setup();globalThis.fetch=async()=>respond(payment);await api.confirmOrder('owner','order1','payment1',1900);db.prepare('UPDATE credit_lots SET expires_at=?').run(Date.now()-1);assert.equal((await st.wallet('owner')).available,0);db.prepare('UPDATE credit_lots SET expires_at=NULL,frozen=1').run();assert.equal((await st.wallet('owner')).available,0);db.prepare('UPDATE credit_lots SET frozen=0').run();assert.equal((await st.wallet('owner')).available,20);
});
