const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const cookieModule = { exports: {} };
const fakeDocument = { cookie: '' };
new Function('module', 'exports', 'document', 'window', transpile('src/lib/auth-cookie.ts'))(
  cookieModule, cookieModule.exports, fakeDocument, { location: { protocol: 'https:' } });
const { AUTH_COOKIE, writeAuthCookie } = cookieModule.exports;
writeAuthCookie({ access_token: 'fixture-token', expires_at: Math.floor(Date.now()/1000) + 3600 });
assert.match(fakeDocument.cookie, /SameSite=Lax; Secure/);
writeAuthCookie(null);
assert.match(fakeDocument.cookie, /Max-Age=0/);
let validation = 'valid', seenTokens = [];
const response = (kind, status, value) => ({ kind, status, value, headers: new Headers(), cookies: { deleted: [], delete(key) { this.deleted.push(key); } } });
const NextResponse = {
  next: () => response('next', 200),
  redirect: url => response('redirect', 307, url.toString()),
  json: (body, init) => response('json', init.status, body),
};
const middlewareModule = { exports: {} };
new Function('require', 'module', 'exports', 'process', transpile('src/middleware.ts'))(name => {
  if (name === 'next/server') return { NextResponse };
  if (name.includes('auth-cookie')) return cookieModule.exports;
  if (name === '@supabase/supabase-js') return { createClient: () => ({ auth: { getUser: async token => {
    seenTokens.push(token);
    if (validation === 'unavailable') throw Error('offline');
    return validation === 'valid' ? { data: { user: { id: 'fixture-user' } }, error: null }
      : { data: { user: null }, error: { status: 401 } };
  } } }) };
  throw Error('Unexpected dependency ' + name);
}, middlewareModule, middlewareModule.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-key' } });
const request = (pathname, token, bearer) => ({ nextUrl: { pathname }, url: 'https://repvisual.example' + pathname,
  headers: new Headers(bearer ? { authorization: 'Bearer ' + bearer } : {}), cookies: { get: () => token ? { value: token } : undefined } });
async function unitChecks() {
  const { middleware } = middlewareModule.exports;
  for (const path of ['/', '/account', '/privacy-policy']) assert.equal((await middleware(request(path))).kind, 'next');
  assert.equal(seenTokens.length, 0, 'Public pages require no auth call');
  for (const path of ['/library', '/search', '/favourites', '/timer', '/music', '/spotify', '/exercise/press', '/models/anatomy/body-optimized.glb']) {
    const result = await middleware(request(path));
    assert.equal(result.status, 307); assert.equal(new URL(result.value).pathname, '/');
  }
  for (const path of ['/api/exercises', '/api/exercise/press', '/api/exercise-access', '/api/music-test']) assert.equal((await middleware(request(path))).status, 401);
  assert.equal((await middleware(request('/library', 'cookie-token'))).kind, 'next');
  assert.equal((await middleware(request('/api/exercises', undefined, 'bearer-token'))).kind, 'next');
  assert.deepEqual(seenTokens, ['cookie-token', 'bearer-token']);
  validation = 'invalid';
  const rejected = await middleware(request('/library', 'forged-token'));
  assert.equal(rejected.status, 307);
  assert.equal(new URL(rejected.value).searchParams.get('auth'), 'required');
  assert.deepEqual(rejected.cookies.deleted, [AUTH_COOKIE]);
  assert.equal((await middleware(request('/api/exercises', 'forged-token'))).status, 401);
  validation = 'unavailable';
  assert.equal((await middleware(request('/library', 'token'))).status, 503, 'Auth outages fail closed');
  console.log('PASS: public allowlist, page/API/model guards, server JWT verification, invalid cookie removal, unavailable auth, cookie flags.');
}

async function browserChecks() {
  const http = require('node:http');
  const { spawn } = require('node:child_process');
  const { chromium } = require('playwright-core');
  let serverProcess, browser, logs = '';
  const auth = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const jwt = req.headers.authorization?.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
      if (req.url.startsWith('/auth/v1/user') && jwt.endsWith('.test-signature') && payload.exp > Date.now()/1000) {
        res.end(JSON.stringify({ id: payload.sub, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {} }));
        return;
      }
    } catch { /* Invalid JWT fixture. */ }
    res.statusCode = 401; res.end(JSON.stringify({ message: 'Invalid token', code: 'bad_jwt' }));
  });
  await new Promise(resolve => auth.listen(0, '127.0.0.1', resolve));
  const baseUrl = 'http://localhost:' + (process.env.AUTH_TEST_PORT || 3012);
  const env = { ...process.env, JITI_CACHE: 'false', NEXT_DIST_DIR: '.next-auth-test', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${auth.address().port}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key' };
  try {
    serverProcess = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', new URL(baseUrl).port], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const record = data => {
      const chunk = data.toString(); logs = (logs + chunk).slice(-5000);
      if (/Compiled|error|Error|Ready in/.test(chunk)) process.stdout.write(chunk.slice(-1500));
    };
    serverProcess.stdout.on('data', record);
    serverProcess.stderr.on('data', record);
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (logs.includes('Ready in')) { ready = true; break; }
      if (serverProcess.exitCode !== null) throw Error('Test server exited: ' + logs);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw Error('Test server did not start: ' + logs);
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext();
    context.setDefaultTimeout(60000);
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await page.getByRole('heading', { name: 'Sign in to RepVisual', exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Export training backup' }).count(), 0);
    for (const path of ['/library', '/search', '/favourites', '/timer', '/music', '/exercise/fixture']) {
      await page.goto(baseUrl + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByRole('heading', { name: 'Sign in to RepVisual', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
    }
    for (const path of ['/api/exercises', '/api/exercise/fixture', '/api/music-test']) {
      assert.equal((await context.request.get(baseUrl + path)).status(), 401);
    }
    await context.addCookies([{ name: AUTH_COOKIE, value: 'forged-token', url: baseUrl }]);
    await page.goto(baseUrl + '/library');
    await page.getByRole('heading', { name: 'Sign in to RepVisual', exact: true }).waitFor();
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).count(), 0);
    const legal = await browser.newContext({ javaScriptEnabled: false });
    const policy = await legal.newPage();
    await policy.goto(baseUrl + '/privacy-policy', { timeout: 180000, waitUntil: 'domcontentloaded' });
    await policy.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor();
    await legal.close(); await context.close();
    console.log('PASS: guest homepage, hidden navigation/data export, direct-link redirects, API 401, forged session rejection and public no-JavaScript privacy policy.');
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['training-sync.test.cjs', '--browser'], { env: { ...env, TEST_BASE_URL: baseUrl }, windowsHide: true, stdio: 'inherit' });
      child.on('exit', code => code === 0 ? resolve() : reject(Error('Authenticated flow regression failed: ' + code)));
      child.on('error', reject);
    });
  } catch (error) {
    console.error('Isolated authentication flow failed:', error.message, logs);
    throw error;
  } finally {
    if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
    if (browser) await browser.close();
    auth.closeAllConnections();
    await new Promise(resolve => auth.close(resolve));
  }
}
unitChecks().then(() => process.argv.includes('--browser') ? browserChecks() : undefined).catch(error => { console.error(error); process.exitCode = 1; });
