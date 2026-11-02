const {chromium}=require('playwright-core');const fs=require('node:fs/promises');const assert=require('node:assert/strict');
(async()=>{const directory='artifacts/collapsed-sessions';await fs.mkdir(directory,{recursive:true});const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const report={checks:[],errors:[]};try{
 const data=await(await fetch('http://localhost:3000/api/exercises')).json();const exercise=data.results[0];
 const context=await browser.newContext({isMobile:true,hasTouch:true,reducedMotion:'reduce'});await context.addInitScript(exercise=>{localStorage.setItem('repvisual:library:v1',JSON.stringify({workouts:[{id:'push',name:'Push day',exercises:[exercise]},{id:'legs',name:'Leg day',exercises:[exercise]}],favourites:[],progress:{},completions:{},sessionLog:{},workoutHistory:{},notes:{}}));},exercise);
 await context.route(/https:\/\/(open\.spotify\.com|www\.youtube-nocookie\.com)\//,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><body style="background:#181818;color:white">Player layout test</body>'}));
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});await page.goto('http://localhost:3000/library',{waitUntil:'domcontentloaded',timeout:180000});
  await page.getByRole('button',{name:'Expand all workout sessions',exact:true}).waitFor();
  assert.equal(await page.locator('[data-exercise-card]').count(),0);
  const editor=page.getByRole('textbox',{name:'Monday to Sunday schedule'});await editor.waitFor();
  const schedule='Monday: Chest and triceps\nTuesday: Back\nWednesday: Legs\nThursday: Rest\nFriday: Shoulders\nSaturday: Cardio\nSunday: Rest';
  await editor.fill(schedule);
  assert.equal(await page.evaluate(()=>localStorage.getItem('repvisual:weekly-schedule:v1')),schedule);
  const order=await page.evaluate(()=>{
    const activity=[...document.querySelectorAll('h2')].find(h=>h.textContent==='Training activity');
    const schedule=document.querySelector('#weekly-schedule-heading');
    const sessions=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Your sessions');
    return Boolean(activity.compareDocumentPosition(schedule)&Node.DOCUMENT_POSITION_FOLLOWING)&&Boolean(schedule.compareDocumentPosition(sessions)&Node.DOCUMENT_POSITION_FOLLOWING);
  });assert.equal(order,true);
  assert.equal(await page.getByRole('button' ,{name:'Expand Push day',exact:true}).getAttribute('aria-expanded'),'false');
  assert.equal(await page.getByText('A place for every rep.',{exact:false}).count(),0);
  const layout=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth}));assert.ok(layout.documentWidth<=width+1);
  await page.screenshot({path:`${directory}/default-${width}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Expand Push day',exact:true}).click();await page.locator('[data-exercise-card]').first().waitFor();assert.equal(await page.locator('[data-exercise-card]').count(),1);
  await page.getByRole('button',{name:'Collapse all workout sessions',exact:true}).click();await page.locator('[data-exercise-card]').first().waitFor({state:'detached'});
  await page.getByRole('button',{name:'Expand all workout sessions',exact:true}).click();assert.equal(await page.locator('[data-exercise-card]').count(),2);
  await page.getByRole('button',{name:'Collapse all workout sessions',exact:true}).click();await page.locator('[data-exercise-card]').first().waitFor({state:'detached'});
  await page.getByLabel('New workout session name').fill('New session test');await page.getByRole('button',{name:'New session',exact:true}).click();await page.getByRole('button',{name:'Expand New session test',exact:true}).waitFor();assert.equal(await page.locator('[data-exercise-card]').count(),0);
  await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.getByRole('button',{name:'Expand Push day',exact:true}).waitFor();assert.equal(await page.locator('[data-exercise-card]').count(),0);assert.equal(await editor.inputValue(),schedule);await editor.fill('');await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.getByRole('button',{name:'Expand Push day',exact:true}).waitFor();assert.equal(await editor.inputValue(),'');
  report.checks.push({width,defaultsCollapsed:true,individualToggle:true,expandCollapseAll:true,newSessionCollapsed:true,reloadCollapsed:true,noOverflow:true,weeklyScheduleOrder:true,schedulePersists:true,blankSchedulePersists:true});console.log('PASS collapsed defaults and toggles',width);
 }
 for(const route of ['/search','/favourites','/timer','/spotify']){await page.setViewportSize({width:320,height:568});await page.goto('http://localhost:3000'+route,{waitUntil:'domcontentloaded',timeout:180000});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);console.log('PASS compact mobile page',route);}
 assert.equal(report.errors.length,0);await fs.writeFile(directory+'/report.json',JSON.stringify(report,null,2));
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
