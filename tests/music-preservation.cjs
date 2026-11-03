const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    // Temporary browser context only: never touches the user's workout storage.
    const context = await browser.newContext();
    await context.route('https://echoplay.vercel.app/**', route => route.fulfill({ contentType: 'text/html', body: 'Music layout fixture' }));
    const library = {
      favourites: [], workouts: [{ id: 'existing-workout', name: 'Existing workout', exercises: [] }],
      progress: { 'existing-workout': ['existing-exercise'] }, completions: { '2026-11-02': 1 },
      sessionLog: { '2026-11-02': ['existing-workout'] },
      workoutHistory: { '2026-11-02': [{ id: 'existing-session', workoutId: 'existing-workout', workoutName: 'Existing workout', exercises: [], completedAt: '2026-11-02T10:00:00.000Z', notes: 'Keep this history' }] },
      notes: { 'existing-exercise': 'Keep this note' }
    };
    const timer = {
      stopwatch: { isRunning: true, startTime: Date.now(), elapsedBeforePause: 12000 },
      restTimer: { isRunning: false, targetDeadline: null, totalDurationMs: 90000, remainingBeforePause: 45000, isFinished: false },
      soundEnabled: false
    };
    await context.addInitScript(({ library, timer }) => {
      if (!localStorage.getItem('music-preservation-seeded')) {
        localStorage.setItem('repvisual:library:v1', JSON.stringify(library));
        localStorage.setItem('repvisual:timer:v1', JSON.stringify(timer));
        localStorage.setItem('music-preservation-seeded', '1');
      }
    }, { library, timer });
    const page = await context.newPage();
    const checkStorage = async () => {
      const stored = await page.evaluate(() => ({ library: JSON.parse(localStorage.getItem('repvisual:library:v1')), timer: JSON.parse(localStorage.getItem('repvisual:timer:v1')) }));
      assert.deepEqual(stored.library, library);
      assert.deepEqual(stored.timer, timer);
    };
    await page.goto('http://localhost:3000/library', { waitUntil: 'networkidle', timeout: 120000 });
    await checkStorage();
    await page.getByRole('link', { name: 'Music', exact: true }).click();
    await page.locator('#echoplay-frame').waitFor();
    await checkStorage();
    await page.evaluate(() => window.originalMusicFrame = document.getElementById('echoplay-frame'));
    await page.getByRole('button', { name: 'Minimize', exact: true }).click();
    await page.getByRole('link', { name: 'My Training', exact: true }).click();
    await page.waitForURL('**/library');
    assert.ok(await page.evaluate(() => window.originalMusicFrame === document.getElementById('echoplay-frame')));
    await checkStorage();
    await page.getByRole('button', { name: 'Close EchoPlay player and stop playback' }).click();
    await page.reload({ waitUntil: 'networkidle' });
    await checkStorage();
    console.log('PASS existing workouts, progress, history, notes and running timer preserved through music navigation, close and reload');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
