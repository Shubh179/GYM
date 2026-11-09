const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const output = process.env.ANATOMY_ARTIFACTS || path.resolve('../tmp/anatomy-targets');
const rank = level => ({ beginner: 0, intermediate: 1, expert: 2, advanced: 2, advance: 2 }[level] ?? 3);
const exercise = (slug, name, target) => ({ slug, name, targetAreas: [target], primaryMuscles: ['chest'], level: 'beginner', category: 'strength', equipment: null, thumbUrl: null });

(async () => {
  await fs.mkdir(output, { recursive: true });
  const apiChecks = [];
  for (const target of ['upper-chest', 'lower-chest', 'lats', 'quads']) {
    const response = await fetch(base + '/api/exercises?target=' + target);
    assert.equal(response.status, 200);
    const { results } = await response.json();
    assert(results.length > 0);
    assert(results.every(result => result.targetAreas.includes(target)), 'Target search must not widen to broad muscle groups');
    assert(results.every((result, index) => index === 0 || rank(result.level) >= rank(results[index - 1].level)));
    if (target === 'quads') assert(results.length > 48, 'Target browse must include all matching exercises');
    apiChecks.push({ target, count: results.length, levels: [...new Set(results.map(result => result.level))] });
  }
  assert.equal((await fetch(base + '/api/exercises?target=invalid')).status, 400);
  assert.equal((await fetch(base + '/api/exercises?target=')).status, 400);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], checks = [];
  try {
    for (const width of JSON.parse(process.env.TARGET_WIDTHS || '[1280,390]')) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 768, reducedMotion: 'reduce' });
      await context.addInitScript(data => localStorage.setItem('repvisual:library:v1', JSON.stringify(data)), {
        workouts: [
          { id: 'current-chest', name: 'Chest', exercises: [exercise('flat-bench-fixture', 'Flat Bench Press', 'middle-chest'), exercise('incline-dumbbell-press', 'Incline Dumbbell Press', 'upper-chest')] },
          { id: 'other-chest', name: 'Other Chest', exercises: [exercise('other-incline-fixture', 'Other Incline Press', 'upper-chest'), exercise('decline-fixture', 'Decline Press', 'lower-chest')] },
        ],
      });
      await context.route('**/api/exercises?mode=custom', route => route.fulfill({ json: { results: [] } }));
      await context.addInitScript(() => {
        window.__targetTaps = [];
        document.addEventListener('click', event => {
          const label = event.target.closest('[data-muscle-label]');
          if (label) window.__targetTaps.push({ target: label.dataset.muscleLabel, time: performance.now(), detail: event.detail, x: event.clientX, y: event.clientY });
        }, true);
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/library', { waitUntil: 'networkidle', timeout: 90000 });
      await page.getByRole('button', { name: 'Expand Chest', exact: true }).click();
      await page.getByRole('button', { name: 'Expand Other Chest', exact: true }).click();
      const session = page.locator('[data-workout-id="current-chest"]');
      const open = () => session.getByRole('button', { name: 'Explore in 3D', exact: true }).click();
      const dialog = page.getByRole('dialog');
      const model = dialog.locator('[data-model-ready="true"]');
      const upper = dialog.getByRole('button', { name: 'Locate Upper chest', exact: true });
      const lower = dialog.getByRole('button', { name: 'Locate Lower chest', exact: true });
      const card = session.locator('[data-exercise-slug="incline-dumbbell-press"]');
      const input = width < 768 ? await context.newCDPSession(page) : null;
      async function touchDoubleTap(x, y) {
        // Preserve human gesture timing even when software WebGL delays the
        // automation acknowledgement of the first tap.
        const time = Date.now() / 1000;
        for (const [type, offset] of [['touchStart', 0], ['touchEnd', .04], ['touchStart', .18], ['touchEnd', .22]]) {
          await input.send('Input.dispatchTouchEvent', { type, timestamp: time + offset, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 0 }] });
        }
      }
      const doubleTap = async label => {
        if (width < 768) {
          await label.scrollIntoViewIfNeeded();
          const box = await label.boundingBox();
          await touchDoubleTap(box.x + box.width / 2, box.y + box.height / 2);
        }
        else await label.dblclick({ delay: 90 });
      };
      await open(); await model.waitFor({ timeout: 60000 });
      // Different consecutive muscles and a single click only change selection.
      await upper.click(); await lower.click();
      assert.equal(await dialog.isVisible(), true);
      assert.equal(await lower.getAttribute('aria-pressed'), 'true');
      await doubleTap(upper);
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(new URL(page.url()).pathname, '/library');
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-exercise-slug') === 'incline-dumbbell-press');
      assert.equal(await card.evaluate(element => document.activeElement === element), true);
      assert.equal(await page.locator('[data-workout-id="other-chest"] [data-exercise-slug="other-incline-fixture"]').evaluate(element => document.activeElement === element), false);

      // Keyboard users can choose a label and activate the same action.
      await open(); await model.waitFor();
      await upper.focus(); await upper.press('Enter');
      await dialog.getByRole('button', { name: 'Show exercises for Upper chest', exact: true }).press('Enter');
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-exercise-slug') === 'incline-dumbbell-press');

      // Double-tapping the actual rendered muscle also uses raycast selection.
      await open(); await model.waitFor();
      const anchor = await model.locator('[data-muscle-leader="upper-chest"]').evaluate(line => {
        const box = line.ownerSVGElement.getBoundingClientRect();
        return { x: box.left + Number(line.getAttribute('x2')), y: box.top + Number(line.getAttribute('y2')) };
      });
      // A leader ends at an approximate region anchor; sample the visible
      // muscle around it to avoid testing an occluding adjacent structure.
      let point = null;
      for (const [dx, dy] of [[0, 0], [0, -8], [-8, -8], [8, -8], [0, -16], [-12, -16], [12, -16], [-8, 0], [8, 0]]) {
        const candidate = { x: anchor.x + dx, y: anchor.y + dy };
        if (width < 768) await page.touchscreen.tap(candidate.x, candidate.y);
        else await page.mouse.click(candidate.x, candidate.y);
        if (await upper.getAttribute('aria-pressed') === 'true') { point = candidate; break; }
        await dialog.getByRole('button', { name: 'Close 3D viewer', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await open(); await model.waitFor();
      }
      assert(point, 'A visible upper-chest muscle must be selectable');
      await dialog.getByRole('button', { name: 'Close 3D viewer', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await open(); await model.waitFor();
      if (width < 768) await touchDoubleTap(point.x, point.y);
      else await page.mouse.dblclick(point.x, point.y, { delay: 90 });
      await dialog.waitFor({ state: 'hidden', timeout: 5000 });
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-exercise-slug') === 'incline-dumbbell-press');

      // A lower-chest match in another session must not prevent target browsing.
      await open(); await model.waitFor();
      const response = page.waitForResponse(response => response.url().includes('/api/exercises?target=lower-chest') && response.status() === 200).catch(error => ({ error }));
      await doubleTap(lower);
      try { await page.waitForURL('**/search?target=lower-chest', { timeout: 10000 }); }
      catch (error) { console.error('Tap diagnostics:', width, await page.evaluate(() => ({ taps: window.__targetTaps, focused: document.querySelector('[data-muscle-label][aria-pressed="true"]')?.dataset.muscleLabel, url: location.href }))); await page.screenshot({ path: path.join(output, `failure-${width}.png`) }); throw error; }
      const result = await response;
      if (result.error) throw result.error;
      const { results } = await result.json();
      await page.getByRole('heading', { name: 'Exercises for Lower chest', exact: true }).waitFor();
      await page.locator('[data-exercise-title]').first().waitFor();
      assert.deepEqual(await page.locator('[data-exercise-title]').allTextContents(), results.map(result => result.name));
      assert.equal(await dialog.isVisible(), false);
      assert.equal(await page.locator('canvas').count(), 1, 'Navigation should retain the paused shared viewer');
      await page.screenshot({ path: path.join(output, `browse-${width}.png`) });
      checks.push({ width, sessionJump: true, exactSession: true, keyboard: true, meshDoubleTap: true, targetBrowse: true, difficultyOrder: true });
      console.log('PASS session jump, mesh/label double-tap, keyboard and target browse:', width);
      await context.close();
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, apiChecks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
