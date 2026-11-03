const { chromium } = require('playwright-core');
const fs = require('node:fs/promises');
const path = require('node:path');
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const output = path.resolve('artifacts/mobile');
const sizes = [{width:320,height:568},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:568,height:320},{width:844,height:390},{width:1024,height:768},{width:1440,height:900}];
const report = { startedAt: new Date().toISOString(), browser:'Chrome (headless)', results:[], errors:[], interactions:[] };
let browser;
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
async function inspect(page, label) {
  // Mobile viewport emulation applies media queries and ResizeObserver callbacks
  // on rendering frames after setViewportSize resolves. Measure settled layout.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const withinScroller = element => {
      for (let p = element.parentElement; p && p !== document.body; p = p.parentElement) {
        if (['auto','scroll'].includes(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const overflowing = [...document.querySelectorAll('main *, header *, aside *')].filter(element => {
      const r=element.getBoundingClientRect(), style=getComputedStyle(element);
      return r.width>0 && r.height>0 && style.visibility!=='hidden' && (r.right>width+1||r.left< -1) && !withinScroller(element);
    }).slice(0,15).map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,90),class:element.className,rect:{x:element.getBoundingClientRect().x,width:element.getBoundingClientRect().width}}));
    const nav=[...document.querySelectorAll('nav[aria-label="Main navigation"] a')].map(a=>{const r=a.getBoundingClientRect();return {label:a.textContent.trim(),width:r.width,height:r.height,visible:r.left>=0&&r.right<=width+1};});
    const controls=[...document.querySelectorAll('main button, main input, main textarea, main a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;}).map(e=>{const r=e.getBoundingClientRect();return {text:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('placeholder')||'').trim().slice(0,80),width:Math.round(r.width),height:Math.round(r.height),font:getComputedStyle(e).fontSize};});
    const overlays=[...document.querySelectorAll('aside[aria-label], [role="dialog"]')].map(element=>{
      const r=element.getBoundingClientRect(); return {label:element.getAttribute('aria-label'),top:r.top,bottom:r.bottom,width:r.width,height:r.height,inside:r.top>=0&&r.bottom<=innerHeight+1};
    });
    const music=overlays.find(item=>item.label==='EchoPlay player');
    const timer=overlays.find(item=>item.label==='Active workout timer');
    const m=document.querySelector('aside[aria-label="EchoPlay player"]')?.getBoundingClientRect();
    const t=document.querySelector('aside[aria-label="Active workout timer"]')?.getBoundingClientRect();
    const overlayOverlap=m&&t?Math.max(0,Math.min(m.right,t.right)-Math.max(m.left,t.left))*Math.max(0,Math.min(m.bottom,t.bottom)-Math.max(m.top,t.top)):0;
    return {overlayOverlap,overlays,viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,overflowing,nav,controls};
  });
  result.label=label;
  result.requestedViewport=page.viewportSize();
  result.pass=result.documentWidth<=result.requestedViewport.width+1 && result.viewport.width<=result.requestedViewport.width+1&&result.overflowing.length===0&&result.nav.every(link=>link.visible&&link.height>=44)&&result.overlays.every(overlay=>overlay.inside)&&result.overlayOverlap===0;
  report.results.push(result);
  console.log(`${result.pass?'PASS':'FAIL'} ${label} ${result.viewport.width}x${result.viewport.height} document=${result.documentWidth} overflow=${result.overflowing.length}`);
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({path:path.join(output,`${label}-${result.viewport.width}x${result.viewport.height}.png`),fullPage:true,animations:'disabled',timeout:30000});
  if ([320,390].includes(result.requestedViewport.width)) await page.screenshot({path:path.join(output,`${label}-${result.requestedViewport.width}-viewport.png`),animations:'disabled'});
  await fs.writeFile(path.join(output,process.env.TEST_INTERACTIONS_ONLY ? 'interactions-report.json' : 'report.json'),JSON.stringify(report,null,2));
  return result;
}
(async()=>{
 await fs.mkdir(output,{recursive:true});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const data=await(await fetch(baseURL+'/api/exercises?q=bench')).json();
 const exercises=data.results.slice(0,3);
 if(!exercises.length)throw new Error('Exercise fixtures unavailable');
 const date=localDate();
 const library={favourites:exercises,workouts:[{id:'test-push',name:'Push day - chest, shoulders and triceps',exercises},{id:'test-long',name:'ExtraLongWorkoutSessionNameForTestingNarrowMobileScreensWithoutSpaces',exercises:[]}],progress:{},completions:{[date]:1},sessionLog:{},workoutHistory:{[date]:[{id:'test-history',workoutId:'test-push',workoutName:'Push day - chest, shoulders and triceps',exercises,completedAt:new Date().toISOString(),notes:'Controlled reps. Bench at 30 degrees.'}]},notes:{[exercises[0].slug]:'Bench angle: 30 degrees. Slow eccentric.'}};
 const context=await browser.newContext({viewport:sizes[0],isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(({library})=>{if(!localStorage.getItem('responsive-test-seeded')){localStorage.setItem('repvisual:library:v1',JSON.stringify(library));localStorage.setItem('responsive-test-seeded','1');}},{library});
 // External players/images are third-party surfaces: test our containers without depending on network/login.
 await context.route(/https:\/\/(echoplay\.vercel\.app|www\.youtube-nocookie\.com)\//,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#181818;color:white;font:16px system-ui">Third-party player test frame</body></html>'}));
 const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(error.message));
 for(const size of (process.env.TEST_INTERACTIONS_ONLY ? [] : sizes)){
  await page.setViewportSize(size);
  for(const route of ['/library','/search','/favourites','/timer','/music']){
   await page.goto(baseURL+route,{waitUntil:'networkidle',timeout:60000});
   if(route==='/library') { await page.getByRole('heading',{name:'Your sessions'}).waitFor(); await page.getByRole('button',{name:'Expand all workout sessions',exact:true}).click(); }
   if(route==='/favourites')await page.locator('main img').first().waitFor();
   await inspect(page,route.slice(1));
  }
 }
 await page.setViewportSize({width:320,height:568});
 await page.goto(baseURL+'/library',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Expand all workout sessions',exact:true}).click();

 await page.locator('button[aria-label$=": 1 completed sessions"]').last().click();
 await page.getByText('Workout Details',{exact:true}).waitFor();
 await inspect(page,'history-open');report.interactions.push('Selected day shows completed workout history');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:/View personal notes for/}).first().click();
 await page.getByRole('button',{name:'Edit Note',exact:true}).click();
 await page.locator('#my-quick-notes-textarea').fill('Mobile test note: controlled reps and stable posture.');
 await inspect(page,'notes-modal');
 await page.setViewportSize({width:568,height:320});
 await inspect(page,'notes-landscape');
 await page.setViewportSize({width:320,height:568});
 await page.getByRole('button',{name:'Save Note',exact:true}).click();
 await page.getByRole('button',{name:'Close notes',exact:true}).click();
 report.interactions.push('Notes modal opens, edits, saves and closes in isolated storage');
 await page.getByLabel('New workout session name').fill('Mobile test session');
 await page.getByRole('button',{name:'New session',exact:true}).click();
 await page.getByRole('heading',{name:'Mobile test session',exact:true}).waitFor();
 report.interactions.push('New session form creates a session at 320px');
 await page.getByRole('button',{name:'Add exercise',exact:true}).first().click();
 await page.getByPlaceholder('Search exercises by name, muscle, or equipment...').fill('squat');
 await page.getByRole('button',{name:'Add',exact:true}).first().waitFor({timeout:15000});
 await inspect(page,'exercise-picker');report.interactions.push('Inline exercise search opens and accepts typing');
 const addTarget=await page.getByRole('button',{name:'Add',exact:true}).first().boundingBox();
 if(!addTarget || addTarget.height<44)throw new Error('Inline Add touch target is under 44px');
 await page.getByRole('button',{name:'+ Create exercise',exact:true}).click();
 await page.getByText('Checking access...', {exact:true}).waitFor({state:'hidden'});
 if(await page.getByLabel('Exercise name',{exact:true}).count()) {
   await page.getByLabel('Exercise name',{exact:true}).fill('Test custom exercise');
   await page.getByLabel('YouTube link',{exact:true}).fill('https://youtu.be/dQw4w9WgXcQ');
   report.interactions.push('Custom exercise form accepts input without saving test records');
 } else {
   report.interactions.push('Custom exercise publishing is protected by the sign-in/configuration panel');
 }
 await inspect(page,'create-exercise-form');
 await page.goto(baseURL+'/timer',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Start',exact:true}).click();
 await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Resume',exact:true}).waitFor();report.interactions.push('Stopwatch start/pause/resume states work');
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.goto(baseURL+'/music',{waitUntil:'networkidle'});
 await page.getByRole('complementary',{name:'EchoPlay player'}).waitFor();
 await page.evaluate(() => window.musicFrame = document.getElementById('echoplay-frame'));
 await page.getByRole('button',{name:'Minimize',exact:true}).click();
 await page.getByRole('link',{name:'My Training',exact:true}).click();
 await page.getByRole('heading',{name:'Your sessions'}).waitFor();
 if (!await page.evaluate(() => window.musicFrame === document.getElementById('echoplay-frame'))) throw new Error('Music iframe remounted during navigation');
 await inspect(page,'floating-players');
 const overlaps=await page.evaluate(()=>{const music=document.querySelector('aside[aria-label="EchoPlay player"]')?.getBoundingClientRect(),timer=document.querySelector('aside[aria-label="Active workout timer"]')?.getBoundingClientRect();return music&&timer?Math.max(0,Math.min(music.right,timer.right)-Math.max(music.left,timer.left))*Math.max(0,Math.min(music.bottom,timer.bottom)-Math.max(music.top,timer.top)):0;});
 report.interactions.push({name:'Floating music and timer overlap area',pixels:overlaps});
 if(overlaps>0)report.errors.push(`Floating players overlap by ${overlaps}px squared`);
 await page.getByRole('button',{name:'Expand',exact:true}).click();
 await page.waitForFunction(() => {
   const music = document.querySelector('aside[aria-label="EchoPlay player"]')?.getBoundingClientRect();
   const timer = document.querySelector('aside[aria-label="Active workout timer"]')?.getBoundingClientRect();
   return music && timer && timer.bottom <= music.top;
 });
 await inspect(page,'spotify-expanded');
 await page.setViewportSize({width:844,height:390});
 await inspect(page,'spotify-landscape');
 await page.setViewportSize({width:568,height:320});
 await inspect(page,'spotify-short-landscape');
 await page.setViewportSize({width:320,height:568});
 await page.getByRole('button',{name:'Close EchoPlay player and stop playback'}).click();
 await page.goto(baseURL+'/exercise/'+exercises[0].slug,{waitUntil:'networkidle',timeout:60000});
 await inspect(page,'exercise-detail');
 await page.getByRole('button',{name:'Add to workout',exact:true}).click();await inspect(page,'workout-menu');report.interactions.push('Exercise detail and workout dropdown opened');
 report.finishedAt=new Date().toISOString();
 report.summary={screens:report.results.length,failures:report.results.filter(result=>!result.pass).length,runtimeErrors:report.errors};
 await fs.writeFile(path.join(output,process.env.TEST_INTERACTIONS_ONLY ? 'interactions-report.json' : 'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.summary));
 await browser.close();
 process.exitCode=report.summary.failures||report.errors.length?1:0;
})().catch(async error=>{report.fatal=error.stack;await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,process.env.TEST_INTERACTIONS_ONLY ? 'interactions-report.json' : 'report.json'),JSON.stringify(report,null,2));console.error(error);if(browser)await browser.close();process.exitCode=1;});
