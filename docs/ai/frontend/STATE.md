# Frontend State

- Task: FE-023 — Frontend Hardening Evidence.
- Status: ACCEPTED by user; checkpointed in the FE-023 commit containing this state.
- Accepted frontend base: `b78c600b81bd4147f45600b42879161910d23427`.
- Branch: `master`.
- Scope: frontend hardening tooling, one frontend auth-routing fix, testing documentation.
- Backend implementation files unchanged.
- No new npm dependencies.

## FE-023 delivered

- Repeatable Chromium browser critical-flow smoke.
- Browser accessibility-tree inspection for unnamed interactive controls.
- Compact keyboard navigation/focus evidence.
- Repeatable Firefox production-bundle render smoke using WebDriver BiDi.
- Compatibility matrix updated with measured evidence only.
- New combined `npm run test:hardening` command.

## Real bug found and fixed

The Chromium E2E smoke exposed an auth-routing race:

- LoginPage attempted to return to the stored deep link.
- `AnonymousOnly` redirected authenticated users unconditionally to `/app`.
- real browser result was `/app`.

Fix:

- `AnonymousOnly` now honors `location.state.from` when present;
- `/app` remains fallback.

Regression coverage added.

## Verification

- TypeScript PASS.
- ESLint PASS.
- full Vitest PASS — 53 files / 217 tests.
- focused RouteGuards PASS — 1 file / 7 tests.
- build PASS — 195 modules.
- Prettier PASS.
- npm runtime audit PASS — 0 vulnerabilities.
- `git diff --check` PASS.
- `npm run test:hardening` PASS.
- no dependency/lockfile changes.
- no backend implementation changes.

## Chromium evidence

Headless Chromium 157:

- protected deep-link login return PASS;
- personalized feed PASS;
- Idea Detail PASS;
- Spark PASS;
- Save PASS;
- comment POST PASS;
- saved Idea in Library PASS;
- accessibility-tree unnamed interactive nodes: 0 on app, Idea Detail and open mobile navigation;
- mobile trigger reached after 5 Tab presses;
- `:focus-visible` true;
- 3px solid focus outline;
- Space opens mobile menu;
- Escape closes and restores focus;
- 390×844 no overflow;
- sticky header retained;
- one permanent language control.

## Firefox evidence

Firefox 160 production bundle:

- public Idea Detail rendered at 1440×900;
- public Idea Detail rendered at 390×844;
- Persian RTL shell retained;
- sticky header retained;
- Share retained;
- no horizontal overflow.

## Compatibility limits

Not verified:

- physical current Android/WebView;
- old Android target;
- old iOS/Safari target.

No minimum OS/browser claim was added.

## Next

1. FE-024 — bounded motion/interaction polish.
2. PWA.
