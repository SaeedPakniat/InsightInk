# Backend Handoff

- Task ID: BE-ACCOUNT-AVATAR-001 — Universal Account Avatar + Current Account Metadata Editing.
- Base SHA: `0ae6e5ecdf9e720f5c73b8db77c78fad44d079e9`.
- Implementation SHA: `c9ad9f67357fdfe4eae43740f31927b2fc0007a0` (`feat(accounts): add universal account avatars`).
- Model/migration: nullable, blank `accounts.User.avatar` with `upload_to="user_avatars/"`; migration `accounts.0007_user_avatar` applied. CreatorProfile remains independent and no account profile model was added.
- Dependency/storage: `Pillow==13.0.0`; local `MEDIA_ROOT`/`MEDIA_URL`; DEBUG-only media serving; Django storage APIs remain replaceable by a future object backend.
- Safe current-user response: registration, login, and GET `/api/v1/me/` include nullable absolute/request-aware `avatar_url`, preserve capabilities, and expose no raw storage filename or Django permission fields.
- PATCH `/api/v1/me/`: session-authenticated and CSRF-protected; only `display_name` and `preferred_ui_language`; omitted fields remain unchanged; language uses existing choices; response is the complete safe current-user shape.
- PUT `/api/v1/me/avatar/`: session-authenticated, CSRF-protected, multipart-only `avatar`; JPEG/PNG/WebP content only; 5 MiB maximum; 200 response `{ "avatar_url": ... }`.
- DELETE `/api/v1/me/avatar/`: session-authenticated, CSRF-protected, idempotent 204; clears the account field.
- Replacement/removal: old storage name/backend captured before mutation; old object deletion scheduled with `transaction.on_commit()` after the database update. Invalid replacement leaves the existing avatar and file untouched.
- Rejections covered: anonymous requests, unsafe requests without CSRF, JSON/non-multipart upload, GIF, BMP, corrupt bytes, and >5 MiB uploads.
- Tests: focused accounts 73/73; full backend 372/372.
- Checks: Django check passed; no migration drift; pip check clean; diff check clean.
- Live smoke: complete current-account/avatar lifecycle passed and disposable data/files were cleaned.
- Frontend: no frontend file staged or task-modified; robust pre/post hash `2531cfb06e78e154006d2d920ea38ff5fe96e1585fff45a1fa978f9b3aa6a05c`.
- External teaching notes were appended and remain outside Git.
