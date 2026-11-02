const {chromium}=require('playwright-core');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
 const root='artifacts/youtube';await fs.mkdir(root,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const report={checks:[],youtubeResponses:[],note:'Live third-party iframe requested; no playback or sign-in interaction performed.'};
 try{
 const context=await browser.newContext({isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('response',response=>{if(response.url().startsWith('https://www.youtube-nocookie.com/embed'))report.youtubeResponses.push({url:response.url(),status:response.status()});});
 const all=await(await fetch('http://localhost:3000/api/exercises')).json();const custom=all.results.find(item=>item.category==='custom');
 const slug=custom?.slug||'bench-dips';
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:800}]){
  await page.setViewportSize(viewport);
  await page.goto('http://localhost:3000/exercise/'+slug,{waitUntil:'domcontentloaded',timeout:60000});
  const region=page.getByRole('region',{name:'Exercise video demonstration'});const iframe=region.locator('iframe');
  await iframe.waitFor({state:'visible'});
  await region.scrollIntoViewIfNeeded();
  const result=await region.evaluate(element=>{
   const iframe=element.querySelector('iframe'),r=iframe.getBoundingClientRect(),style=getComputedStyle(iframe);
   return {width:r.width,height:r.height,filter:style.filter,opacity:style.opacity,hidden:getComputedStyle(element).display==='none',classes:element.className,source:iframe.src,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.ok(Math.abs(result.width/result.height-16/9)<0.02);assert.equal(result.opacity,'1');assert.equal(result.filter,'none');assert.ok(!result.classes.includes('accent'));assert.ok(!result.hidden);assert.ok(result.documentWidth<=viewport.width+1);
  await region.screenshot({path:`${root}/video-${viewport.width}.png`,animations:'disabled'});
  report.checks.push({viewport,...result});console.log('PASS always-visible neutral YouTube embed',viewport.width);
 }
 if(custom){
  await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3000/search',{waitUntil:'domcontentloaded'});
  const card=page.locator(`main a[href="/exercise/${custom.slug}"]`).first();await card.waitFor({state:'visible'});
  const cover=card.locator('img');await cover.waitFor();
  const style=await cover.evaluate(element=>({filter:getComputedStyle(element).filter,opacity:getComputedStyle(element).opacity,ratio:element.parentElement.getBoundingClientRect().width/element.parentElement.getBoundingClientRect().height,overlays:element.parentElement.querySelectorAll('.absolute.inset-0').length}));
  assert.equal(style.filter,'none');assert.equal(style.opacity,'1');assert.equal(style.overlays,0);assert.ok(Math.abs(style.ratio-16/9)<0.02);
  await card.screenshot({path:`${root}/custom-cover-390.png`,animations:'disabled'});report.checks.push({name:'Original YouTube thumbnail presentation',...style});console.log('PASS untinted 16:9 YouTube thumbnail');
 }
 await fs.writeFile(`${root}/report.json`,JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
