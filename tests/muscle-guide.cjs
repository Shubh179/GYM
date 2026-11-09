const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs/promises');
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
(async()=>{
 await fs.mkdir('artifacts/muscle-guide',{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],checks=[];
 try{for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('repvisual:library:v1',JSON.stringify({workouts:['Chest','Back','Biceps','Triceps','Shoulders','Forearms','Abs','Legs'].map(name=>({id:name.toLowerCase(),name,exercises:[]}))})));
  await context.route('**/api/exercises?mode=custom',r=>r.fulfill({json:{results:[]}}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/library',{waitUntil:'networkidle',timeout:90000});await page.getByRole('button',{name:'Expand Chest',exact:true}).click();
  const guide=page.locator('[data-muscle-guide]');await guide.locator('[data-model-ready="true"]').waitFor({timeout:60000});
  assert.equal(await guide.locator('p,h3,select,[data-muscle-region]').count(),0);
  for(const label of ['Upper chest','Middle chest','Lower chest'])await guide.getByRole('button',{name:'Locate '+label,exact:true}).waitFor();
  assert.equal(await guide.locator('line[marker-end]').count(),3);
  await guide.getByRole('button',{name:'Locate Upper chest',exact:true}).click();assert.equal(await guide.getByRole('button',{name:'Locate Upper chest',exact:true}).getAttribute('aria-pressed'),'true');
  await guide.getByRole('button',{name:'Show all muscles',exact:true}).click();
  const model=guide.locator('[data-body-model]');await model.evaluate(el=>el.scrollIntoView({block:'center'}));await model.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await model.screenshot({path:`artifacts/muscle-guide/minimal-chest-${width}.png`});
  await page.getByRole('button',{name:'Collapse Chest',exact:true}).click();await guide.waitFor({state:'detached'});
  for(const [group,count] of [['Back',4],['Biceps',3],['Triceps',3],['Shoulders',3],['Forearms',2],['Abs',2],['Legs',7]]){
   await page.getByRole('button',{name:'Expand '+group,exact:true}).click();await guide.locator('[data-model-ready="true"]').waitFor();
   assert.equal(await guide.locator('[data-active-muscle-group]').getAttribute('data-active-muscle-group'),group.toLowerCase());
   assert.equal(await guide.locator('[data-muscle-label]').count(),count);
   for(const other of ['Chest','Back','Biceps','Triceps','Shoulders','Forearms','Abs','Legs']) assert.equal(await guide.getByRole('button',{name:other,exact:true}).count(),0);
   if(group!=='Legs'){await page.getByRole('button',{name:'Collapse '+group,exact:true}).click();await guide.waitFor({state:'detached'});}
  }
  await guide.getByRole('button',{name:'Back view',exact:true}).click();await guide.getByRole('button',{name:'Locate Hamstrings',exact:true}).waitFor();
  assert.equal(await guide.locator('[data-muscle-label]:visible').count(),4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const invalid=await guide.locator('[data-muscle-label]:visible').evaluateAll(labels=>labels.filter(label=>{const a=label.getBoundingClientRect(),b=label.parentElement.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1}).map(label=>label.textContent));assert.deepEqual(invalid,[]);
  await page.getByRole('button',{name:'Collapse Legs',exact:true}).click();await guide.waitFor({state:'detached'});assert.equal(await page.locator('canvas').count(),0);
  checks.push({width,modelAndNamedArrows:true,noExplanatoryText:true,sessionSpecificGroups:true,noGroupSwitcher:true,selection:true,noOverflow:true,labelsWithinModel:true});console.log('PASS session-specific model without body-part options',width);await context.close();
 }assert.deepEqual(errors,[]);await fs.writeFile('artifacts/muscle-guide/minimal-report.json',JSON.stringify({checks,errors},null,2));}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
