import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4173';
const evidence=process.env.EVIDENCE_DIR||'browser-evidence';
await mkdir(evidence,{recursive:true});
for(let i=0;i<90;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===89)throw Error('Server not ready');await new Promise(r=>setTimeout(r,1000));}
const browser=await chromium.launch();const results=[];
try{
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#decision-example').waitFor();
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:[...document.images].map(i=>({src:i.currentSrc,ok:i.complete&&i.naturalWidth>0}))}));
  assert.ok(layout.width<=width+2,JSON.stringify(layout));assert.ok(layout.height>2200);assert.ok(layout.images.every(i=>i.ok));
  await page.screenshot({path:`${evidence}/home-${width}.png`,fullPage:true});
  const menu=page.locator('button[aria-haspopup="menu"]');await menu.click();
  await page.locator('[role="menu"] a[href="/credits"]').click();await page.waitForURL('**/credits');await page.waitForLoadState('networkidle');
  assert.ok((await page.locator('main').innerText()).includes('1,900'));assert.equal(await page.locator('main button:disabled').count(),3);
  await page.screenshot({path:`${evidence}/credits-${width}.png`,fullPage:true});
  await page.goto(origin+'/pricing',{waitUntil:'networkidle'});assert.equal(await page.locator('main button:disabled').count(),1);assert.equal(await page.locator('main [class*="planCard"]').count(),1);
  await page.screenshot({path:`${evidence}/membership-${width}.png`,fullPage:true});
  if(width===1440){await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.setItem('buysor-theme','dark'));await page.reload({waitUntil:'networkidle'});await page.screenshot({path:`${evidence}/home-dark.png`,fullPage:true});}
  assert.deepEqual(errors,[]);results.push({width,layout,status:'passed'});await context.close();
 }
 const response=await fetch(origin+'/api/commerce/status');assert.equal(response.status,200);const status=await response.json();
 assert.equal(status.checkoutReady,false);assert.equal(status.subscriptionReady,false);assert.equal(status.aiReady,false);assert.equal(status.authenticated,false);assert.deepEqual(Object.values(status.rewards),[0,0,0]);
 const denied=await fetch(origin+'/api/decision',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);
 const preview=await fetch(origin+'/api/subscription',{method:'POST'});assert.equal(preview.status,405);
 await writeFile(`${evidence}/results.json`,JSON.stringify({results,status,unauthenticatedDecision:denied.status,disabledTierSwitch:preview.status},null,2));
 console.log('Browser checks passed at 1440, 768 and 390 pixels; live billing/AI disabled.');
}finally{await browser.close();}
