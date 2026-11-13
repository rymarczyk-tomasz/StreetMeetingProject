# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Street Show is the website and management system for a car event: participant accounts, "Strefa Select" vehicle submissions, manual payment verification, QR entry passes with an offline gate screen, an admin panel and a CMS. The UI, user-facing strings, e-mails and most docs are in **Polish**. Longer docs: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) (architecture, config) and [DEPLOYMENT.md](DEPLOYMENT.md) (production checklist).

## Commands

Two independent npm projects, `backend/` and `frontend/`. There is no root package.json.

```bash
# backend (Express API, http://localhost:33000)
cd backend
npm run build                 # tsc → dist/ (required before npm start, after every backend change)
npm start                     # node dist/server.js
npm test                      # node:test + tsx + supertest, all files in test/
node --import tsx --test test/auth.test.ts                                     # one file
node --import tsx --test --test-name-pattern="usuwanie konta" test/account.test.ts   # one test/suite
node dist/scripts/create-admin.js <email> <password>                          # create or promote an admin (password ≥ 12)
node dist/scripts/reset-2fa.js <email>                                        # turn off an admin's 2FA (lost phone + codes)

# frontend (React + Vite, http://localhost:5173, proxies /api and /uploads to :33000)
cd frontend
npm run dev
npm run build                 # tsc -b && vite build (typechecks test files too)
npm run lint                  # oxlint (warnings only, exit 0 is expected)
npm test                      # vitest run (src/**/*.test.ts)
npx vitest run -t "plural"    # one test by name

# e2e (Playwright, real Chromium; needs backend built first: cd backend && npm run build)
cd e2e
npx playwright install chromium          # once
npx playwright test                      # whole suite, starts its own backend + Vite
npx playwright test account --project=desktop   # one file, desktop only
npx playwright test --headed --debug     # watch / step through
```

Backend config lives in `backend/config/.env` (gitignored): JWT secrets, `SMTP_*`, `ADMIN_NOTIFY_EMAIL`, `APP_URL`, Google Drive credentials. Without SMTP, e-mails are skipped and logged, nothing else breaks.

