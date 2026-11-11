# Street Show

Website and management system for **Street Show**, a car event held on the pitch of Polsat Plus Arena Gdańsk.
It started as a simple landing page and grew into a full application used by the organisers: participant accounts, vehicle applications, payments, QR entry passes, an admin panel and a CMS for every piece of content on the site.

**Live:** [streetshow.tojest.dev](https://streetshow.tojest.dev)

<p>
  <img src="docs/screenshots/home.jpg" alt="Home page" width="74%">
  <img src="docs/screenshots/home-mobile.jpg" alt="Home page on mobile" width="24%">
</p>

## What it does

### For participants

- Account with e-mail confirmation, password reset and GDPR data export / account deletion
- "Select zone" vehicle applications with up to 5 photos, a personal garage of saved cars and status tracking
- Message thread with the organisers on every application
- Entry pass with a QR code (also downloadable / shareable on the phone)
- "Notify me about the date" sign-up with double opt-in and one-click unsubscribe

### For organisers (admin panel)

- Dashboard with a to-do list and statistics for the current edition, post-event report with year-over-year comparison
- Application review: accept / reject / waitlist (single and bulk), 1–5 ratings from each admin, notes, comment templates, payment tracking with deadlines and automatic reminders, Excel export, group e-mails
- Gate check-in screen for staff: camera QR scanning, manual short codes, and **offline mode** – the car list is cached on the phone and check-ins are queued until the connection returns
- CMS for all sections of the site (rich-text editor, revision history with restore), Google Drive–backed photo gallery, user and role management, audit log, system status page

## Tech stack

| | |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, TipTap, service worker |
| Backend | Node.js, Express, TypeScript, SQLite (better-sqlite3) |
| Integrations | Google Drive API, Nodemailer (SMTP), sharp (image processing), SheetJS |
| Infrastructure | VPS (Mikrus) with nginx and Cloudflare, GitHub Actions CI/CD |

## Technical highlights

- **Auth** – JWT access + rotating refresh tokens in httpOnly cookies, refresh tokens stored hashed so sessions can be revoked; role and ban status checked against the database on every request.
- **Security** – helmet, rate limiting behind a trusted proxy, HTML sanitisation of CMS content, uploaded images verified by magic bytes and renamed, private photos served only to their owner and admins.
- **Offline-first gate** – the check-in page works without network: codes are matched against SHA-256 hashes stored locally, and queued entries sync with their original timestamps.
- **QR scanning on every phone** – native `BarcodeDetector` where available, lazily loaded `jsQR` fallback for iOS Safari.
- **Editions** – data is scoped per event year, so a new season starts with fresh limits and statistics while older years stay in the archive.
- **Gallery sync** – albums are folders on Google Drive; a background job downloads only new or changed files and generates WEBP thumbnails.
- **Deployment** – every push to the release branch builds both apps in GitHub Actions and deploys to the server over SSH; the database is backed up daily.

## Project structure

```
frontend/   React SPA – public pages, participant panel, admin panel
backend/    Express API – auth, submissions, gate, CMS, gallery, notifications
docs/       technical documentation (in Polish)
```

## Running locally

Requires Node.js 22.

```bash
# backend – http://localhost:33000
cd backend
npm install
npm run build
npm start

# frontend – proxies /api to the backend
cd frontend
npm install
npm run dev
```

Configuration lives in `backend/config/.env` (JWT secrets, SMTP, Google Drive). An admin account is created with `node scripts/create-admin.js <email> <password>`.

More details: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) (architecture, API, configuration) and [DEPLOYMENT.md](DEPLOYMENT.md) (production checklist). Both are in Polish.

## Author

Tomasz Rymarczyk – [GitHub](https://github.com/rymarczyk-tomasz)
