# Street Meeting Poland — Street Show

Strona wydarzenia motoryzacyjnego "Street Show" + panel logowania dla użytkowników i administratora.

Projekt jest w trakcie migracji ze starej statycznej strony (HTML/JS w katalogu głównym, `index.html`, `js/`, `css/`) na **React + Vite** (`frontend/`) z osobnym backendem **Node/Express + SQLite** (`backend/`).

## Status migracji (co jest zrobione)

| Obszar                                                              | Status                                                                                                                                 | Gdzie                                                                                                  |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Szkielet React + Vite                                               | ✅ gotowe                                                                                                                              | `frontend/`                                                                                            |
| Logowanie / rejestracja (JWT w httpOnly cookies)                    | ✅ gotowe                                                                                                                              | `backend/src/auth/`, `frontend/src/context/AuthContext.jsx`                                            |
| Rola administratora + panel zarządzania użytkownikami               | ✅ gotowe                                                                                                                              | `backend/src/admin/routes.js`, `frontend/src/pages/AdminPage.jsx`                                      |
| Strona główna (hero, event, podgląd galerii, kontakt)               | ✅ zmigrowane do React                                                                                                                 | `frontend/src/pages/HomePage.jsx`                                                                      |
| Galeria (pełna, z lightboxem, dane z Google Drive)                  | ✅ zmigrowane do React                                                                                                                 | `frontend/src/pages/GalleryPage.jsx`                                                                   |
| FAQ (akordeon)                                                      | ✅ zmigrowane do React                                                                                                                 | `frontend/src/pages/FaqPage.jsx`                                                                       |
| Regulamin (długi tekst prawny)                                      | ✅ zmigrowane do React (1:1 skopiowana treść)                                                                                          | `frontend/src/pages/RegulaminPage.jsx`                                                                 |
| Zgłoszenia "Strefa Select" powiązane z kontem użytkownika           | ✅ gotowe (zdjęcia + status pending/approved/rejected, akceptacja w panelu admina)                                                     | `backend/src/submissions/`, `frontend/src/pages/DashboardPage.jsx`, `frontend/src/pages/AdminPage.jsx` |
| Publiczny formularz zgłoszeniowy na stronie głównej (bez logowania) | ⚠️ celowo zamknięty (tak jak w produkcji) — istnieje stary endpoint `/upload` (Google Sheets/Drive), ale sekcja na stronie jest ukryta | `frontend/src/pages/HomePage.jsx` (sekcja `#form`)                                                     |
| Wdrożenie na mikrus / hostinger.pl                                  | ❌ jeszcze nie zrobione                                                                                                                | —                                                                                                      |

Stare pliki w katalogu głównym (`index.html`, `faq.html`, `galeria.html`, `regulamin.html`, `js/`, `css/`) to **poprzednia wersja statyczna** — zostawione jako referencja/kopia zapasowa. Docelowo cały ruch ma iść przez `frontend/`. Nie edytuj ich dalej — źródłem prawdy jest teraz `frontend/`.

## Struktura repo

```
frontend/           # React + Vite (SPA) — cały frontend produktu
  src/
    pages/          # HomePage, GalleryPage, FaqPage, RegulaminPage, LoginPage, RegisterPage, DashboardPage, AdminPage
    components/     # Layout (navbar+footer wspólny), ProtectedRoute
    context/        # AuthContext (stan zalogowania, login/register/logout)
    api/client.js   # axios z auto-odświeżaniem tokenu przy 401
  public/           # statyczne assety serwowane 1:1 (img/, css/custom.css, manifest, robots, sitemap)

backend/            # Node.js + Express
  server.js         # główny plik serwera, montuje wszystkie routery
  src/
    auth/           # rejestracja/logowanie/refresh/logout, JWT, middleware
    admin/          # zarządzanie użytkownikami + akceptacja zgłoszeń (rola "admin")
    submissions/    # zgłoszenia do strefy Select (upload zdjęć, status)
    db/             # SQLite (better-sqlite3): users, refresh_tokens, submissions
    utils/          # rate limiter
  scripts/
    create-admin.js # tworzenie/nadawanie roli administratora z CLI
    sync-gallery-from-drive.js  # synchronizacja galerii z Google Drive (istniejąca funkcja sprzed migracji)
  data/             # plik SQLite (app.sqlite) — generowany, w .gitignore
  uploads/submissions/  # zdjęcia zgłoszeń użytkowników — generowane, w .gitignore
  config/.env       # sekrety i konfiguracja (Google API, JWT, CORS) — w .gitignore
```

## Jak uruchomić lokalnie

Wymagany Node.js 18+ (używane 20/24 w trakcie developmentu).

### Backend

```bash
cd backend
npm install
npm run start        # startuje na http://localhost:33000
```

Backend czyta konfigurację z `backend/config/.env` (Google Drive dla synchronizacji galerii, oraz `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`). Plik już istnieje lokalnie z wygenerowanymi sekretami — **nie commitować** (jest w `.gitignore`).

