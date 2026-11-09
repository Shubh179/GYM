const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = process.env.ANATOMY_ARTIFACTS || path.resolve('../tmp/anatomy-performance');

async function fixture(context) {
  await context.addInitScript(() => {
    localStorage.setItem('repvisual:library:v1', JSON.stringify({ workouts: ['Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Forearms', 'Abs', 'Legs'].map(name => ({ id: name.toLowerCase(), name, exercises: [] })) }));
    window.__anatomyContexts = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type === 'webgl' || type === 'webgl2') window.__anatomyContexts++;
      return original.call(this, type, ...args);
    };
  });
  await context.route('**/api/exercises?mode=custom', route => route.fulfill({ json: { results: [] } }));
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], checks = [];
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
      await fixture(context);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /THREE|WebGL|shader/i.test(message.text())) errors.push(message.text()); });
      const requests = [], chunks = [];
      page.on('request', request => {
        if (/\.glb(?:\?|$)/.test(request.url())) requests.push(request.url());
        if (/AnatomyExplorer|MuscleBody3D/.test(request.url())) chunks.push(request.url());
      });
      await page.goto((process.env.TEST_BASE_URL || 'http://localhost:3000') + '/library', { waitUntil: 'networkidle', timeout: 90000 });
      await page.getByRole('button', { name: 'Expand Chest', exact: true }).click();
      await page.getByRole('button', { name: 'Expand Legs', exact: true }).click();
      const preview = group => page.locator(`[data-muscle-guide][data-active-muscle-group="${group.toLowerCase()}"]`);
      await preview('Chest').locator('img').evaluate(image => image.decode());
      assert.equal(await page.locator('canvas').count(), 0);
      assert.equal(await page.evaluate(() => window.__anatomyContexts), 0);
      assert.equal(requests.length, 0, 'No GLB request until Explore in 3D');
      assert.equal(chunks.length, 0, 'No viewer code until Explore in 3D');
      await preview('Chest').screenshot({ path: path.join(output, `preview-${width}.png`) });
      await preview('Chest').getByRole('button', { name: 'Explore in 3D', exact: true }).click();
      const dialog = page.getByRole('dialog');
      const model = dialog.locator('[data-model-ready="true"]');
      await model.waitFor({ timeout: 60000 });
      await dialog.getByRole('button', { name: 'Locate Upper chest', exact: true }).click();
      assert.equal(await dialog.getByRole('button', { name: 'Locate Upper chest', exact: true }).getAttribute('aria-pressed'), 'true');
      await dialog.getByRole('button', { name: 'Show all muscles', exact: true }).click();
      const calls = Number(await model.getAttribute('data-draw-calls'));
      assert(calls > 0 && calls < 60, `Too many draw calls: ${calls}`);
      const canvas = await model.locator('canvas').elementHandle();
      const ratio = await canvas.evaluate(element => element.width / element.getBoundingClientRect().width);
      assert(ratio <= (width < 768 ? 1.01 : 1.51));
      const contexts = await page.evaluate(() => window.__anatomyContexts);
      await dialog.screenshot({ path: path.join(output, `viewer-${width}.png`) });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await preview('Chest').getByRole('button', { name: 'Explore in 3D', exact: true }).evaluate(element => document.activeElement === element), true);
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      for (const group of ['Legs', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Forearms', 'Abs']) {
        if (group !== 'Legs') await page.getByRole('button', { name: 'Expand ' + group, exact: true }).click();
        await preview(group).getByRole('button', { name: 'Explore in 3D', exact: true }).click();
        await model.waitFor();
        assert.equal(await dialog.getByRole('heading').textContent(), group + ' anatomy');
        assert.equal(await canvas.evaluate(element => element === document.querySelector('[data-body-model] canvas')), true);
        if (group === 'Legs') {
          await dialog.getByRole('button', { name: 'Back view', exact: true }).click();
          await dialog.getByRole('button', { name: 'Locate Hamstrings', exact: true }).waitFor();
          assert.equal(await dialog.locator('[data-muscle-label]:visible').count(), 4);
        }
        await dialog.getByRole('button', { name: 'Close 3D viewer', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
      }
      assert.equal(await page.evaluate(() => window.__anatomyContexts), contexts);
      assert.equal(requests.length, 1, 'Reopening should not download or recreate the model');
      assert(requests[0].includes('body-optimized.glb'));
      assert.equal(await page.locator('canvas').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      checks.push({ width, deferredLoading: true, sharedContext: true, modelRequests: requests.length, drawCalls: calls, pixelRatio: ratio });
      console.log('PASS on-demand loading, shared renderer, all groups, keyboard/focus:', width, calls, 'draw calls');
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await fixture(context);
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl' || type === 'webgl2' ? null : original.call(this, type, ...args); };
    });
    const page = await context.newPage();
    await page.goto((process.env.TEST_BASE_URL || 'http://localhost:3000') + '/library', { waitUntil: 'networkidle', timeout: 90000 });
    await page.getByRole('button', { name: 'Expand Chest', exact: true }).click();
    await page.getByRole('button', { name: 'Explore in 3D', exact: true }).click();
    await page.getByRole('dialog').getByText('3D unavailable', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await context.close();
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, errors, fallback: true }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
