// Isolated two-user browser fixture. No live Supabase requests or production writes.
const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const users = new Map(), profiles = new Map(), training = new Map(), shares = [], photos = new Map();
const alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222';
function user(id, email, metadata = {}) { return { id, email, aud: 'authenticated', role: 'authenticated', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: metadata }; }
users.set('alice@example.test', user(alice, 'alice@example.test', { full_name: 'Alice' }));
users.set('bob@example.test', user(bob, 'bob@example.test', { full_name: 'Bob' }));
profiles.set(alice, { id: alice, username: 'alice_fit', avatar_path: null }); profiles.set(bob, { id: bob, username: null, avatar_path: null });
const token = id => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
const session = u => ({ access_token: token(u.id), token_type: 'bearer', expires_in: 3600, refresh_token: 'fixture-'+u.id, user: u });
const exercise = { slug: 'bench-press', name: 'Bench press', level: 'beginner', category: 'strength', equipment: 'barbell', primaryMuscles: ['chest'], targetAreas: ['middle-chest'], thumbUrl: null };
const library = { favourites: [], workouts: [{ id: 'chest', name: 'Chest day', exercises: [exercise] }, { id: 'legs', name: 'Leg day', exercises: [{ ...exercise, slug: 'squat', name: 'Squat' }] }], progress: {}, completions: {}, sessionLog: {}, workoutHistory: {}, notes: { 'bench-press': 'PRIVATE-NOTE' }, weeklySchedule: 'PRIVATE-SCHEDULE' };
let backend, next, browser, logs = '';
const report = { checks: [], errors: [], mocked: true };
const addCheck = text => { report.checks.push(text); console.log('PASS '+text); };
(async () => {
 backend = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if(req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://fixture'), pathname = url.pathname;
  let id; try { id = JSON.parse(Buffer.from((req.headers.authorization || '').replace('Bearer ', '').split('.')[1], 'base64url').toString()).sub; } catch {}
  const current = [...users.values()].find(u => u.id === id);

  const chunks = []; for await (const chunk of req) chunks.push(chunk); const raw = Buffer.concat(chunks);
  let body = {}; try { body = JSON.parse(raw.toString()); } catch {}
  const reply = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  const failure = message => reply({ message, code: 'P0001' }, 400);
  if(pathname === '/auth/v1/token') { const u = users.get(body.email); return u && body.password === 'fixture-password' ? reply(session(u)) : failure('Invalid login'); }
  if(pathname === '/auth/v1/signup') {
   const handle = body.data?.username;
   if([...profiles.values()].some(p => p.username === handle)) return failure('That username is already taken');
   const u = user('33333333-3333-4333-8333-333333333333', body.email, body.data); users.set(body.email, u); profiles.set(u.id, { id: u.id, username: handle, avatar_path: null }); return reply(session(u));
  }
  if(pathname === '/auth/v1/user') return current ? reply(current) : reply({ message: 'Invalid token' }, 401);
  if(pathname === '/auth/v1/logout') { res.writeHead(204); res.end(); return; }
  if(pathname === '/rest/v1/rpc/username_available') return reply(![...profiles.values()].some(p => p.username === body.p_username));
  if(req.method === 'GET' && pathname.startsWith('/storage/v1/object/sign/profile-photos/') && url.searchParams.get('token') === 'fixture') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(photos.get(pathname.split('/profile-photos/')[1])); return; }
  if(!current) return reply({ message: 'Sign in first' }, 401);
  if(pathname === '/rest/v1/profiles') return reply(profiles.get(id));
  if(pathname === '/rest/v1/rpc/claim_username') {
   if([...profiles.values()].some(p => p.username === body.p_username)) return failure('That username is already taken');
   if(profiles.get(id).username) return failure('Your username has already been set');
   profiles.get(id).username = body.p_username; return reply(profiles.get(id));
  }
  if(pathname === '/rest/v1/rpc/set_profile_avatar') { profiles.get(id).avatar_path = body.p_path; return reply(profiles.get(id)); }
  if(pathname.startsWith('/storage/v1/object/sign/profile-photos/')) {
   if(req.method === 'POST') return reply({ signedURL: '/object/sign/profile-photos/'+pathname.split('/profile-photos/')[1]+'?token=fixture' });
   res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(photos.get(pathname.split('/profile-photos/')[1])); return;
  }
  if(pathname.startsWith('/storage/v1/object/profile-photos/')) { const path = pathname.split('/profile-photos/')[1]; assert.ok(path.startsWith(id+'/')); const begin = raw.indexOf(Buffer.from([255,216,255])), end = raw.lastIndexOf(Buffer.from([255,217])); assert(begin >= 0 && end > begin); photos.set(path, raw.subarray(begin, end+2)); return reply({ Key: 'profile-photos/'+path }); }
  if(pathname === '/storage/v1/object/profile-photos' && req.method === 'DELETE') return reply([]);
  if(pathname === '/rest/v1/personal_training') return reply(training.has(id) ? training.get(id) : null);
  if(pathname === '/rest/v1/rpc/save_personal_training') { const old = training.get(id); if((old?.revision ?? 0) !== body.p_revision) return reply(null); const revision = (old?.revision ?? 0)+1; training.set(id, { state: body.p_state, revision }); return reply(revision); }
  if(pathname === '/rest/v1/rpc/send_workout') {
   const sender = profiles.get(id), recipient = [...profiles.values()].find(p => p.username === body.p_recipient);
   if(!sender.username) return failure('Create your username first'); if(!recipient) return failure('No user has that username'); if(recipient.id === id) return failure('Choose another user');
   assert.equal(JSON.stringify(body.p_sessions).includes('PRIVATE'), false);
   const share = { id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(shares.length+1).padStart(12,'0')}`, sender_username: sender.username, recipient_id: recipient.id, sessions: body.p_sessions, created_at: new Date().toISOString() }; shares.unshift(share); return reply(share.id);
  }
  if(pathname === '/rest/v1/workout_shares') return reply(shares.filter(s => s.recipient_id === id));
  console.error('Unhandled fixture:', req.method, pathname); reply({ message: 'Unexpected fixture route' }, 400);
 });
 await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
 const base = 'http://localhost:3014';
 next = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--port','3014'], { windowsHide: true, env: { ...process.env, JITI_CACHE: 'false', NEXT_DIST_DIR: '.next-local', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${backend.address().port}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-key' }, stdio: ['ignore','pipe','pipe'] });
 const record = data => { const chunk = data.toString(); logs = (logs+chunk).slice(-6000); if(/Ready|Compiled|Error|error/.test(chunk)) process.stdout.write(chunk.slice(-1000)); };
 next.stdout.on('data', record); next.stderr.on('data', record);
 for(let i=0;i<120 && !logs.includes('Ready in');i++) { if(next.exitCode!==null) throw Error(logs); await new Promise(r => setTimeout(r,1000)); }
 assert(logs.includes('Ready in'), 'Fixture app not ready');
 browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 async function context(seed = false) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } }); c.setDefaultTimeout(45000);
  if(seed) await c.addInitScript(state => { if(!localStorage.getItem('fixture-seeded')) { localStorage.setItem('repvisual:library:v1',JSON.stringify(state)); localStorage.setItem('fixture-seeded','1'); } }, library);
  await c.route('**/api/exercises*', r => r.fulfill({ json: { results: [] } })); await c.route('**/api/exercise-access', r => r.fulfill({ json: { configured: true, signedIn: true, canCreate: false } }));
  return c;
 }
 async function login(c, email) { const p = await c.newPage(); p.on('pageerror', e => report.errors.push(e.message)); await p.goto(base,{waitUntil:'domcontentloaded',timeout:180000}); await p.getByLabel('Email',{exact:true}).fill(email); await p.getByLabel('Password',{exact:true}).fill('fixture-password'); await p.getByRole('button',{name:'Sign in',exact:true}).click(); return p; }
 const ac = await context(true), bc = await context();
 const ap = await login(ac,'alice@example.test'); await ap.getByRole('heading',{name:'Your sessions',exact:true}).waitFor();
 const bp = await login(bc,'bob@example.test'); await bp.getByRole('heading',{name:'Profile',exact:true}).waitFor();
 await bp.getByLabel('Choose your unique username').fill('ALICE_FIT'); await bp.getByRole('button',{name:'Save username',exact:true}).click(); await bp.getByRole('alert').filter({hasText:'already taken'}).waitFor();
 await bp.getByLabel('Choose your unique username').fill('Bob_Fit'); await bp.getByRole('button',{name:'Save username',exact:true}).click(); await bp.getByText('@bob_fit',{exact:true}).waitFor(); addCheck('Existing-user onboarding and case-insensitive duplicate rejection');
 await bp.getByRole('button',{name:'Upload photo',exact:true}).click();
 // A real image generated in the browser verifies decoding, cropping and JPEG upload.
 const image = await bp.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').fillRect(0,0,32,32);return c.toDataURL('image/png').split(',')[1]});
 await bp.locator('input[type=file]').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await bp.getByRole('status').filter({hasText:'Profile photo updated'}).waitFor(); await bp.getByRole('img',{name:'Your profile photo',exact:true}).waitFor();
 assert.equal(photos.size,1); assert(photos.values().next().value.length>0); addCheck('Real image decoding, crop, private upload and signed photo rendering');
 await ap.getByRole('button',{name:'Expand Chest day',exact:true}).click(); await ap.getByRole('button',{name:'Share session',exact:true}).first().click();
 let form = ap.locator('form').filter({has:ap.getByRole('button',{name:'Send workout',exact:true})});
 await form.getByLabel('Recipient username').fill('nobody'); await form.getByRole('button',{name:'Send workout',exact:true}).click(); await ap.getByRole('alert').filter({hasText:'No user'}).waitFor();
 await form.getByLabel('Recipient username').fill('BOB_FIT'); await form.getByRole('button',{name:'Send workout',exact:true}).click(); await ap.getByRole('status').filter({hasText:'Sent to @bob_fit'}).waitFor();
 await bp.getByRole('button',{name:'Refresh',exact:true}).click(); await bp.getByRole('button',{name:'Add to my sessions',exact:true}).click(); await bp.getByRole('button',{name:'Added to your sessions',exact:true}).waitFor(); assert.equal(await bp.getByRole('button',{name:'Added to your sessions',exact:true}).isDisabled(),true);
 await bp.getByRole('link',{name:'My Training',exact:true}).click(); await bp.getByRole('heading',{name:'Chest day',exact:true}).waitFor(); addCheck('Single-session delivery, unknown recipient, direct import and duplicate prevention');
 await ap.getByRole('button',{name:'Share all sessions',exact:true}).click(); form = ap.locator('form').filter({has:ap.getByRole('button',{name:'Send workout',exact:true})}).first();
 await form.getByLabel('Recipient username').fill('bob_fit'); await form.getByRole('button',{name:'Send workout',exact:true}).click(); await form.locator('..').getByRole('status').waitFor();
 await bp.getByRole('link',{name:'Profile',exact:true}).click(); await bp.getByRole('button',{name:'Add all to my sessions',exact:true}).click();
 await bp.getByRole('link',{name:'My Training',exact:true}).click(); await bp.getByRole('heading',{name:'Leg day',exact:true}).waitFor(); assert.equal(await bp.getByRole('heading',{name:'Chest day',exact:true}).count(),2);
 await bp.reload({waitUntil:'domcontentloaded'}); await bp.getByRole('heading',{name:'Leg day',exact:true}).waitFor(); addCheck('Entire-workout sharing, independent session IDs and reload persistence');
 await bp.getByRole('link',{name:'Profile',exact:true}).click();
 for(const width of [320,390,1280]) { await bp.setViewportSize({width,height:844}); await bp.getByRole('heading',{name:'Profile',exact:true}).waitFor(); assert.equal(await bp.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false); await fs.mkdir('../tmp/profile-sharing',{recursive:true}); await bp.screenshot({path:`../tmp/profile-sharing/profile-${width}.png`,fullPage:true}); }
 addCheck('Profile has no horizontal overflow at 320, 390 and 1280px');
 await bp.getByRole('button',{name:'Log out',exact:true}).click(); await bp.getByRole('heading',{name:'Sign in',exact:true}).waitFor();
 assert.equal((await bc.cookies()).some(c=>c.name==='repvisual-access-token'),false); addCheck('Logout clears access cookie and returns to sign-in');
 const sc = await context(), sp = await sc.newPage(); await sp.goto(base,{waitUntil:'domcontentloaded'}); await sp.getByRole('button',{name:'Sign up',exact:true}).click();
 await sp.getByPlaceholder('Choose a unique username').fill('ALICE_FIT'); await sp.getByLabel('Email',{exact:true}).fill('new@example.test'); await sp.getByLabel('Password',{exact:true}).fill('fixture-password'); await sp.getByLabel('Confirm password',{exact:true}).fill('fixture-password'); await sp.getByRole('button',{name:'Create account',exact:true}).click(); await sp.getByRole('alert').filter({hasText:'already taken'}).waitFor();
 await sp.getByPlaceholder('Choose a unique username').fill('new_fit'); await sp.getByRole('button',{name:'Create account',exact:true}).click(); await sp.getByRole('link',{name:'Profile',exact:true}).click(); await sp.getByText('@new_fit',{exact:true}).waitFor(); addCheck('Signup validates uniqueness and sends username with account creation');
 assert.equal(shares.length,2); assert.equal(report.errors.length,0,report.errors.join('\n'));
 await fs.mkdir('../tmp/profile-sharing',{recursive:true}); await bp.screenshot({path:'../tmp/profile-sharing/logout.png'}); await fs.writeFile('../tmp/profile-sharing/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e,logs);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(next&&next.exitCode===null)next.kill();if(backend){backend.closeAllConnections();backend.close();}});
