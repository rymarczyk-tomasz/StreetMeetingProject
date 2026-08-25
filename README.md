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

Backend czyta konfigurację z `backend/config/.env` (Google Sheets/Drive dla starego `/upload` i galerii, oraz `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`). Plik już istnieje lokalnie z wygenerowanymi sekretami — **nie commitować** (jest w `.gitignore`).

### Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173, proxy /api i /uploads -> backend :33000
npm run build          # build produkcyjny do frontend/dist
```

### Utworzenie/nadanie roli administratora

Rejestracja publiczna zawsze tworzy rolę `user`. Admina nadaje się przez skrypt CLI w backendzie:

```bash
cd backend
node scripts/create-admin.js <email> <haslo min.8 znakow> [Imię] [Nazwisko]
```

Jeśli użytkownik o tym e-mailu już istnieje, skrypt tylko podnosi mu rolę do `admin` (nie zmienia hasła).

## Dane testowego konta administratora (środowisko lokalne/dev)

> Utworzone lokalnie poleceniem `create-admin.js` podczas developmentu. Zmień hasło (lub usuń konto i utwórz nowe) przed wdrożeniem produkcyjnym.

- **URL logowania:** `/logowanie`
- **E-mail:** `admin@streetshow.pl`
- **Hasło:** `AdminStreet2026`

## Architektura logowania (skrót dla AI/dewelopera)

- Backend: `bcryptjs` (hashowanie haseł), `jsonwebtoken` (access token 15 min + refresh token 30 dni, rotowany przy odświeżeniu), tokeny w **httpOnly cookies** (`access_token`, `refresh_token` — ten drugi tylko na ścieżce `/api/auth`). Refresh tokeny trzymane (hash) w tabeli `refresh_tokens` żeby móc je unieważnić (np. przy blokadzie konta).
- Baza danych: **SQLite** (`better-sqlite3`), plik `backend/data/app.sqlite`. Wybrana celowo — zero zależności od zewnętrznego serwera DB, żeby dało się to łatwo przenieść zarówno na VPS (mikrus), jak i na hosting (hostinger.pl), o ile tam też będzie działał Node.js.
- Role: `user` i `admin` w kolumnie `users.role`. Middleware `requireRole("admin")` chroni `/api/admin/*`.
- Frontend: `AuthContext` trzyma zalogowanego użytkownika (pobiera `/api/auth/me` przy starcie), `ProtectedRoute` blokuje dostęp do `/panel` (zalogowani) i `/admin` (tylko rola admin).

## Zgłoszenia "Strefa Select" (skrót dla AI/dewelopera)

- Zalogowany użytkownik na `/panel` może wysłać **jedno aktywne** zgłoszenie (dane pojazdu + do 5 zdjęć, max 50MB łącznie) — blokada przy statusie `pending` lub `approved`.
- Zdjęcia trafiają na dysk serwera do `backend/uploads/submissions/<userId>/` (nie do Google Drive — to osobny, prostszy mechanizm niż stary publiczny formularz).
- Admin w `/admin` widzi wszystkie zgłoszenia z danymi zgłaszającego, podglądem zdjęć i przyciskami Zaakceptuj/Odrzuć (`PATCH /api/admin/submissions/:id/status`).
- Stary, publiczny (bez logowania) formularz zgłoszeniowy na stronie głównej (`POST /upload`, integracja z Google Sheets/Drive) nadal istnieje w kodzie backendu, ale sekcja `#form` na stronie głównej jest **celowo zamknięta** (komunikat "Zgłoszenia do strefy Select są obecnie zamknięte"), zgodnie ze stanem produkcyjnym w momencie migracji.

## Plany pod wdrożenie (mikrus / hostinger.pl)

Backend jest zwykłym Node/Express (bez zależności od Azure Functions w nowym kodzie auth/submissions), więc powinien działać identycznie na VPS (mikrus) i na hostingu z obsługą Node.js (hostinger — wymaga planu VPS/Cloud lub hostingu z Node, zwykły shared hosting z samym PHP nie wystarczy). Do zrobienia przed wdrożeniem:

- Osobne sekrety `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` per środowisko.
- Proces trzymający backend przy życiu (PM2 / systemd) + reverse proxy (nginx) serwujący `frontend/dist` i przekazujący `/api` i `/uploads` do backendu.
- Backup katalogu `backend/data/` (baza SQLite) i `backend/uploads/`.
