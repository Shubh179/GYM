const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const bundled={id:'local',slug:'press',name:'Bundled press',source:'custom',category:'custom',level:'custom',equipment:null,force:null,mechanic:null,primaryMuscles:[],secondaryMuscles:[],instructions:[],imageUrls:[],youtubeVideoId:'dQw4w9WgXcQ'};
const row={id:'remote',slug:'press',name:'Database press',youtube_video_id:'dQw4w9WgXcQ',primary_muscles:['lats'],target_areas:['lats']};
function fixture(overrides={}){
 const env={NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:'https://project.example',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'secret-test',CUSTOM_EXERCISE_ADMIN_EMAIL:'owner@example.com',...overrides};
 const state={rows:[row],user:null,readError:false,insertError:null,clients:[],inserts:[],updates:[],writes:0,pages:0};
 function createClient(url,key){state.clients.push(key);return {auth:{getUser:async()=>({data:{user:state.user},error:state.user?null:{message:'Invalid token'}})},from(){let inserted=null,updated=null,filterSlug=null,offset=0,end=499;const builder={select(){return this},order(){return this},range(a,b){offset=a;end=b;return this},abortSignal(){return this},single(){return this},maybeSingle(){return this},eq(column,value){filterSlug=value;return this},update(value){updated=value;state.updates.push(value);return this},insert(value){inserted=value;state.inserts.push(value);return this},then(resolve,reject){const result=updated?{data:state.readError?null:(state.rows.find(item=>item.slug===filterSlug)?{...state.rows.find(item=>item.slug===filterSlug),...updated}:null),error:state.readError?{code:'UNAVAILABLE'}:null}:inserted?{data:state.insertError?null:{id:'created-id',...inserted},error:state.insertError}: {data:state.readError?null:state.rows.slice(offset,end+1),error:state.readError?{code:'UNAVAILABLE'}:null};if(!inserted)state.pages++;return Promise.resolve(result).then(resolve,reject)}};return builder}};}
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
 return {env,state,storage:load('src/lib/custom-exercises.ts'),access:load('src/lib/supabase-server.ts'),route:()=>load('src/app/api/exercises/route.ts'),editRoute:()=>load('src/app/api/exercise/[slug]/route.ts')};
}
const request=(authorization)=>({headers:new Headers(authorization?{authorization}:{}),json:async()=>({name:'New press',youtubeUrl:'https://youtu.be/dQw4w9WgXcQ',targetAreas:['lats']})});
(async()=>{
 let f=fixture();let exercises=await f.storage.readCustomExercises();assert.equal(exercises.length,1);assert.equal(exercises[0].name,'Database press');assert.deepEqual(exercises[0].primaryMuscles,['lats']);assert.deepEqual(exercises[0].targetAreas,['lats']);assert.ok(exercises[0].imageUrls[0].includes('/vi/dQw4w9WgXcQ/'));assert.ok(f.state.clients.every(key=>key==='public-test'));console.log('PASS remote normalization, bundled deduplication, covers, and public-key reads');
 f=fixture();f.state.rows=Array.from({length:502},(_,i)=>({...row,id:String(i),slug:'exercise-'+i}));exercises=await f.storage.readCustomExercises();assert.equal(f.state.pages,2);assert.equal(exercises.length,503);console.log('PASS paginated database reads preserve all records');
 f=fixture();f.state.readError=true;exercises=await f.storage.readCustomExercises();assert.equal(exercises[0].name,'Bundled press');await assert.rejects(f.storage.readCustomExercises({requireRemote:true}));console.log('PASS database outage leaves bundled browsing available and metadata refresh fails without clearing labels');
 f=fixture();let response=await f.route().POST(request());assert.equal(response.status,401);assert.equal(f.state.inserts.length,0);console.log('PASS anonymous write rejected before database insert');
 for (const targetAreas of [undefined, [], ['back'], ['lats','lats'], 'lats', [null]]) {
  const invalid=fixture();invalid.state.user={email:'owner@example.com',email_confirmed_at:'2026-01-01'};
  const req=request('Bearer owner');const body=await req.json();req.json=async()=>({...body,targetAreas});
  const result=await invalid.route().POST(req);assert.equal(result.status,400);assert.equal(invalid.state.inserts.length,0);
 }
 console.log('PASS invalid or missing target areas rejected before insert');
 f=fixture();response=await f.route().POST(request('Bearer invalid'));assert.equal(response.status,401);assert.equal(f.state.inserts.length,0);
 f=fixture();f.state.user={email:'visitor@example.com',email_confirmed_at:'2026-01-01'};response=await f.route().POST(request('Bearer visitor'));assert.equal(response.status,403);assert.equal(f.state.inserts.length,0);
 f=fixture();f.state.user={email:'owner@example.com',email_confirmed_at:null};response=await f.route().POST(request('Bearer unconfirmed'));assert.equal(response.status,403);console.log('PASS invalid, non-admin, and unconfirmed accounts cannot publish');
 f=fixture();f.state.user={email:'OWNER@example.com',email_confirmed_at:'2026-01-01'};response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,201);assert.equal((await response.json()).exercise.id,'created-id');assert.equal(f.state.inserts.length,1);assert.deepEqual(f.state.inserts[0].primary_muscles,['lats']);assert.deepEqual(f.state.inserts[0].target_areas,['lats']);assert.equal(f.state.writes,0);assert.ok(f.state.clients.includes('secret-test'));console.log('PASS verified admin publishes to Supabase without filesystem writes');
 f=fixture();f.state.user={email:'owner@example.com',email_confirmed_at:'2026-01-01'};f.state.insertError={code:'23505'};response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,409);console.log('PASS database duplicate returns HTTP 409');
 // Editing uses the same verified-admin guard as creation.
 for (const user of [null,{email:'visitor@example.com',email_confirmed_at:'yes'},{email:'owner@example.com',email_confirmed_at:null}]) {
  f=fixture();f.state.user=user;response=await f.editRoute().PATCH(request(user?'Bearer owner':undefined),{params:{slug:'press'}});
  assert.equal(response.status,user?403:401);assert.equal(f.state.updates.length,0);
 }
 f=fixture();f.state.user={email:'owner@example.com',email_confirmed_at:'yes'};
 response=await f.editRoute().PATCH(request('Bearer owner'),{params:{slug:'press'}});
 assert.equal(response.status,200);const edited=(await response.json()).exercise;
 assert.equal(edited.slug,'press');assert.equal(edited.id,'remote');assert.equal(edited.name,'New press');
 assert.deepEqual(edited.targetAreas,['lats']);assert.equal(f.state.updates.length,1);assert.equal(f.state.writes,0);
 assert.ok(!('slug' in f.state.updates[0]));assert.ok(!('id' in f.state.updates[0]));
 console.log('PASS admin edit preserves slug/ID and persists targets; unauthorized edits are rejected');
 response=await f.editRoute().PATCH(request('Bearer owner'),{params:{slug:'built-in-only'}});assert.equal(response.status,404);
 const bad=request('Bearer owner');bad.json=async()=>({name:'Valid name',youtubeUrl:'https://youtu.be/dQw4w9WgXcQ',targetAreas:[]});
 const before=f.state.updates.length;response=await f.editRoute().PATCH(bad,{params:{slug:'press'}});assert.equal(response.status,400);assert.equal(f.state.updates.length,before);
 const broken=request('Bearer owner');broken.json=async()=>{throw new Error('bad JSON')};
 response=await f.editRoute().PATCH(broken,{params:{slug:'press'}});assert.equal(response.status,400);
 f.state.readError=true;response=await f.editRoute().PATCH(request('Bearer owner'),{params:{slug:'press'}});assert.equal(response.status,503);
 console.log('PASS missing/built-in edits, invalid input, malformed JSON and storage failures handled');
 f=fixture({CUSTOM_EXERCISE_ADMIN_EMAIL:''});response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,503);assert.equal(f.state.inserts.length,0);
 f=fixture({SUPABASE_SECRET_KEY:''});response=await f.route().POST(request('Bearer owner'));assert.equal(response.status,503);assert.equal(f.state.writes,0);
 f=fixture({NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SECRET_KEY:''});response=await f.route().POST(request());assert.equal(response.status,503);await assert.rejects(f.storage.saveCustomExercise(bundled));assert.equal(f.state.writes,0);console.log('PASS missing configuration fails closed and production never falls back to JSON writes');
 f=fixture({NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:''});await f.storage.saveCustomExercise(bundled);assert.equal(f.state.writes,1);console.log('PASS local development without Supabase retains JSON storage');
})().catch(error=>{console.error(error);process.exitCode=1});
