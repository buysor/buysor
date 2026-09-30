import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4173';
const evidence=process.env.EVIDENCE_DIR||'browser-evidence';
await mkdir(evidence,{recursive:true});
for(let i=0;i<90;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===89)throw Error('Server not ready');await new Promise(r=>setTimeout(r,1000));}
const browser=await chromium.launch();const results=[];
async function waitForPreferences(page,language='ko',theme='light'){
 await page.waitForFunction(expected=>document.documentElement.lang===expected.language&&document.documentElement.dataset.theme===expected.theme,{language,theme},{timeout:90000});
}
try{
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#decision-example').waitFor();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  await waitForPreferences(page);
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:[...document.images].map(i=>({src:i.currentSrc,ok:i.complete&&i.naturalWidth>0}))}));
  assert.ok(layout.width<=width+2,JSON.stringify(layout));assert.ok(layout.height>2200);assert.ok(layout.images.every(i=>i.ok));
  await page.screenshot({path:`${evidence}/home-${width}.png`,fullPage:true});
  await page.locator('button[aria-haspopup="menu"]').click();
  await page.locator('[role="menu"] a[href="/credits"]').click();await page.waitForURL('**/credits');await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button',{name:'결제 준비 중',exact:true}).first().waitFor({timeout:20000});
  assert.ok((await page.locator('main').innerText()).includes('1,900'));assert.equal(await page.locator('main button:disabled').count(),3);
  await page.screenshot({path:`${evidence}/credits-${width}.png`,fullPage:true});
  await page.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});
  await waitForPreferences(page);
  await page.getByRole('status').filter({hasText:'공개 준비 버전'}).waitFor({timeout:20000});
  assert.equal(await page.locator('main button:disabled').count(),1);assert.equal(await page.locator('main [class*="planCard"]').count(),1);
  await page.screenshot({path:`${evidence}/membership-${width}.png`,fullPage:true});
  if(width===1440){await page.goto(origin,{waitUntil:'domcontentloaded'});await waitForPreferences(page);await page.evaluate(()=>localStorage.setItem('buysor-theme','dark'));await page.reload({waitUntil:'domcontentloaded'});await waitForPreferences(page,'ko','dark');await page.screenshot({path:`${evidence}/home-dark.png`,fullPage:true});}
  assert.deepEqual(errors,[]);results.push({width,layout,status:'passed'});await context.close();
 }
 const response=await fetch(origin+'/api/commerce/status');assert.equal(response.status,200);const status=await response.json();
 assert.equal(status.checkoutReady,false);assert.equal(status.subscriptionReady,false);assert.equal(status.aiReady,false);assert.equal(status.authenticated,false);assert.deepEqual(Object.values(status.rewards),[0,0,0]);
 const denied=await fetch(origin+'/api/decision',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);
 const preview=await fetch(origin+'/api/subscription',{method:'POST'});assert.equal(preview.status,405);
 await writeFile(`${evidence}/results.json`,JSON.stringify({results,status,unauthenticatedDecision:denied.status,disabledTierSwitch:preview.status},null,2));
 console.log('Browser checks passed at 1440, 768 and 390 pixels; live billing/AI disabled and ready-state hydrated.');
 // Regression: persisted English, public surfaces, survey steps and help.
 // Fixtures prevent account changes, orders and credit charges.
 const localeResults=[];
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const originalProfile={stateText:'기존에 작성한 내 정보',structuredState:null,survey:{activity:['학생'],mobility:25,category:['노트북','스마트폰','자동차','전동공구']},categoryProfiles:{},completion:25};
  await context.addInitScript(profile=>{
   if(!localStorage.getItem('buysor-language'))localStorage.setItem('buysor-language','en');
   if(!localStorage.getItem('buysor-user-model'))localStorage.setItem('buysor-user-model',JSON.stringify(profile));
   sessionStorage.setItem('buysor-draft',JSON.stringify({type:'name',value:'Laptop',categoryId:'laptop',subcategoryId:null}));
  },originalProfile);
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   let body={};let status=200;
   if(path==='/api/auth/me')body={authenticated:false};
   else if(path==='/api/commerce/status')body={authenticated:false,checkoutReady:false,subscriptionReady:false,aiReady:false,balance:null};
   else if(path==='/api/ai/status')body={configured:false,provider:null,model:null};
   else if(path==='/api/billing/history')body={items:['pending','paid','refund_pending','refunded','review'].map((state,index)=>({id:`fixture-${index}`,product_id:'pack20',amount:1900,credits:20,status:state,created_at:0}))};
   else if(path==='/api/attendance'){status=401;body={error:'로그인이 필요합니다.'};}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  const page=await context.newPage();const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  async function checkEnglish(label){
   await page.waitForFunction(()=>document.documentElement.lang==='en');
   assert.doesNotMatch((await page.locator('body').innerText()).replaceAll(originalProfile.stateText,''),/[가-힣ㄱ-ㅎㅏ-ㅣ]/,label);
   assert.doesNotMatch(await page.title(),/[가-힣]/,label+' title');
   const layout=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(layout.content<=layout.viewport+2,label+' overflow '+JSON.stringify(layout));
   localeResults.push({width,label,status:'passed'});
  }
  for(const path of ['/','/credits','/pricing','/guide','/usage-policy','/support','/profile?tab=state','/lens','/category','/advisor','/decision','/attendance','/billing/fail','/billing/success','/reports/weekly','/reports/monthly']){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.documentElement.lang==='en');
   if(path==='/credits')await page.getByText('Payment pending',{exact:false}).waitFor();
   if(path==='/profile?tab=state')assert.equal(await page.locator('textarea').inputValue(),originalProfile.stateText);
   await checkEnglish(path);
  }
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
}finally{await browser.close();}
