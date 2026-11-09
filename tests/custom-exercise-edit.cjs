const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const slug = 'lower-chest-cable';
const old = { slug, name: 'Lower Chest Cable', level: 'custom', category: 'custom', equipment: null, primaryMuscles: [], targetAreas: [], thumbUrl: null };
const incline = { slug: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', level: 'beginner', category: 'strength', equipment: 'dumbbell', primaryMuscles: ['chest'], targetAreas: ['upper-chest'], thumbUrl: null };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const report = [];
  try {
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      let saved = null, patches = 0, fail = true;
      await context.addInitScript(old => {
        if (!localStorage.getItem('repvisual:library:v1')) localStorage.setItem('repvisual:library:v1', JSON.stringify({
          favourites: [old], workouts: [{id:'push',name:'Push day',exercises:[old]}], progress: {push:[old.slug]}, notes: {[old.slug]:'Keep my cue'},
          workoutHistory: {'2026-11-01':[{id:'history',workoutId:'push',workoutName:'Push day',exercises:[old],completedAt:'2026-11-01T10:00:00Z'}]}, completions:{},sessionLog:{}
        }));
      }, old);
      await context.route('**/api/exercise-access', route => route.fulfill({ json: {configured:true,requiresAuth:true,signedIn:true,canCreate:true} }));
      await context.route('**/api/exercises?*', route => {
        const mode = new URL(route.request().url()).searchParams.get('mode');
        return route.fulfill({ json: {results: mode === 'custom' ? [saved || old] : [incline]} });
      });
      await context.route(`**/api/exercise/${slug}`, async route => {
        if (route.request().method() !== 'PATCH') return route.fulfill({ json: {status:'found',exercise:{...old,imageUrls:[]}} });
        patches++;
        const body = route.request().postDataJSON();
        assert.equal(body.name, 'Upper cable press');assert.deepEqual(body.targetAreas,['upper-chest']);
        assert.equal(body.youtubeUrl,'https://youtu.be/dQw4w9WgXcQ');
        if (fail) return route.fulfill({ status:503,json:{error:'Fixture storage failure'} });
        saved = {...old,name:body.name,targetAreas:body.targetAreas,primaryMuscles:['chest'],thumbUrl:'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'};
        return route.fulfill({json:{exercise:{...saved,id:'stable-id',source:'custom',youtubeVideoId:'dQw4w9WgXcQ',imageUrls:[saved.thumbUrl]}}});
      });
      await context.route('**/embed/**', route => route.fulfill({contentType:'text/html',body:'<p>Test video</p>'}));
      const page = await context.newPage();const errors=[];page.on('pageerror', error=>errors.push(error.message));
      await page.goto(`${base}/exercise/${slug}`, { waitUntil:'networkidle',timeout:90000 });
      await page.getByRole('button',{name:'Edit exercise',exact:true}).click();
      const name = page.getByLabel('Exercise name',{exact:true});await name.waitFor();
      assert.equal(await name.inputValue(),old.name);
      assert.match(await page.getByLabel('YouTube link',{exact:true}).inputValue(), /youtu/);
      await name.fill('Upper cable press');await page.getByLabel('YouTube link',{exact:true}).fill('https://youtu.be/dQw4w9WgXcQ');
      await page.getByRole('button',{name:'Save changes',exact:true}).click();
      await page.getByRole('alert').filter({hasText:'Select at least one specific muscle target.'}).waitFor();assert.equal(patches,0);
      await page.getByLabel('Upper chest',{exact:true}).check();await page.getByRole('button',{name:'Save changes',exact:true}).click();
      await page.getByRole('alert').filter({hasText:'Fixture storage failure'}).waitFor();
      assert.equal(await name.inputValue(),'Upper cable press');assert.equal(await page.getByLabel('Upper chest',{exact:true}).isChecked(),true);
      fail=false;await page.getByRole('button',{name:'Save changes',exact:true}).click();
      await page.getByRole('status').filter({hasText:'Saved Upper cable press.'}).waitFor();assert.equal(patches,2);
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('repvisual:library:v1')).workouts[0].exercises[0].targetAreas.includes('upper-chest'));
      const library = await page.evaluate(()=>JSON.parse(localStorage.getItem('repvisual:library:v1')));
      assert.equal(library.favourites[0].name,'Upper cable press');assert.deepEqual(library.workouts[0].exercises[0].targetAreas,['upper-chest']);
      assert.equal(library.notes[slug],'Keep my cue');assert.deepEqual(library.progress.push,[slug]);assert.equal(library.workoutHistory['2026-11-01'][0].exercises[0].name,old.name);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await fs.mkdir('artifacts/custom-edit',{recursive:true});await page.screenshot({path:`artifacts/custom-edit/editor-${width}.png`,fullPage:true});
      await page.goto(`${base}/library`,{waitUntil:'networkidle',timeout:90000});
      await page.getByRole('button',{name:'Expand Push day',exact:true}).click();
      await page.getByRole('button',{name:'Add exercise',exact:true}).click();
      const add = page.getByRole('button',{name:'Add',exact:true});await add.waitFor();
      let message='';page.once('dialog',async dialog=>{message=dialog.message();await dialog.dismiss();});await add.click();
      assert.match(message,/Upper chest/);assert.match(message,/Upper cable press/);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('repvisual:library:v1')).workouts[0].exercises.length),1);
      page.once('dialog',dialog=>dialog.accept());await add.click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('repvisual:library:v1')).workouts[0].exercises.length===2);
      assert.equal(errors.length,0,errors.join('\n'));
      report.push({width,prefilled:true,requiredTargets:true,failedEditPreservesDraft:true,savedMetadataUpdated:true,historyAndNotesPreserved:true,overlapCancelAndAccept:true,noOverflow:true});
      console.log('PASS custom editor, saved metadata and overlap cancel/accept',width);await context.close();
    }
    await fs.writeFile('artifacts/custom-edit/report.json', JSON.stringify({scope:'Access and all writes mocked; no live custom exercise records modified.',checks:report},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
