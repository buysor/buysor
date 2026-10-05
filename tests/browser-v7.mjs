import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4173';
const evidence=process.env.EVIDENCE_DIR||'browser-evidence';
await mkdir(evidence,{recursive:true});
for(let i=0;i<90;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===89)throw Error('Server not ready');await new Promise(r=>setTimeout(r,1000));}
const browser=await chromium.launch();const results=[];
async function waitForPreferences(page,language='ko',theme='light'){
 await page.waitForFunction(expected=>document.documentElement.dataset.preferencesReady==='true'&&document.documentElement.lang===expected.language&&document.documentElement.dataset.theme===expected.theme,{language,theme},{timeout:90000});
}
try{
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,colorScheme:'dark'});
  await context.addInitScript(()=>{localStorage.setItem('buysor-language','ko');localStorage.setItem('buysor-theme','dark');localStorage.setItem('buysor-market','KR');});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#decision-example').waitFor();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  await waitForPreferences(page,'en','light');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('buysor-visit-market-v1')),'US');
  assert.ok((await page.locator('[data-service-price]').evaluateAll(elements=>elements.map(e=>e.dataset.priceCurrency))).every(currency=>currency==='USD'));
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.getByRole('button',{name:'Korean',exact:true}).click();
  await waitForPreferences(page,'ko','light');
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:[...document.images].map(i=>({src:i.currentSrc,ok:i.complete&&i.naturalWidth>0}))}));
  assert.ok(layout.width<=width+2,JSON.stringify(layout));assert.ok(layout.height>2200);assert.ok(layout.images.every(i=>i.ok));
  await page.screenshot({path:`${evidence}/home-${width}.png`,fullPage:true});
  await page.locator('button[aria-haspopup="menu"]').click();
  await page.locator('[role="menu"] a[href="/credits"]').click();await page.waitForURL('**/credits');await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button',{name:'결제 준비 중',exact:true}).first().waitFor({timeout:20000});
  assert.ok((await page.locator('main').innerText()).includes('1.99'));assert.equal(await page.locator('main button:disabled').count(),3);
  await page.screenshot({path:`${evidence}/credits-${width}.png`,fullPage:true});
  await page.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});
  await waitForPreferences(page);
  await page.getByRole('status').filter({hasText:'공개 준비 버전'}).waitFor({timeout:20000});
  assert.equal(await page.locator('main button:disabled').count(),1);assert.equal(await page.locator('main [class*="planCard"]').count(),1);
  await page.screenshot({path:`${evidence}/membership-${width}.png`,fullPage:true});
  {await page.goto(origin,{waitUntil:'domcontentloaded'});await waitForPreferences(page);await page.getByRole('button',{name:'메뉴',exact:true}).click();await page.getByRole('button',{name:'다크 모드',exact:true}).click();await waitForPreferences(page,'ko','dark');await page.getByRole('button',{name:'메뉴',exact:true}).click();await page.reload({waitUntil:'domcontentloaded'});await waitForPreferences(page,'ko','dark');const dark=await page.evaluate(()=>{const hero=document.querySelector('main section');const frame=document.querySelector('[class*=frame]');const visible=[...frame.querySelectorAll('picture')].filter(p=>getComputedStyle(p).display!=='none');return {background:getComputedStyle(hero).backgroundColor,pictures:visible.map(p=>p.querySelector('img').currentSrc)};});assert.match(dark.background,/rgb\((?:[0-3]?\d),/);assert.equal(dark.pictures.length,1);assert.match(dark.pictures[0],/buysor-studio-dark-20260930/);await page.screenshot({path:`${evidence}/home-dark-${width}.png`,fullPage:true});}
  const reopened=await context.newPage();await reopened.goto(origin,{waitUntil:'domcontentloaded'});await waitForPreferences(reopened,'en','light');assert.equal(await reopened.evaluate(()=>sessionStorage.getItem('buysor-visit-market-v1')),'US');assert.ok((await reopened.locator('[data-service-price]').evaluateAll(elements=>elements.map(e=>e.dataset.priceCurrency))).every(currency=>currency==='USD'));await reopened.close();
  assert.deepEqual(errors,[]);results.push({width,layout,status:'passed'});await context.close();
 }
 const response=await fetch(origin+'/api/commerce/status');assert.equal(response.status,200);const status=await response.json();
 assert.equal(status.checkoutReady,false);assert.equal(status.subscriptionReady,false);assert.equal(status.aiReady,false);assert.equal(status.authenticated,false);assert.deepEqual(Object.values(status.rewards),[0,0,0]);
 const denied=await fetch(origin+'/api/decision',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);
 const preview=await fetch(origin+'/api/subscription',{method:'POST'});assert.equal(preview.status,405);
 await writeFile(`${evidence}/results.json`,JSON.stringify({results,status,unauthenticatedDecision:denied.status,disabledTierSwitch:preview.status},null,2));
 console.log('Browser checks passed at 1440, 768 and 390 pixels; live billing/AI disabled and ready-state hydrated.');
 const liveRateResponse=await fetch(origin+'/api/currency/rates');assert.equal(liveRateResponse.status,200);const liveRates=await liveRateResponse.json();
 assert.ok(liveRates.snapshot,'A real published rate must be available for release verification: '+JSON.stringify(liveRates));assert.equal(liveRates.snapshot.base,'USD');assert.equal(liveRates.snapshot.source,'frankfurter-ecb');
 for(const code of ['USD','GBP','CAD','AUD','NZD','KRW'])assert.ok(Number.isFinite(liveRates.snapshot.rates[code])&&liveRates.snapshot.rates[code]>0,code);
 await writeFile(`${evidence}/live-rates.json`,JSON.stringify(liveRates,null,2));
 // Regression: persisted English, public surfaces, survey steps and help.
 // Fixtures prevent account changes, orders and credit charges.
 const localeResults=[];
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const originalProfile={stateText:'기존에 작성한 내 정보',structuredState:null,survey:{activity:['학생'],mobility:25,category:['노트북','스마트폰','자동차','전동공구']},categoryProfiles:{},completion:25};
  await context.addInitScript(profile=>{
   if(!localStorage.getItem('buysor-user-model'))localStorage.setItem('buysor-user-model',JSON.stringify(profile));
   sessionStorage.setItem('buysor-draft',JSON.stringify({type:'name',value:'Laptop',categoryId:'laptop',subcategoryId:null}));
  },originalProfile);
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   let body={};let status=200;
   if(path==='/api/auth/me')body={authenticated:false};
   else if(path==='/api/commerce/status')body={authenticated:false,checkoutReady:false,subscriptionReady:false,aiReady:false,balance:null};
   else if(path==='/api/ai/status')body={configured:false,provider:null,model:null};
   else if(path==='/api/billing/history')body={items:['pending','paid','refund_pending','refunded','review'].map((state,index)=>({id:`fixture-${index}`,product_id:'pack20',amount:index===1?219:1900,currency:index===1?'USD':'KRW',credits:20,status:state,created_at:0}))};
   else if(path==='/api/attendance'){status=401;body={error:'로그인이 필요합니다.'};}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage();const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  async function checkEnglish(label){
   await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.documentElement.dataset.preferencesReady==='true');
   assert.doesNotMatch((await page.locator('body').innerText()).replaceAll(originalProfile.stateText,''),/[가-힣ㄱ-ㅎㅏ-ㅣ]/,label);
   assert.doesNotMatch(await page.title(),/[가-힣]/,label+' title');
   const layout=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(layout.content<=layout.viewport+2,label+' overflow '+JSON.stringify(layout));
   localeResults.push({width,label,status:'passed'});
  }
  for(const path of ['/','/credits','/pricing','/guide','/usage-policy','/support','/profile?tab=state','/lens','/category','/advisor','/decision','/attendance','/billing/fail','/billing/success','/reports/weekly','/reports/monthly']){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.documentElement.lang==='en'&&document.documentElement.dataset.preferencesReady==='true');
   if(path==='/credits')await page.getByText('Payment pending',{exact:false}).waitFor();
   if(path==='/profile?tab=state')assert.equal(await page.locator('textarea').inputValue(),originalProfile.stateText);
   await checkEnglish(path);
   if(path==='/'||path==='/credits')await page.screenshot({path:`${evidence}/${path==='/'?'home':'credits'}-english-${width}.png`,fullPage:true});
  }
  await page.goto(origin+'/advisor',{waitUntil:'domcontentloaded'});
  await waitForPreferences(page,'en');
  await page.getByRole('button',{name:'Work · study',exact:true}).click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Under $200',exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Shopping region',exact:true}).selectOption('GB');
  await page.getByRole('button',{name:'Under GBP £150',exact:true}).waitFor();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.getByRole('button',{name:'Korean',exact:true}).click();
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  assert.equal(await page.getByRole('combobox',{name:'제품을 구매할 지역',exact:true}).inputValue(),'GB');
  assert.ok((await page.locator('main').innerText()).includes('£150'));
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  await page.getByRole('button',{name:'English',exact:true}).click();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Work · study',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('buysor-visit-market-v1')),'GB');
  await page.goto(origin+'/profile?tab=survey',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Next',exact:true}).waitFor();
  await checkEnglish('survey traits');
  for(const label of ['Price sensitivity','Performance priority','Risk aversion','Long-term ownership','Used-product openness','Resale importance'])assert.equal(await page.getByText(label,{exact:true}).count(),1);
  await page.getByRole('button',{name:'Show question explanation',exact:true}).first().click();
  await page.getByText('Why do we ask this?',{exact:true}).first().waitFor({state:'visible'});
  await checkEnglish('survey help');
  await page.screenshot({path:`${evidence}/profile-english-${width}.png`,fullPage:true});
  for(let step=0;step<20;step++){
   await checkEnglish('survey step '+(step+1));
   const next=page.getByRole('button',{name:'Next',exact:true});
   if(!await next.count())break;
   await next.click();
  }
  await page.getByRole('button',{name:'Sign in & save',exact:true}).waitFor();
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  await checkEnglish('expanded menu');
  await page.getByRole('button',{name:'Korean',exact:true}).click();
  await page.waitForFunction(()=>document.documentElement.lang==='ko');
  assert.equal(await page.getByText('가격 민감도',{exact:true}).count(),1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('buysor-user-model')));
  assert.equal(saved.stateText,originalProfile.stateText);
  assert.deepEqual(saved.survey,originalProfile.survey);
  await page.getByRole('button',{name:'English',exact:true}).click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Next',exact:true}).waitFor();
  await checkEnglish('reload keeps English');
  assert.deepEqual(pageErrors,[]);
  await writeFile(`${evidence}/locale-results.json`,JSON.stringify(localeResults,null,2));
  console.log(`English checks passed at ${width} pixels.`);
  await context.close();
 }
 await writeFile(`${evidence}/locale-results.json`,JSON.stringify(localeResults,null,2));
 console.log('English UI, billing states, survey help, language switching and saved profiles passed at desktop and mobile widths.');

 // Currency changes affect every service fee; outage recovery never changes the USD order.
 const currencyResults=[];
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(()=>{localStorage.setItem('buysor-market','KR');localStorage.setItem('buysor-language','ko');});
  let mode='latest',rateCalls=0,orderBody=null;
  const snapshot={version:1,base:'USD',source:'frankfurter-ecb',date:new Date().toISOString().slice(0,10),fetchedAt:Date.now(),rates:{USD:1,GBP:.75,CAD:1.4,AUD:1.5,NZD:1.65,KRW:1350}};
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let body={};let status=200;
   if(path==='/api/currency/rates'){rateCalls++;if(mode==='offline'){await route.abort('failed');return;}body={status:'latest',snapshot};}
   else if(path==='/api/auth/me')body={authenticated:true,user:{id:'fixture',email:'test@example.test'}};
   else if(path==='/api/commerce/status')body={authenticated:true,checkoutReady:true,subscriptionReady:false,aiReady:false,balance:{available:0}};
   else if(path==='/api/billing/history')body={items:[{id:'original-usd',credits:20,amount:219,currency:'USD',status:'paid'},{id:'original-krw',credits:20,amount:1900,currency:'KRW',status:'paid'}]};
   else if(path==='/api/billing/order'){orderBody=route.request().postDataJSON();status=409;body={error:'Fixture checkout stopped before any payment.'};}
   else if(path==='/api/billing/checkout')body={orderId:'fixture',status:'pending',amount:199,credits:20,clientToken:null};
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  await page.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});await waitForPreferences(page,'en');
  await page.locator('[data-service-price="999"][data-price-currency="USD"]').waitFor();
  assert.equal(await page.locator('main').getByRole('combobox',{name:'Shopping region',exact:true}).inputValue(),'US');
  await page.locator('main').getByRole('combobox',{name:'Shopping region',exact:true}).selectOption('KR');
  await page.locator('[data-service-price="999"][data-price-currency="KRW"]').waitFor();
  const expected={US:['USD','$9.99 USD'],GB:['GBP','≈ GBP £7.49'],CA:['CAD','≈ CAD CA$13.99'],AU:['AUD','≈ AUD A$14.99'],NZ:['NZD','≈ NZD NZ$16.48'],KR:['KRW','≈ KRW ₩13,487']};
  const before=rateCalls;
  for(const [region,[currency,text]] of Object.entries(expected)){
   await page.locator('main').getByRole('combobox',{name:'Shopping region',exact:true}).selectOption(region);
   await page.locator(`[data-service-price="999"][data-price-currency="${currency}"]`).waitFor();
   assert.equal(await page.locator('[data-service-price="999"] > span').innerText(),text,region);
  }
  assert.equal(rateCalls,before,'Changing regions must not wait for another FX request');
  await page.screenshot({path:`${evidence}/currency-membership-${width}.png`,fullPage:true});
  for(const path of ['/','/credits','/guide','/billing/checkout?_ptxn=fixture']){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});await waitForPreferences(page,'en');
   await page.locator('[data-service-price][data-price-currency="KRW"]').first().waitFor();
   const currencies=await page.locator('[data-service-price]').evaluateAll(elements=>elements.map(e=>e.dataset.priceCurrency));
   assert.ok(currencies.length>0&&currencies.every(c=>c==='KRW'),path+JSON.stringify(currencies));
   assert.ok((await page.locator('main').innerText()).includes('USD'),path+' actual charge disclosure');
   const size=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(size.content<=size.viewport+2,path+' overflow');
  }
  await page.goto(origin+'/credits',{waitUntil:'domcontentloaded'});await waitForPreferences(page,'en');
  await page.locator('[data-service-price="199"][data-price-currency="KRW"]').waitFor();
  await page.getByText('original-usd',{exact:false}).waitFor();assert.ok((await page.locator('main').innerText()).includes('$2.19'));assert.ok((await page.locator('main').innerText()).includes('₩1,900'));
  await page.locator('main input[type="checkbox"]').first().check();
  await page.getByRole('button',{name:'Pay $1.99 USD',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[role="alert"]'));
  assert.equal(orderBody.currency,'USD');assert.equal(orderBody.acceptedPrice,199);assert.equal(orderBody.productId,'pack20');
  mode='offline';await page.reload({waitUntil:'domcontentloaded'});await waitForPreferences(page,'en');
  await page.locator('[data-rate-status="cached"]').waitFor();
  assert.equal(await page.locator('[data-service-price="199"] > span').innerText(),'≈ KRW ₩2,687');
  await page.getByText('Using last available rates',{exact:false}).waitFor();
  await page.screenshot({path:`${evidence}/currency-cached-${width}.png`,fullPage:true});
  await page.evaluate(()=>localStorage.removeItem('buysor-reference-rates-v1'));
  await page.reload({waitUntil:'domcontentloaded'});await waitForPreferences(page,'en');
  await page.locator('[data-rate-status="unavailable"]').waitFor();
  assert.equal(await page.locator('[data-service-price="199"] > span').innerText(),'$1.99 USD');
  await page.locator('main').getByRole('combobox',{name:'Shopping region',exact:true}).selectOption('GB');
  assert.equal(await page.locator('[data-service-price="199"]').getAttribute('data-price-currency'),'USD');
  mode='latest';await page.clock.fastForward(5*60_000+1000);
  await page.locator('[data-service-price="199"][data-price-currency="GBP"]').waitFor();
  assert.equal(await page.locator('[data-service-price="199"] > span').innerText(),'≈ GBP £1.49');
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Korean',exact:true}).click();await waitForPreferences(page,'ko');
  await page.getByRole('button',{name:'메뉴',exact:true}).click();
  assert.equal(await page.locator('[data-service-price="199"]').getAttribute('data-price-currency'),'GBP');
  const fresh=await context.newPage();await fresh.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});await waitForPreferences(fresh,'en','light');
  await fresh.locator('[data-service-price="999"][data-price-currency="USD"]').waitFor();
  assert.equal(await fresh.locator('main').getByRole('combobox',{name:'Shopping region',exact:true}).inputValue(),'US');
  assert.equal(await fresh.locator('[data-service-price="999"] > span').innerText(),'$9.99 USD');
  await fresh.close();
  assert.deepEqual(errors,[]);currencyResults.push({width,status:'passed',rateCalls,canonicalOrder:orderBody});await context.close();
 }
 await writeFile(`${evidence}/currency-results.json`,JSON.stringify(currencyResults,null,2));
 console.log('Currency conversion, all six regions, USD consent, historical receipts, outage fallback and automatic recovery passed at desktop and mobile widths.');
}finally{await browser.close();}
