const {chromium}=require('playwright-core');const fs=require('node:fs/promises');const assert=require('node:assert/strict');
(async()=>{
 const directory='artifacts/exercise-grid';await fs.mkdir(directory,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const report={checks:[],runtimeErrors:[]};
 try{
 const data=await(await fetch('http://localhost:3000/api/exercises')).json();
 const examples=data.results.slice(0,6).map((item,index)=>({...item,name:index===1?'A very long exercise name that requires two lines and truncates consistently across all cards':index===2?'Squat':item.name}));
 const library={favourites:examples,workouts:[{id:'grid-test',name:'Uniform grid test',exercises:examples}],progress:{},completions:{},sessionLog:{},workoutHistory:{},notes:{[examples[0].slug]:'Long personal reminder to test note row alignment'}};
 const context=await browser.newContext({isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(library=>localStorage.setItem('repvisual:library:v1',JSON.stringify(library)),library);
 const page=await context.newPage();page.on('pageerror',error=>report.runtimeErrors.push(error.message));
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});
  for(const route of ['/search','/favourites','/library']){
   await page.goto('http://localhost:3000'+route,{waitUntil:'networkidle',timeout:60000});
   await page.locator('[data-exercise-card]').first().waitFor();
   const result=await page.evaluate(()=>{
    const rect=element=>{const r=element.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top}};
    const cards=[...document.querySelectorAll('[data-exercise-card]')].map(rect);
    const covers=[...document.querySelectorAll('[data-exercise-cover]')].map(rect);
    const titles=[...document.querySelectorAll('[data-exercise-title]')].map(rect);
    const workoutCards=[...document.querySelectorAll('[data-workout-exercise]')].map(rect);
    return {cards,covers,titles,workoutCards,documentWidth:document.documentElement.scrollWidth};
   });
   const heights=result.cards.map(card=>card.height);assert.ok(Math.max(...heights)-Math.min(...heights)<1,route+' card heights differ');
   assert.ok(result.covers.every(cover=>Math.abs(cover.width/cover.height-16/9)<0.02),route+' cover aspect ratio differs');
   assert.ok(result.titles.every(title=>Math.abs(title.height-40)<1),route+' title rows differ');
   assert.ok(result.documentWidth<=width+1,route+' horizontal overflow');
   if(result.workoutCards.length){const heights=result.workoutCards.map(card=>card.height);assert.ok(Math.max(...heights)-Math.min(...heights)<1,'Workout control rows differ');}
   await page.screenshot({path:`${directory}/${route.slice(1)}-${width}.png`,fullPage:true,animations:'disabled'});
   report.checks.push({route,width,count:result.cards.length,cardHeight:heights[0],pass:true});console.log('PASS uniform grid',route,width,'cards='+result.cards.length);
  }
 }
 assert.equal(report.runtimeErrors.length,0);await fs.writeFile(directory+'/report.json',JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