CI: `.github/workflows/checks.yml` (backend build + tests, frontend lint + build + tests, Playwright e2e) is shared by `ci.yml` (every branch except `newProject`, PRs) and `deploy.yml` (push to `newProject`: checks, then deploy over SSH (pm2 `streetshow-api`, healthcheck `/api/health`). **Pushing to `newProject` deploys to production.** The server is set up once with `deploy/setup.sh` (Ubuntu 24.04, user `streetshow`, nginx config and CSP in `deploy/nginx/`, behind Cloudflare); the deploy target comes from repo secrets/variables `DEPLOY_*`. Icons (bootstrap-icons) and the font are bundled npm packages imported in `frontend/src/main.tsx` — the CSP allows no external hosts, so don't add CDN links.

## Backend architecture

- **CommonJS in TypeScript.** Source files use `require`/`module.exports`, `strict: false`. Keep that style; don't convert files to ES imports.
- `app.ts` builds the Express app (no side effects beyond loading modules). `server.ts` loads `config/.env`, calls `listen` and starts background jobs (`gallery/sync.ts` daily sync, `maintenance.ts`: token pruning, hourly payment reminders, daily DB backup, daily photo retention from `retention.ts`). Tests import `app.ts` only.
- **SQLite via better-sqlite3, synchronous.** `src/db/database.ts` opens `<cwd>/data/app.sqlite` and holds the whole schema plus inline, idempotent migrations (`PRAGMA table_info` checks, table rebuilds for CHECK changes). New columns go there. Each `src/db/*.ts` module prepares its statements at import time and exposes plain functions. Rows are snake_case; routes map them to camelCase (`toPublicSubmission`, `toAdminSubmission`, `toPublicUser`).
- Paths depend on `process.cwd()` (`data/`, `uploads/`, `backups/`, `config/.env`), so the backend must be run from `backend/`.
- Routers per domain in `src/<domain>/routes.ts`, mounted in `app.ts` under `/api/*`. Auth uses httpOnly cookies: `access_token` (15 min JWT) and `refresh_token` (30 days, path `/api/auth`, stored hashed, rotated on refresh). `auth/middleware.ts` re-reads the user from the DB on every request, so bans and role changes apply immediately. Access guards: `authenticate`, `requireRole("admin")` (whole `/api/admin` router), `requireCheckInAccess` (admins or users with the `gate_staff` flag, for `/api/gate`).
- **Admin hardening:** admins must use two-step login (TOTP, `src/auth/totp.ts`, `src/db/twoFactor.ts`). `requireRole("admin")` answers 403 `two_factor_setup_required` until it's on, and the frontend `AdminPage` shows `TwoFactorSetup` instead of the panel. Login with 2FA returns `{ twoFactorRequired, challenge }` (JWT signed with a derived key, so it can't act as a session), then `POST /auth/login/2fa`. Codes can't be replayed (`totp_last_step`); 10 one-time recovery codes are stored hashed. Sensitive admin actions call `confirmStepUp(req, res)` (`src/auth/stepUp.ts`): changing payment fields in `settings` (also via revision restore), granting admin, group e-mails, date-subscriber mailing, resetting someone's 2FA. Without `body.stepUp = { password, code }` they answer 403 `step_up_required`, and the frontend's `withStepUp()` (`src/api/stepUp.ts` + `StepUpDialog`) asks and retries. Payment changes, new admins and 2FA resets e-mail all admins (`sendSecurityAlertEmail`). Admin passwords need 12+ characters.
- State-changing `/api` requests with an `Origin` header that is neither in `CORS_ORIGINS` nor the request's own host get 403 (`app.ts`), on top of SameSite=Lax cookies. `revokeAllUserTokens` also stamps `users.sessions_revoked_at`, and `auth/middleware.ts` refuses access tokens issued before it, so "log out everywhere" and password changes cut existing sessions immediately. Anything that grants admin rights outside `requireRole("admin")` must use `isFullAdmin(req.user)` (admin **with** 2FA on), not a bare role check.
- Ownership checks return **404, not 403** for other users' resources (`findOwnSubmission`). Tests rely on that.
- **Editions:** submissions belong to an event year (`siteContentDb.getCurrentEdition()` from the `edition` CMS section). Limits, stats, passes and gate lists are per edition.
- **Submission lifecycle:** `status` ∈ pending / approved / waitlist / rejected / withdrawn. Users can edit or delete only `pending` ones. `payment_status` ∈ unpaid / verification / paid. There is no payment gateway: the user uploads proof or clicks "paid" (→ `verification`), and only an admin sets `paid`, which unlocks the pass (`GET /submissions/:id/pass`) and gate check-in. Deadlines and overdue logic are in `src/payments.ts` (dates use Polish midnight, `Europe/Warsaw`).
- **Photo retention** (`src/retention.ts`): photos, showcase copies and the payment proof are deleted 12 months after the event for `approved` submissions and 30 days after it for every other status; the row stays with `files_purged_at` set. Event dates per edition live in `edition_dates` (written by `saveContent("edition")`); a past year without a date counts from Dec 31, the current edition without a date is left alone.
- Submitting requires a verified e-mail when SMTP is configured (`getAvailability` in `submissions/routes.ts` returns `emailUnverified`). Account deletion is blocked while the user has an approved, paid or verifying place in the current edition.
- **CMS:** every editable section is a key in `site_content` with defaults in `content/defaults.ts` (saved JSON is merged over the defaults) and a validator in `content/validators.ts` (unknown fields are dropped, URLs checked with `isSafeUrl`, rich text cleaned with `utils/html.ts` sanitize-html). Runtime settings (fees, limits, deadlines, capacity) are the `settings` section, read through `siteContentDb.getSettings()`.
- **E-mails:** all templates are in `notifications/email.ts` and sent fire-and-forget (`void send…().catch(log)`) after the DB change. User-controlled text must go through `escapeHtml`. Organizer notifications go to `ADMIN_NOTIFY_EMAIL`. Links use `getAppUrl()` (`APP_URL`), which is also baked into QR passes, so it must not change after passes are issued.
- Uploads: `utils/imageUpload.ts` (multer + magic-byte verification + renaming). Submission and garage photos then go through `processUploadedImages` (sharp: EXIF orientation applied, all metadata dropped, longest edge capped at 4000 px, JPEG/WebP quality 92, PNG lossless, AVIF stored as JPEG); upload handlers that await it are wrapped in `asyncHandler`. Failed logins are counted per e-mail + IP (10 → that address is locked for 15 min) and per e-mail overall (100), see `auth/loginThrottle.ts`. Submission photos and payment proofs are private and served only through owner/admin-checked routes. Admin actions are written to `audit_log` via `auditLogDb`.

