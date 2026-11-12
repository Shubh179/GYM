// Unit checks always run. Add --browser for isolated, mocked Supabase UI checks.
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const moduleFixture = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/training-merge.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('module', 'exports', source)(moduleFixture, moduleFixture.exports);
const { emptyTraining, mergeTraining, parseTraining, readDeviceTraining, LIBRARY_KEY, SCHEDULE_KEY, CLAIM_KEY } = moduleFixture.exports;
const clone = value => JSON.parse(JSON.stringify(value));
const exercise = { slug: 'fixture-press', name: 'Fixture press', level: 'beginner', primaryMuscles: ['chest'], category: 'strength', equipment: null, thumbUrl: null };
const legacy = { ...emptyTraining(), favourites: [exercise], workouts: [{ id: 'workout-a', name: 'Chest', exercises: [exercise] }], notes: { 'fixture-press': 'Existing browser note' }, progress: { 'workout-a': ['fixture-press'] }, completions: { '2026-11-10': 1 }, sessionLog: { '2026-11-10': ['workout-a'] }, workoutHistory: { '2026-11-10': [{ id: 'history-a', workoutId: 'workout-a', workoutName: 'Chest', completedAt: '2026-11-10T12:00:00Z', exercises: [exercise] }] } };
const memory = new Map([[LIBRARY_KEY, JSON.stringify(legacy)], [SCHEDULE_KEY, 'Monday: Chest']]);
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.equal(readDeviceTraining(storage).state.notes['fixture-press'], 'Existing browser note');
const accountA = readDeviceTraining(storage, 'user-a');
assert.equal(accountA.state.weeklySchedule, 'Monday: Chest');
assert.deepEqual(accountA.state.workoutHistory, legacy.workoutHistory);
assert.equal(memory.get(CLAIM_KEY), 'user-a');
assert.equal(memory.get(LIBRARY_KEY), JSON.stringify(legacy), 'Migration preserves original backup');
assert.equal(readDeviceTraining(storage, 'user-b').state.workouts.length, 0, 'Another account cannot import claimed data');
assert.equal(readDeviceTraining(storage).state.workouts.length, 0, 'Signing out must not expose account training');
memory.set(accountA.key, JSON.stringify({ state: accountA.state, base: accountA.state, imported: true }));
assert.deepEqual(readDeviceTraining(storage, 'user-a').state, accountA.state);
const base = clone(legacy), local = clone(base), remote = clone(base);
local.notes['fixture-press'] = 'Local changed note'; remote.notes['fixture-press'] = 'Remote changed note';
local.workouts.push({ id: 'local', name: 'Local session', exercises: [] });
remote.workouts.push({ id: 'remote', name: 'Remote session', exercises: [] });
const merged = mergeTraining(base, local, remote);
assert(merged.notes['fixture-press'].includes('Local changed note'));
assert(merged.notes['fixture-press'].includes('Remote changed note'));
assert.equal(merged.workouts.length, 3);
assert.deepEqual(mergeTraining(base, local, base), local);
const deleted = clone(base); delete deleted.notes['fixture-press']; deleted.favourites = []; deleted.workouts = [];
assert.deepEqual(mergeTraining(base, deleted, base), deleted, 'Unchanged cloud does not resurrect deletions');
assert.deepEqual(mergeTraining(emptyTraining(), legacy, legacy), legacy, 'Imports are idempotent');
assert.throws(() => parseTraining({ notes: [] }));
const corrupt = new Map([[LIBRARY_KEY, '{broken']]);
assert.throws(() => readDeviceTraining({ getItem: key => corrupt.get(key) ?? null, setItem() {} }, 'user-c'));
assert.equal(corrupt.get(LIBRARY_KEY), '{broken');
const sql = fs.readFileSync('personal-training.sql', 'utf8');
assert.match(sql, /enable row level security/i);
assert.match(sql, /security invoker/i);
assert.match(sql, /where user_id = auth.uid\(\) and revision = p_revision/i);
console.log('PASS: migration, legacy backup, account isolation, merge conflicts, deletion, idempotence, malformed data, SQL security guards.');

