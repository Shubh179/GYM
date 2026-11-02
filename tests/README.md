# Responsive browser checks

Run against the local development server (`npm.cmd run dev`):

```powershell
npm.cmd install --no-save --package-lock=false playwright-core
node tests/mobile-responsive.cjs
```

The harness launches installed Chrome headlessly in a new temporary browser context. It never uses your normal browser profile. Exercise/workout/favourite/history fixtures are stored only in isolated localStorage. It does not save custom exercise records to the server.

Checks cover nine viewport sizes, populated My Training/Browse/Favourites/Timer/Spotify pages, document overflow, navigation visibility and 44px targets, overlay bounds/collisions, notes editing, session creation, history inspection, inline search, custom exercise form input, timer controls, exercise details, and workout dropdowns.

Spotify and YouTube iframe responses are stubbed to keep app layout tests deterministic. These tests do not verify third-party playback, authentication, DRM, or real iOS/Android keyboard behavior. Exercise images use the configured CDN. Mobile emulation uses Chrome with touch support, not Safari or a physical phone.

Screenshots and JSON results are saved to `artifacts/mobile/`. `report.json` contains the final validation results (the viewport matrix plus the focused interaction rerun), and `baseline/` retains initial failing screenshots. Use `TEST_INTERACTIONS_ONLY=1` to run the interactive portion alone or `TEST_BASE_URL` to change the server URL. Chrome executable location is set at the top of the script's launch call.