Powiadomienia e-mail o zaakceptowaniu lub odrzuceniu zgłoszenia wymagają konfiguracji SMTP w tym samym pliku:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=adres@example.com
SMTP_PASSWORD=haslo-aplikacji
SMTP_FROM=Street Show <adres@example.com>
SELECT_FEE_AMOUNT=150 zł
```

Brak konfiguracji SMTP nie blokuje zmiany statusu zgłoszenia — powiadomienie zostanie pominięte i zapisane w logu backendu. **Reset hasła („Nie pamiętasz hasła?”) działa tylko ze skonfigurowanym SMTP.** Kwotę opłaty można też ustawić w panelu admina (Ustawienia) — ma pierwszeństwo przed `SELECT_FEE_AMOUNT`.

Pozostałe (opcjonalne) zmienne:

```env
APP_URL=https://www.streetshow.pl      # do linków w e-mailach (reset hasła, panel)
ADMIN_NOTIFY_EMAIL=org@example.com    # e-mail(e) organizatorów o każdym nowym zgłoszeniu, po przecinku
TRUST_PROXY=loopback                  # nginx na tym samym serwerze; liczba hopów, jeśli przed nginx jest kolejne proxy
BACKUP_DIR=/root/streetshow-backups   # domyślnie backend/backups
BACKUP_KEEP=14                        # ile dziennych kopii bazy trzymać
BACKUP_DISABLED=false
DRIVE_GALLERY_FOLDER_ID=...           # folder Google Drive z pełną galerią (+ GOOGLE_* z kontem serwisowym)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build          
```

### Utworzenie/nadanie roli administratora

Rejestracja publiczna zawsze tworzy rolę `user`. Admina nadaje się przez skrypt CLI w backendzie:

```bash
cd backend
node scripts/create-admin.js <email> <haslo min.8 znakow> [Imię] [Nazwisko]
```

Jeśli użytkownik o tym e-mailu już istnieje, skrypt tylko podnosi mu rolę do `admin` (nie zmienia hasła).

> Nie zapisuj w repozytorium danych logowania (nawet testowych) — utwórz własne konto lokalnie skryptem powyżej.

## Architektura logowania (skrót dla AI/dewelopera)

- Backend: `bcryptjs` (hashowanie haseł), `jsonwebtoken` (access token 15 min + refresh token 30 dni, rotowany przy odświeżeniu), tokeny w **httpOnly cookies** (`access_token`, `refresh_token` — ten drugi tylko na ścieżce `/api/auth`). Refresh tokeny trzymane (hash) w tabeli `refresh_tokens` żeby móc je unieważnić (np. przy blokadzie konta).
- Baza danych: **SQLite** (`better-sqlite3`), plik `backend/data/app.sqlite`. Wybrana celowo — zero zależności od zewnętrznego serwera DB, żeby dało się to łatwo przenieść zarówno na VPS (mikrus), jak i na hosting (hostinger.pl), o ile tam też będzie działał Node.js.
- Role: `user` i `admin` w kolumnie `users.role`. Middleware `requireRole("admin")` chroni `/api/admin/*`.
- Frontend: `AuthContext` trzyma zalogowanego użytkownika (pobiera `/api/auth/me` przy starcie), `ProtectedRoute` blokuje dostęp do `/panel` (zalogowani) i `/admin` (tylko rola admin).

## Zgłoszenia "Strefa Select" (skrót dla AI/dewelopera)

- Zalogowany użytkownik może mieć do **5 aktywnych zgłoszeń pojazdów** (nieodrzuconych; limit zmienialny w panelu admina → Ustawienia). Każde zgłoszenie: dane pojazdu + do **5 zdjęć, łącznie max 50 MB** (pojedyncze zdjęcie może zająć cały limit).
- Dozwolone formaty: JPG, PNG, WEBP, AVIF. Backend nadaje własną nazwę i rozszerzenie pliku oraz sprawdza zawartość (magic bytes) — plik HTML/SVG udający obraz jest odrzucany (`backend/src/utils/imageUpload.ts`).
- Zdjęcia trafiają do `backend/uploads/submissions/<userId>/`, ale **nie są publiczne**: serwuje je `GET /api/submissions/photos/:userId/:plik` tylko właścicielowi i adminom.
- Użytkownik może edytować lub wycofać zgłoszenie, dopóki jest `pending`. Może też pobrać swoje dane i usunąć konto (Ustawienia konta, RODO).
- Admin: akceptacja/odrzucenie pojedynczo lub zbiorczo, komentarz dla uczestnika + notatka wewnętrzna, potwierdzanie opłat, usuwanie zgłoszeń, eksport do Excela, otwieranie/zamykanie zapisów z terminem.
- Stary publiczny formularz (`POST /upload` z Google Sheets/Drive) został usunięty z backendu.

## Bezpieczeństwo (skrót)

- `helmet` (nagłówki bezpieczeństwa, `nosniff`) na API; rola i blokada konta sprawdzane w bazie przy każdym żądaniu (zablokowanie działa natychmiast).
- Rate limit liczony po `req.ip` z `trust proxy` — nagłówek `X-Forwarded-For` od klienta nie pozwala go obejść.
- Linki i obrazy w CMS muszą zaczynać się od `https://`, `http://`, `/` lub `#` (blokada `javascript:`).
- Codzienna kopia bazy SQLite do `backend/backups/` (`npm run backup` ręcznie). **To nie zastępuje kopii poza serwerem** — kopiuj `backups/` i `uploads/` gdzie indziej (np. rclone/rsync z crona).
- nginx: `/api` przekazuj do backendu z `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, a **nie serwuj katalogu `backend/uploads/submissions` bezpośrednio** (tylko `/uploads/content`, jeśli w ogóle — backend robi to sam).

## Plany pod wdrożenie (mikrus / hostinger.pl)

Backend jest zwykłym Node/Express (bez zależności od Azure Functions w nowym kodzie auth/submissions), więc powinien działać identycznie na VPS (mikrus) i na hostingu z obsługą Node.js (hostinger — wymaga planu VPS/Cloud lub hostingu z Node, zwykły shared hosting z samym PHP nie wystarczy). Do zrobienia przed wdrożeniem:

- Osobne sekrety `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` per środowisko.
- Proces trzymający backend przy życiu (PM2 / systemd) + reverse proxy (nginx) serwujący `frontend/dist` i przekazujący `/api` i `/uploads` do backendu.
- Backup katalogu `backend/data/` (baza SQLite) i `backend/uploads/`.
