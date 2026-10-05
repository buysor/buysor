import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const load=(path,imports={})=>{let s=stripTypeScriptTypes(source(path),{mode:'transform'});for(const [a,b] of Object.entries(imports))s=s.replaceAll(`'${a}'`,`'${b}'`);return url(s);};
const marketURL=load('lib/market.ts');
const ratesURL=load('lib/exchange-rates.ts',{'./market':marketURL});
const rates=await import(ratesURL);
const service=await import(load('lib/exchange-rate-service.ts',{'./exchange-rates':ratesURL,'@/db':url('export function getD1Binding(){throw Error("No test database")}')}));
const policyURL=load('lib/commerce-policy.ts');
const faq=await import(load('lib/support-chat.ts',{'./exchange-rates':ratesURL,'./market':marketURL,'./commerce-policy':policyURL}));
const values={GBP:.75,CAD:1.4,AUD:1.5,NZD:1.65,KRW:1350};
const rows=(now=Date.now())=>Object.entries(values).map(([quote,rate])=>({base:'USD',quote,rate,date:new Date(now).toISOString().slice(0,10)}));
const response=value=>Response.json(value);

test('all supported fees convert cents correctly, including whole Korean won',()=>{
 const snapshot=rates.parseEcbRates(rows());
 assert.ok(snapshot);
 const expected={USD:199,GBP:149,CAD:279,AUD:299,NZD:328,KRW:2687};
 for(const [currency,amount] of Object.entries(expected))assert.equal(rates.convertUsdCents(199,currency,snapshot),amount,currency);
 assert.equal(rates.convertUsdCents(999,'KRW',snapshot),13487);
 assert.match(rates.servicePrice(199,'GBP','en',snapshot).text,/≈ GBP £1\.49/);
 assert.match(rates.servicePrice(999,'KRW','ko',snapshot).text,/KRW.*13,487/);
 assert.throws(()=>rates.convertUsdCents(1.99,'GBP',snapshot));
});
test('incomplete, mixed-day, non-USD, duplicate, nonfinite and future rates are rejected',()=>{
 const good=rows();
 for(const bad of [good.slice(1),[...good,good[0]],good.map((r,i)=>i===0?{...r,base:'EUR'}:r),good.map((r,i)=>i===0?{...r,rate:0}:r),good.map((r,i)=>i===0?{...r,rate:Infinity}:r),good.map((r,i)=>i===0?{...r,date:'2020-01-01'}:r),good.map(r=>({...r,date:'2099-01-01'}))])assert.equal(rates.parseEcbRates(bad),null);
 const snapshot=rates.parseEcbRates(good);
 assert.equal(rates.readRateSnapshot({...snapshot,rates:{...snapshot.rates,USD:2}}),null);
 assert.equal(rates.readRateSnapshot({...snapshot,date:'2026-02-30'}),null);
});
test('no valid rate leaves exact USD visible instead of relabeling dollars as won',()=>{
 for(const snapshot of [null,{...rates.parseEcbRates(rows()),fetchedAt:1}]){
  const price=rates.servicePrice(999,'KRW','en',snapshot);
  assert.equal(price.currency,'USD');assert.equal(price.text,'$9.99 USD');assert.doesNotMatch(price.text,/KRW|≈/);
 }
});
test('concurrent refreshes share one request and a warm cache avoids more upstream calls',async()=>{
 let calls=0,saves=0,release;const waiting=new Promise(resolve=>release=resolve);
 const get=service.createRateService({load:async()=>null,save:async()=>{saves++;}},async(_url,options)=>{calls++;assert.ok(options.signal);await waiting;return response(rows());});
 const first=get(),second=get();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
 release();const [a,b]=await Promise.all([first,second]);assert.deepEqual(a,b);assert.equal(a.status,'latest');assert.equal(saves,1);
 await get();assert.equal(calls,1);
});
test('provider failure reuses durable last-good rates, backs off and recovers',async()=>{
 let now=Date.now(),calls=0;const saved=rates.parseEcbRates(rows(now),now);now+=31*60_000;
 let fails=true;const get=service.createRateService({load:async()=>saved,save:async()=>{}},async()=>{calls++;if(fails)throw Error('offline');return response(rows(now));},()=>now);
 const failed=await get();assert.equal(failed.status,'cached');assert.equal(failed.snapshot.date,saved.date);
 await get();assert.equal(calls,1);
 now+=5*60_000+1;fails=false;assert.equal((await get()).status,'latest');assert.equal(calls,2);
});
test('expired cache and malformed upstream cannot fabricate a conversion',async()=>{
 const snapshot={...rates.parseEcbRates(rows()),fetchedAt:1};
 const get=service.createRateService({load:async()=>snapshot,save:async()=>{}},async()=>response({rates:{KRW:1350}}));
 assert.deepEqual(await get(),{snapshot:null,status:'unavailable'});
});
test('slow cache reads are bounded; failed cache writes do not discard fresh rates',async()=>{
 const get=service.createRateService({load:()=>new Promise(()=>{}),save:async()=>{throw Error('write offline');}},async()=>response(rows()));
 const start=Date.now();const result=await get();assert.equal(result.status,'latest');assert.ok(Date.now()-start<2500);
});
test('older upstream dates never replace a newer cached observation',async()=>{
 let now=Date.now();const saved=rates.parseEcbRates(rows(now),now);now+=31*60_000;
 const old=rows(now-86_400_000);let saves=0;
 const get=service.createRateService({load:async()=>saved,save:async()=>{saves++;}},async()=>response(old),()=>now);
 const result=await get();assert.equal(result.status,'cached');assert.equal(result.snapshot.date,saved.date);assert.equal(saves,0);
});
test('support quotes selected currency and retains the exact USD charge',()=>{
 const reply=faq.answerSupportFaq('membership price','en',{currency:'KRW',snapshot:rates.parseEcbRates(rows())}).reply;
 assert.match(reply,/KRW.*13,487/);assert.match(reply,/\$9\.99 USD/);assert.match(reply,/estimates/);
});
