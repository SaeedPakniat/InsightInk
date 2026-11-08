# Backend State

- BE-ACCOUNT-AVATAR-001 status: Complete; implementation committed and verified, backend checkpoint documentation ready to commit.
- Exact base SHA: `0ae6e5ecdf9e720f5c73b8db77c78fad44d079e9`.
- Exact implementation commit SHA: `c9ad9f67357fdfe4eae43740f31927b2fc0007a0`.
- Universal avatar ownership: optional `accounts.User.avatar` `ImageField`, stored under `user_avatars/`; no `UserProfile` model and no reuse of `CreatorProfile.avatar`.
- Dependency: `Pillow==13.0.0`, verified for the project Python 3.14.9 environment; no unrelated dependency upgrades.
- Development media: `MEDIA_ROOT = BASE_DIR / "media"`, `MEDIA_URL = "/media/"`, normal Django filesystem storage, and DEBUG-only media URL serving. No production object-storage service was introduced.
- Current-account representation: registration, login, and `GET /api/v1/me/` return `id`, `email`, `display_name`, `preferred_ui_language`, nullable request-aware `avatar_url`, and existing bounded `capabilities`; Django auth internals remain absent.
- Metadata update: authenticated, CSRF-protected `PATCH /api/v1/me/` has partial-update semantics and permits only `display_name` and `preferred_ui_language`; email, avatar, passwords, capabilities, roles, groups, and permissions are not writable.
- Avatar upload: authenticated, CSRF-protected, multipart-only `PUT /api/v1/me/avatar/` accepts the `avatar` field and returns only `avatar_url` with HTTP 200.
- Validation: actual image content is checked with Django/Pillow; JPEG, PNG, and WebP are accepted up to 5 MiB; GIF, BMP/other formats, corrupt/non-image data, and oversized files return normal validation errors.
- Safe lifecycle: replacement saves the new file/reference first and schedules deletion of the previous storage object with `transaction.on_commit()`; failed validation preserves the current reference and file. `DELETE /api/v1/me/avatar/` clears/deletes after commit, returns 204, and is idempotent.
- Migration: `accounts.0007_user_avatar`, applied successfully to the development database; migration contains only the avatar field addition.
- Focused account suite: 73/73 passed.
- Full backend suite: 372/372 passed (previous baseline 357).
- Quality: `manage.py check` PASS; `makemigrations --check --dry-run` -> No changes detected; `.venv/bin/python -m pip check` -> No broken requirements; `git diff --check` PASS.
- Live disposable smoke: register/session+CSRF -> GET null avatar -> PATCH metadata -> PNG PUT -> GET same URL -> JPEG replacement with old file removed/new file retained -> DELETE 204 -> GET null avatar; disposable user and files cleaned up.
- Teaching notes: appended `BE-ACCOUNT-AVATAR-001 — Django File Storage and Safe Avatar Replacement` outside the repository without staging it.
- Frontend preservation: frontend work was already dirty at preflight and was neither modified by this task nor staged. Deterministic frontend filename/content hash before and after: `2531cfb06e78e154006d2d920ea38ff5fe96e1585fff45a1fa978f9b3aa6a05c`.
