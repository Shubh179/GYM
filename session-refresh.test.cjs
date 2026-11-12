const fs = require('node:fs'), ts = require('typescript'), assert = require('node:assert/strict');
const source = ts.transpileModule(fs.readFileSync('src/components/AuthProvider.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
async function recovery(result, rejected = false) {
  const states = [], cookies = [];
  let listener, refreshes = 0, signouts = 0, cleanup;
  const client = { auth: {
    onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    async refreshSession() { refreshes++; if (rejected) throw Error('offline'); return result; },
    async signOut() { signouts++; throw Error('Must not discard refresh tokens'); },
  } };
  const fixture = { exports: {} };
  const react = { createContext: () => ({ Provider: 'provider' }), useContext() {},
    useState: initial => [initial, state => states.push(state)], useEffect: fn => { cleanup = fn(); } };
  new Function('require', 'module', 'exports', 'window', source)(name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: () => null };
    if (name.endsWith('supabase-browser')) return { browserSupabase: () => client };
    if (name.endsWith('auth-cookie')) return { writeAuthCookie: session => cookies.push(session?.access_token ?? null) };
    throw Error('Unexpected dependency ' + name);
  }, fixture, fixture.exports, { location: { pathname: '/', search: '?auth=required' }, history: { replaceState() {} } });
  fixture.exports.default({ children: null });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshes, 1); assert.equal(signouts, 0);
  return { states, cookies, listener, cleanup };
}
(async () => {
  const session = { access_token: 'new-access-token', refresh_token: 'rotated-refresh-token', user: { id: 'fixture-user' } };
  const restored = await recovery({ data: { session }, error: null });
  assert.equal(restored.states.at(-1).user.id, 'fixture-user');
  assert.equal(restored.states.at(-1).error, '');
  assert.deepEqual(restored.cookies, [null, 'new-access-token']);
  restored.listener('TOKEN_REFRESHED', { ...session, access_token: 'next-access-token' });
  assert.equal(restored.cookies.at(-1), 'next-access-token', 'Later automatic refreshes remain subscribed');
  restored.cleanup();
  const expired = await recovery({ data: { session: null }, error: { status: 400 } });
  assert.equal(expired.states.at(-1).user, null);
  assert.match(expired.states.at(-1).error, /session has ended/);
  expired.listener('SIGNED_IN', session);
  assert.equal(expired.states.at(-1).user.id, 'fixture-user', 'A new sign-in works after invalid refresh');
  expired.cleanup();
  const limited = await recovery({ data: { session: null }, error: { status: 429 } });
  assert.match(limited.states.at(-1).error, /connection and reload/);
  limited.cleanup();
  const offline = await recovery(null, true);
  assert.equal(offline.states.at(-1).user, null);
  assert.match(offline.states.at(-1).error, /connection and reload/);
  offline.cleanup();
  console.log('PASS: access-token recovery, later token rotation, invalid refresh, subsequent sign-in and transient errors; no forced sign-out.');
})().catch(error => { console.error(error); process.exitCode = 1; });
