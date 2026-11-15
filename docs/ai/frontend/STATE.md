# Frontend State

- Task: FE-016 — Persistent Responsive Application Shell.
- Status: ACCEPTED; checkpointed by the FE-016 commit containing this state.
- Accepted frontend base: `0ae6e5ecdf9e720f5c73b8db77c78fad44d079e9`.
- Branch: `master`.
- Scope: frontend and frontend AI documentation only; backend implementation files unchanged.
- Shell behavior:
  - sticky, opaque, low-cost header with no blur/filter dependency;
  - desktop navigation at wide tablet/desktop widths;
  - lightweight slide-down compact navigation;
  - public-only anonymous destination set;
  - authenticated Home, Explore, Search, Library and Creator Studio destinations;
  - capability-gated Moderation destination;
  - active-route marker plus `aria-current="page"`;
  - Escape, outside-click, navigation and route-change dismissal;
  - logical CSS positioning for English LTR and Persian RTL.
- Account behavior:
  - compact account trigger and non-modal account menu;
  - current identity, email, useful existing destinations and Sign out;
  - interface language toggle remains directly visible in the persistent header, not inside account/mobile menus;
  - logout uses the existing API, clears non-session query caches, stores a null session and returns to `/`;
  - pending/disabled and localized error states;
  - no invented profile/settings route.
- Avatar behavior:
  - optional nullable `CurrentUser.avatar_url` frontend typing;
  - image when present;
  - deterministic, Unicode-safe initials otherwise;
  - email-local-part fallback for blank display names;
  - safe against the currently deployed response omitting `avatar_url`;
  - no CreatorProfile avatar reuse or upload behavior.
- Tests: focused AccountAvatar and RootLayout coverage added for navigation, capabilities, disclosures, active semantics, avatar/fallback, logout success/failure, RTL, and the requirement that the language switch remains directly in the persistent header. Full suite: 47 files / 167 tests PASS.
- Manual browser review passed for desktop/compact anonymous, ordinary Reader and moderator states, English LTR, Persian RTL, long and blank identity fallback, sticky scrolling, navigation layering and compact panel edges. A compact RTL account-panel overflow found during review was corrected with viewport-safe insets and rechecked.
- Backend contracts now landed on `master` while FE-016 remained a dirty frontend tree:
  - universal account avatar backend: `c9ad9f6`;
  - moderator hidden-Idea workspace backend: `e4ec791` (backend docs checkpoint `2a6afbe`).
- Next logical sequence:
  1. FE-017 account/profile + avatar integration against the landed backend contract;
  2. FE-018 moderator Hidden Ideas workspace against the landed backend contract;
  3. frontend completeness audit;
  4. bounded motion/interaction polish;
  5. PWA work.

Final command results and production build sizes are recorded in `HANDOFF.md` after the full verification run.
