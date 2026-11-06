# Frontend Handoff

- Task ID: FE-007 — Spark + Save Engagement
- Base backend commit: `84ea6a36be32d2e4ece582196d2920b4daaec5ac`
- Previous accepted frontend commit: `d145b2ac8795f21c773233d38fe8816138ada541`
- Result: accepted by user; ready for checkpoint commit/push.
- API:
  - batch read `GET /me/engagement/?idea_ids=...`
  - explicit `PUT/DELETE /ideas/<id>/spark/`
  - explicit `PUT/DELETE /ideas/<id>/save/`.
- State model: batch fetch at screen level; normalized per-Idea TanStack cache observed by every card/detail instance.
- Scale: IDs chunked at 100 per batch request.
- Optimistic behavior: immediate pressed state; rollback on failure; action error message; both controls locked during one mutation.
- Cache invalidation: engagement refetches for confirmation; recommendations/library marked stale without jarring active recommendation reorder.
- Auth behavior: authenticated cards/details show controls; anonymous public detail offers sign-in; anonymous cards hide private controls.
- Visual design: no counts; compact pill controls; amber Spark / teal Save; `aria-pressed`; responsive desktop/mobile.
- Unit/regression gate before final cleanup: 22 test files / 60 tests pass; typecheck/lint/build/format/runtime audit pass; bundle ~145.33 KB JS gzip / ~7.45 KB CSS gzip.
- Live read smoke with seeded demo user confirms all four state combinations are represented.
- Do not commit/push until user validates real account interactions.
- Next likely task: FE-008 Comments; Library can follow immediately after because Save state/cache is now established.