async function browserChecks() {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';
  const rows = new Map();
  const ids = { a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222' };
  const userFor = id => ({ id, aud: 'authenticated', role: 'authenticated', email: id === ids.a ? 'a@example.test' : 'b@example.test', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() });
  const token = id => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000) + 3600, iat: Math.floor(Date.now()/1000), role: 'authenticated' })).toString('base64url'), 'test-signature'].join('.');
  let offline = false, conflict = false, googleRequested = false;
  async function setup(context) {
    await context.route('**/auth/v1/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/authorize')) { googleRequested = url.searchParams.get('provider') === 'google' && url.searchParams.get('redirect_to') === baseUrl + '/account'; return route.fulfill({ contentType: 'text/html', body: 'Mock Google authorization' }); }
      if (url.pathname.endsWith('/token')) {
        const body = route.request().postDataJSON(); const id = body.email === 'b@example.test' ? ids.b : ids.a;
        return route.fulfill({ json: { access_token: token(id), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000) + 3600, refresh_token: 'fake-refresh', user: userFor(id) } });
      }
      if (url.pathname.endsWith('/user')) return route.fulfill({ json: userFor(ids.a) });
      return route.fulfill({ json: {} });
    });
    await context.route('**/rest/v1/**', async route => {
      if (offline) return route.abort('internetdisconnected');
      const auth = route.request().headers().authorization?.replace('Bearer ', '');
      assert(auth, 'Cloud request must carry JWT');
      const id = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString()).sub;
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/personal_training')) {
        assert.equal(url.searchParams.get('user_id'), 'eq.' + id, 'Read must be scoped to token owner');
        return route.fulfill({ json: rows.has(id) ? [rows.get(id)] : [] });
      }
      if (url.pathname.endsWith('/rpc/save_personal_training')) {
        const body = route.request().postDataJSON();
        if (conflict) {
          conflict = false;
          const row = clone(rows.get(id)); row.state.notes['remote-note'] = 'Concurrent remote note'; row.revision++;
          rows.set(id, row); return route.fulfill({ json: null });
        }
        const current = rows.get(id);
        if ((current?.revision ?? 0) !== body.p_revision) return route.fulfill({ json: null });
        const revision = body.p_revision + 1; rows.set(id, { state: body.p_state, revision });
        return route.fulfill({ json: revision });
      }
      return route.fulfill({ status: 404, json: {} });
    });
    await context.route('**/api/exercises?mode=custom', route => route.fulfill({ json: { results: [] } }));
  }
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    context.setDefaultTimeout(60000);
    context.setDefaultNavigationTimeout(180000);
    await setup(context);
    await context.addInitScript(({ key, scheduleKey, legacy }) => {
      if (!localStorage.getItem('fixture-seeded')) { localStorage.setItem(key, JSON.stringify(legacy)); localStorage.setItem(scheduleKey, 'Monday: Chest'); localStorage.setItem('fixture-seeded', '1'); }
    }, { key: LIBRARY_KEY, scheduleKey: SCHEDULE_KEY, legacy });
    const page = await context.newPage();
    // A stale/forged cookie must return to login, and a subsequent real sign-in
    // must establish a fresh cookie without requiring a manual page reload.
    await context.addCookies([{ name: 'repvisual-access-token', value: 'forged-token', url: baseUrl }]);
    await page.goto(baseUrl + '/library', { timeout: 180000, waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor({ timeout: 120000 });
    assert.equal(new URL(page.url()).pathname, '/', 'Visitors land on authentication');
    await page.getByLabel('Email', { exact: true }).fill('a@example.test');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/library', { timeout: 60000 });
    await page.getByRole('link', { name: 'Account', exact: true }).click();
    await page.getByText('All changes synced to your account.', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(rows.get(ids.a).state.notes['fixture-press'], legacy.notes['fixture-press']);
    assert.deepEqual(rows.get(ids.a).state.workoutHistory, legacy.workoutHistory);
    assert.equal(rows.get(ids.a).state.weeklySchedule, 'Monday: Chest');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).notes['fixture-press'], LIBRARY_KEY), legacy.notes['fixture-press']);
    await page.goto(baseUrl + '/');
    await page.waitForURL('**/library', { timeout: 60000 });
    const schedule = page.getByLabel('Monday to Sunday schedule'); await schedule.waitFor({ timeout: 120000 });
    await page.getByRole('button', { name: 'Expand Chest', exact: true }).click();
    await page.getByRole('button', { name: 'View personal notes for Fixture press', exact: true }).click();
    const notes = page.getByRole('dialog', { name: 'Personal exercise notes', exact: true });
    await notes.getByRole('button', { name: 'Edit Note', exact: true }).click();
    await notes.locator('textarea').fill('Updated private account note');
    await notes.getByRole('button', { name: 'Save Note', exact: true }).click();
    await notes.getByRole('button', { name: 'Close notes', exact: true }).click();
    conflict = true; await schedule.fill('Monday: Updated training');
    await page.waitForTimeout(2500);
    await page.getByRole('link', { name: 'Account', exact: true }).click();
    await page.getByText('All changes synced to your account.', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(rows.get(ids.a).state.weeklySchedule, 'Monday: Updated training');
    assert.equal(rows.get(ids.a).state.notes['remote-note'], 'Concurrent remote note');
    assert.equal(rows.get(ids.a).state.notes['fixture-press'], 'Updated private account note');
    offline = true;
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await page.getByText('Sync needs attention.', { exact: true }).waitFor();
    offline = false;
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await page.getByText('All changes synced to your account.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(baseUrl + '/');
    await page.getByLabel('Email', { exact: true }).fill('b@example.test');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/library', { timeout: 60000 });
    await page.getByRole('link', { name: 'Account', exact: true }).click();
    await page.getByText('All changes synced to your account.', { exact: true }).waitFor();
    assert.equal(rows.get(ids.b).state.workouts.length, 0);
    assert.deepEqual(rows.get(ids.b).state.notes, {});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(baseUrl + '/');
    await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
    await page.waitForURL('**/auth/v1/authorize?**'); assert(googleRequested);
    await page.goto(baseUrl + '/account#access_token=' + token(ids.a) + '&token_type=bearer&expires_in=3600&refresh_token=fake-refresh');
    await page.waitForURL('**/library', { timeout: 60000 });
    await context.close();
    const other = await browser.newContext();
    other.setDefaultTimeout(60000); other.setDefaultNavigationTimeout(180000);
    await setup(other);
    const second = await other.newPage(); await second.goto(baseUrl + '/account');
    await second.getByLabel('Email', { exact: true }).fill('a@example.test');
    await second.getByLabel('Password', { exact: true }).fill('test-password');
    await second.getByRole('button', { name: 'Sign in', exact: true }).click();
    await second.waitForURL('**/library', { timeout: 60000 });
    await second.getByRole('link', { name: 'Account', exact: true }).click();
    try { await second.getByText('All changes synced to your account.', { exact: true }).waitFor({ timeout: 60000 }); }
    catch (error) { console.error('Second-device UI:', await second.locator('main').innerText()); throw error; }
    assert.equal(await second.evaluate(id => JSON.parse(localStorage.getItem(`repvisual:library:user:${id}:v2`)).state.weeklySchedule, ids.a), 'Monday: Updated training');
    await other.close();
    console.log('PASS: mocked sign-in/import, autosave, revision retry, offline recovery, account switching, Google redirect, mobile layout, second-device restore.');
  } finally { await browser.close(); }
}
if (process.argv.includes('--browser')) browserChecks().catch(error => { console.error(error); process.exitCode = 1; });
