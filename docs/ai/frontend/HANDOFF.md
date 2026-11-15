# Frontend Handoff

- Task: FE-023 — Frontend Hardening Evidence.
- Accepted base: `b78c600b81bd4147f45600b42879161910d23427`.
- Result: ACCEPTED by user; checkpointed in the FE-023 commit containing this handoff.
- Backend implementation unchanged.
- No npm dependency addition.

## Added repeatable commands

- `npm run test:browser-smoke`
- `npm run test:compat:firefox`
- `npm run test:hardening`

## Chromium critical flow

Dependency-free Node + CDP fixture smoke covers:

protected deep link -> Login -> exact return path -> personalized feed -> Idea -> Spark -> Save -> comment -> Library.

It also inspects Chromium's accessibility tree and keyboard-drives the compact menu.

Current evidence:

- Chromium 157 PASS;
- 0 unnamed interactive AX nodes on representative app/Idea/mobile surfaces;
- visible 3px keyboard focus;
- compact sticky/no-overflow shell.

## Auth race fixed

Real-browser smoke showed `AnonymousOnly` could override LoginPage return navigation with `/app`.

It now redirects an authenticated Login/Register route to stored `state.from` when present and uses `/app` only as fallback.

Unit regression tests cover both paths.

## Firefox compatibility

Dependency-free Node + Firefox WebDriver BiDi smoke serves the built production bundle from a deterministic same-origin fixture server.

Firefox 160 passed:

- 1440×900 Idea Detail render;
- 390×844 Idea Detail render;
- RTL shell;
- sticky header;
- Share;
- no horizontal overflow.

## Verification

- full Vitest: 53 files / 217 tests PASS.
- typecheck PASS.
- lint PASS.
- build PASS.
- Prettier PASS.
- npm audit runtime: 0 vulnerabilities.
- git diff check PASS.
- `npm run test:hardening` PASS.
- no package-lock change.

## Compatibility honesty

Still unverified:

- old Android;
- old iOS/Safari;
- physical current Android/WebView.

Do not convert viewport emulation into a physical-device compatibility claim.

## Pending

- Next task: FE-024 motion/interaction polish — Medium effort.
