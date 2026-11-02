const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const bundled={id:'local',slug:'press',name:'Bundled press',source:'custom',category:'custom',level:'custom',equipment:null,force:null,mechanic:null,primaryMuscles:[],secondaryMuscles:[],instructions:[],imageUrls:[],youtubeVideoId:'dQw4w9WgXcQ'};
const row={id:'remote',slug:'press',name:'Database press',youtube_video_id:'dQw4w9WgXcQ'};
function fixture(overrides={}){
 const env={NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:'https://project.example',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'secret-test',CUSTOM_EXERCISE_ADMIN_EMAIL:'owner@example.com',...overrides};
 const state={rows:[row],user:null,readError:false,insertError:null,clients:[],inserts:[],writes:0,pages:0};
 function createClient(url,key){state.clients.push(key);return {auth:{getUser:async()=>({data:{user:state.user},error:state.user?null:{message:'Invalid token'}})},from(){let inserted=null,offset=0,end=499;const builder={select(){return this},order(){return this},range(a,b){offset=a;end=b;return this},abortSignal(){return this},single(){return this},insert(value){inserted=value;state.inserts.push(value);return this},then(resolve,reject){const result=inserted?{data:state.insertError?null:{id:'created-id',...inserted},error:state.insertError}: {data:state.readError?null:state.rows.slice(offset,end+1),error:state.readError?{code:'UNAVAILABLE'}:null};if(!inserted)state.pages++;return Promise.resolve(result).then(resolve,reject)}};return builder}};}
 const cache=new Map();
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const localRequire=name=>{
   if(name==='server-only')return {};
   if(name==='@supabase/supabase-js')return {createClient};
   if(name==='node:fs/promises')return {readdir:async()=>['press.json'],readFile:async()=>JSON.stringify(bundled),mkdir:async()=>{},writeFile:async()=>{state.writes++}};
   if(name==='@/lib/exercises')return {getBySlug:async()=>null,slugify:name=>name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),searchExercises:async()=>[],byMuscle:async()=>[],listMuscles:async()=>[],popularExercises:async()=>[]};
   if(name.startsWith('@/'))return load(path.join('src',name.slice(2))+'.ts');
   if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
   return require(name);
  };
  new Function('require','module','exports','process','console',source)(localRequire,module,module.exports,{env,cwd:()=>process.cwd()},{warn(){},error(){},log(){}});return module.exports;
 }
 return {env,state,storage:load('src/lib/custom-exercises.ts'),access:load('src/lib/supabase-server.ts'),route:()=>load('src/app/api/exercises/route.ts')};
}
const request=(authorization)=>({headers:new Headers(authorization?{authorization}:{}),json:async()=>({name:'New press',youtubeUrl:'https://youtu.be/dQw4w9WgXcQ'})});
(async()=>{
 let f=fixture();let exercises=await f.storage.readCustomExercises();assert.equal(exercises.length,1);assert.equal(exercises[0].name,'Database press');assert.ok(exercises[0].imageUrls[0].includes('/vi/dQw4w9WgXcQ/'));assert.ok(f.state.clients.every(key=>key==='public-test'));console.log('PASS remote normalization, bundled deduplication, covers, and public-key reads');
 f=fixture();f.state.rows=Array.from({length:502},(_,i)=>({...row,id:String(i),slug:'exercise-'+i}));exercises=await f.storage.readCustomExercises();assert.equal(f.state.pages,2);assert.equal(exercises.length,503);console.log('PASS paginated database reads preserve all records');
 f=fixture();f.state.readError=true;exercises=await f.storage.readCustomExercises();assert.equal(exercises[0].name,'Bundled press');console.log('PASS database outage leaves bundled browsing available');
 f=fixture();let response=await f.route().POST(request());assert.equal(response.status,401);assert.equal(f.state.inserts.length,0);console.log('PASS anonymous write rejected before database insert');
 f=fixture();response=await f.route().POST(request('Bearer invalid'));assert.equal(response.status,401);assert.equal(f.state.inserts.length,0);
 f=fixture();f.state.user={email:'visitor@example.com',email_confirmed_at:'2026-01-01'};response=await f.route().POST(request('Bearer visitor'));assert.equal(response.status,403);assert.equal(f.state.inserts.length,0);
 f=fixture();f.state.user={email:'owner@example.com',email_confirmed_at:null};response=await f.route().POST(request('Bearer unconfirmed'));assert.equal(response.status,403);console.log('PASS invalid, non-admin, and unconfirmed accounts cannot publish');
 f=fixture();f.state.user={email:'OWNER@example.com',email_confirmed_at:'2026-01-01'};response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,201);assert.equal((await response.json()).exercise.id,'created-id');assert.equal(f.state.inserts.length,1);assert.equal(f.state.writes,0);assert.ok(f.state.clients.includes('secret-test'));console.log('PASS verified admin publishes to Supabase without filesystem writes');
 f=fixture();f.state.user={email:'owner@example.com',email_confirmed_at:'2026-01-01'};f.state.insertError={code:'23505'};response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,409);console.log('PASS database duplicate returns HTTP 409');
 f=fixture({CUSTOM_EXERCISE_ADMIN_EMAIL:''});response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,503);assert.equal(f.state.inserts.length,0);
 f=fixture({SUPABASE_SECRET_KEY:''});response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,503);assert.equal(f.state.writes,0);
 f=fixture({NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SECRET_KEY:''});response=await f.route().POST(request());assert.equal(response.status,503);await assert.rejects(f.storage.saveCustomExercise(bundled));assert.equal(f.state.writes,0);console.log('PASS missing configuration fails closed and production never falls back to JSON writes');
 f=fixture({NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:''});await f.storage.saveCustomExercise(bundled);assert.equal(f.state.writes,1);console.log('PASS local development without Supabase retains JSON storage');
})().catch(error=>{console.error(error);process.exitCode=1});
