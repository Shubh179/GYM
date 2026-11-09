const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const missing = 'zzzz-no-such-exercise-fixture';

(async () => {
  for (const route of ['/api/generate', '/api/generate-video']) {
    const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: missing, slug: missing }) });
    assert.equal(response.status, 404, 'Retired generation routes must not execute');
  }
  const known = await fetch(base + '/api/exercise/incline-dumbbell-press');
  assert.equal(known.status, 200);
  assert.equal((await known.json()).exercise.source, 'dataset');
  const absent = await fetch(base + '/api/exercise/' + missing);
  assert.equal(absent.status, 404);
  assert.equal((await absent.json()).status, 'missing');
  const manifest = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const lock = JSON.parse(await fs.readFile('package-lock.json', 'utf8'));
  for (const dependency of ['@anthropic-ai/sdk', '@google/genai', 'zod']) {
    assert.equal(manifest.dependencies[dependency], undefined);
    assert.equal(lock.packages['node_modules/' + dependency], undefined);
  }

  const output = process.env.CATALOG_ARTIFACTS || path.resolve('../tmp/catalog-only');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [], generationRequests = [];
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => localStorage.setItem('repvisual:library:v1', JSON.stringify({ workouts: [{ id: 'keep', name: 'Keep workout', exercises: [] }], notes: { 'existing-exercise': 'Keep note' }, workoutHistory: {} })));
      await context.route('**/api/exercises?mode=custom', route => route.fulfill({ json: { results: [] } }));
      await context.route('**/api/exercises?q=' + missing, route => route.fulfill({ json: { results: [] } }));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/\/api\/generate|api\.anthropic\.com|generativelanguage\.googleapis\.com/.test(request.url())) generationRequests.push(request.url()); });
      await page.goto(base + '/library', { waitUntil: 'networkidle', timeout: 90000 });
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem('repvisual:library:v1')));
      await page.goto(base + '/exercise/' + missing, { waitUntil: 'networkidle', timeout: 90000 });
      await page.getByRole('heading', { name: 'Exercise not found', exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Browse exercises', exact: true }).getAttribute('href'), '/search');
      assert.equal(await page.getByText(/AI generation|ANTHROPIC_API_KEY|Generating visualization|Generate it with AI/).count(), 0);
      await page.goto(base + '/search?q=' + missing, { waitUntil: 'networkidle', timeout: 90000 });
      await page.getByRole('link', { name: 'Browse all exercises', exact: true }).waitFor();
      assert.equal(await page.locator('[data-exercise-card]').count(), 0);
      assert.equal(await page.getByText(/Generate it with AI|AI generated/).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem('repvisual:library:v1')));
      for (const key of ['workouts', 'notes', 'workoutHistory']) assert.deepEqual(after[key], before[key]);
      await page.screenshot({ path: path.join(output, `empty-search-${width}.png`) });
      await context.close();
      console.log('PASS catalog-only lookup, missing page, empty search, preserved storage:', width);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(generationRequests, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