## Backend tests

Admins created by `createUser({ role: "admin" })` get 2FA enabled (pass `twoFactor: false` to test the setup gate); `totpCode(user)` / `stepUpFor(user)` produce codes the server still accepts.

`backend/test/helpers.ts` must be the first import in every test file. It `chdir`s into a fresh temp dir (own SQLite DB and uploads; the real `data/` is never touched), sets JWT secrets, and replaces `nodemailer.createTransport` with a fake that collects every message in `mails` (`mailsTo(address)`). It also provides:
- `createUser({ role, gateStaff, verified })`: inserted directly, e-mail verified by default,
- `createSubmission(user, { status, paymentStatus, ...columns })`,
- `api(user)`: supertest client with a signed session cookie and a unique `X-Forwarded-For` per client, so per-IP rate limiters don't interfere,
- `saveSettings(patch)`.

Each test file runs in its own process. Assert e-mails through `mails`/`mailsTo` and reset with `mails.length = 0` in `beforeEach`. `smtp.down = true` makes every send fail (reset it in `finally`).

## E2E tests

`e2e/` is its own npm package. `playwright.config.ts` starts `start-backend.cjs` (requires `backend/dist`; temp data dir, admin with a fixed TOTP secret from `config.cjs` — `login(page, …, totpSecret)` and `confirmStepUp(page)` compute codes, payment settings and one partner seeded, fake SMTP) on port 33100, plus Vite on 5199 with `API_TARGET` pointing the proxy at it, so it runs alongside a normal dev setup. Sent e-mails are readable at `http://localhost:33101/mails?to=…` and the last accepted 2FA step at `/totp-step?email=…` (so `totpCode` never offers a code the server already used — admin steps may wait up to 30 s, hence the 120 s test timeout); tests follow links from them (`waitForMail`, `linkFrom` in `tests/fixtures.ts`). The suite runs serially against one shared DB, so use `uniqueEmail()` for new accounts. Every browser context gets its own `X-Forwarded-For` so the per-IP login limiter doesn't trip. The `consoleErrors` fixture fails a test on uncaught page errors. Selectors use Polish labels and button texts, so renaming UI text means updating the specs.

## Frontend architecture

- React 19 SPA, routes in `src/App.tsx`. `context/AuthContext.tsx` (`AuthProvider`) loads `/api/auth/me` on start; components import `useAuth` from `context/auth.ts`. Lint is kept at zero warnings: `.tsx` files export only components (helpers/hooks go to `.ts` files such as `pages/admin/shared.ts`, `templateData.ts`, `useContentEditor.ts`), and effects don't set state synchronously — loaders set state inside promise callbacks (`api.get(...).then(...)`). `components/ProtectedRoute` guards `/panel`, `/admin` and `/wjazd`.
- `src/api/client.ts` is an axios instance on `/api` that refreshes the session on a 401 (`POST /auth/refresh`) and replays queued requests. `useContent(keys)` in `api/content.ts` fetches CMS sections.
- Admin panel: `pages/admin/`, one file per tab, routed by `/admin/:sekcja`. Participant panel pieces: `pages/panel/`.
- Gate (`components/GateCheckin.tsx` + `utils/gateOffline.ts`) works offline. It caches the car list in localStorage with SHA-256 hashes of pass codes and queues check-ins with their original time. Pass code formats (QR link, `SSP-<24 hex>`, 8-char short code) must stay in sync between `utils/gateOffline.ts#tokenFromCode` and `backend/src/gate/routes.ts#findByPassCode`.
- Styles: `src/App.css` and `public/css/custom.css` (design tokens, version-hashed at build by a plugin in `vite.config.ts`).
- Frontend tests cover pure helpers in `src/utils`. Use `// @vitest-environment jsdom` for code that needs DOM or localStorage.
