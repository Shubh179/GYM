const {chromium}=require('playwright-core');const fs=require('node:fs/promises');const assert=require('node:assert/strict');
const id='00000000-0000-4000-8000-000000000001';
const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',email:'owner@example.com',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'synthetic-test-signature'].join('.');
(async()=>{const root='artifacts/supabase-auth';await fs.mkdir(root,{recursive:true});const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const report={checks:[],errors:[]};try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<640,hasTouch:true,reducedMotion:'reduce'});
  let saves=0;
  await context.route('**/auth/v1/**',async route=>{
   const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   const reply=options=>route.fulfill({...options,headers:cors});
   if(route.request().method()==='OPTIONS')return reply({status:204,body:''});
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('/token')){
    const body=route.request().postDataJSON();
    if(body.password!=='fixture-password')return reply({status:400,contentType:'application/json',body:JSON.stringify({error_code:'invalid_credentials',msg:'Invalid login credentials'})});
    return reply({status:200,contentType:'application/json',body:JSON.stringify({access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'fixture-refresh-token',user:{id,aud:'authenticated',role:'authenticated',email:'owner@example.com',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}}})});
   }
   if(url.pathname.endsWith('/logout'))return reply({status:204,body:''});
   return reply({status:400,contentType:'application/json',body:'{"message":"Unexpected mock auth request"}'});
  });
  await context.route('**/api/exercise-access',async route=>{const signedIn=route.request().headers().authorization==='Bearer '+token;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({requiresAuth:true,configured:true,signedIn,canCreate:signedIn,email:signedIn?'owner@example.com':undefined})});});
  await context.route('**/api/exercises',async route=>{if(route.request().method()!=='POST')return route.continue();assert.equal(route.request().headers().authorization,'Bearer '+token);const body=route.request().postDataJSON();assert.deepEqual(body.targetAreas,['upper-chest']);saves++;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({exercise:{id:'ui-test',slug:'ui-test',name:body.name,level:'custom',category:'custom',equipment:null,primaryMuscles:['chest'],targetAreas:body.targetAreas,imageUrls:['https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'],source:'custom'}})});});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://localhost:3000/search',{waitUntil:'domcontentloaded',timeout:90000});
  await page.getByRole('button',{name:'+ Create exercise',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('owner@example.com');await page.getByLabel('Password',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Sign-in failed'}).waitFor();assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'');
  await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Exercise name',{exact:true}).waitFor();
  await page.getByLabel('Exercise name',{exact:true}).fill('UI authentication test');await page.getByLabel('YouTube link',{exact:true}).fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button',{name:'Save exercise',exact:true}).click();await page.getByRole('alert').filter({hasText:'Select at least one specific muscle target.'}).waitFor();assert.equal(saves,0);
  await page.getByLabel('Upper chest',{exact:true}).check();
  await page.getByRole('button',{name:'Save exercise',exact:true}).click();await page.getByRole('status').filter({hasText:'Saved UI authentication test.'}).waitFor();assert.equal(saves,1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Close new exercise',exact:true}).locator('..').screenshot({path:`${root}/sign-in-${width}.png`,animations:'disabled'});
  report.checks.push({width,failedLoginHandled:true,passwordCleared:true,adminFormUnlocked:true,authenticatedSave:true,signOut:true,noOverflow:true});console.log('PASS admin sign-in, authenticated save, sign-out and mobile layout',width);await context.close();
 }
 assert.equal(report.errors.length,0);report.scope='Auth and write requests were intercepted; no real passwords, sign-ins, or test exercise records were sent to Supabase.';await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
