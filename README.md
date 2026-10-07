# Street Meeting Poland — Street Show

Strona wydarzenia motoryzacyjnego "Street Show": **React + Vite** (`frontend/`) i backend **Node/Express + SQLite** (`backend/`), z kontami użytkowników, zgłoszeniami do strefy Select i panelem administratora, w którym edytuje się całą treść strony.

## Co jest w panelu administratora

| Zakładka | Co tam jest |
| --- | --- |
| Dashboard | Statystyki bieżącej edycji: zgłoszenia, opłaty, wykres z 30 dni, najczęstsze marki, zapełnienie strefy Select |
| Raport | Podsumowanie edycji po wydarzeniu: opłaty, wjazdy, nieobecni, rezygnacje, przychód, przyjazdy wg godziny, porównanie lat (do druku) |
| Zgłoszenia | Filtr edycji (archiwum lat), akceptacja/odrzucenie/lista rezerwowa pojedynczo i zbiorczo, **oceny 1–5 od każdego admina**, **wątek wiadomości z uczestnikiem**, notatki, **szablony komentarzy**, opłaty, eksport do Excela, **lista na bramę do druku**, **wiadomość e-mail do grupy uczestników** |
| Użytkownicy | Role, blokada, wylogowanie ze wszystkich urządzeń |
| Galeria | Albumy z folderów Dysku Google (jeden folder = jeden album), synchronizacja, ukrywanie zdjęć, okładki, kolejność |
| Treści strony | Home (z leadem pod tytułem), „Co Cię czeka” (1–6 kafelków), **Strefa Select** (4 kroki „Jak to działa”), podgląd galerii, partnerzy, kontakt, **FAQ** i **regulamin** (edytor jak w Wordzie + PDF), pasek ogłoszeń. Każda sekcja ma **historię zmian** z przywracaniem |
| Ustawienia | **Edycja wydarzenia** (rok, data, godziny, miejsce), **lista „Powiadom o dacie”** (eksport CSV, wysyłka e-maila do zapisanych), zapisy do Select (otwarte/zamknięte, termin, limity, kwota i termin opłaty, strona „Auta strefy Select”) oraz **szablony wiadomości** |
| Dziennik działań | Kto, co i kiedy zmienił |
| System | Stan kopii bazy, SMTP (z testowym e-mailem), APP_URL, galerii, miejsca na dysku i rozmiaru danych |

## Struktura repo

```
frontend/                 # React + Vite (SPA)
  src/
    pages/                # strony publiczne i panel użytkownika
    pages/admin/          # panel administratora (każda zakładka w osobnym pliku)
    components/           # Layout (nawigacja, menu konta, stopka), PageHeader, AuthLayout, Plate, EntryPass, Lightbox, RichTextEditor (TipTap), ProtectedRoute
    api/                  # axios z odświeżaniem sesji, useContent() do treści z CMS
    utils/                # edycja wydarzenia, wklejanie list z Worda, odmiana liczebników
  public/                 # statyczne assety (img/, css/custom.css — tokeny i style redesignu, manifest, robots, sitemap)

backend/                  # Node.js + Express (TypeScript → dist/)
  server.ts               # montuje routery, publiczne API treści i galerii
  src/
    auth/                 # rejestracja, logowanie, reset hasła, usuwanie konta, JWT
    admin/                # API panelu administratora
    submissions/          # zgłoszenia Select (zdjęcia prywatne, limity per edycja)
    vehicles/             # garaż użytkownika (zapisane auta do kolejnych zgłoszeń)
    gate/                 # wjazd na strefę Select (QR)
    messages/             # wątki wiadomości organizator ↔ uczestnik
    showcase/             # publiczna strona „Auta strefy Select”
    content/              # domyślne treści sekcji CMS + walidacja
    gallery/              # albumy z Dysku Google, miniatury WEBP (sharp), synchronizacja
    db/                   # SQLite (better-sqlite3)
    notifications/        # e-maile (nodemailer), lista „Powiadom o dacie”
    utils/                # walidacja, czyszczenie HTML, upload plików, rate limiter
  scripts/                # create-admin, backup-db
  data/                   # baza app.sqlite — w .gitignore
  uploads/                # zdjęcia zgłoszeń, pliki CMS, miniatury galerii — w .gitignore
  backups/                # dzienne kopie bazy — w .gitignore
  config/.env             # sekrety i konfiguracja — w .gitignore
```

## Jak uruchomić lokalnie

Wymagany Node.js 18+ (używane 20/24 w trakcie developmentu).

### Backend

```bash
cd backend
npm install
npm run build        # TypeScript → dist/ (po każdej zmianie w backendzie)
npm run start        # startuje na http://localhost:33000
```

Frontend w trybie dev (`npm run dev`) przekazuje `/api` i `/uploads` do `localhost:33000` — bez działającego backendu w konsoli Vite pojawiają się błędy `http proxy error … ECONNREFUSED`.

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
DRIVE_GALLERY_FOLDER_ID=...           # folder główny galerii na Dysku; jego podfoldery = albumy (+ GOOGLE_* konta serwisowego)
GALLERY_SYNC_DAILY_HOUR=3             # o której w nocy synchronizować galerię
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

- Każde zgłoszenie należy do **edycji** (roku) ustawionej w panelu → Ustawienia → Edycja wydarzenia. Zmiana roku (np. na 2028) zaczyna nowy sezon: limity i statystyki liczą się od zera, a starsze zgłoszenia są w archiwum (filtr „Edycja”). Zgłoszenia sprzed wprowadzenia edycji mają rok 2026.
- Zalogowany użytkownik może mieć do **5 aktywnych zgłoszeń pojazdów w edycji** (nieodrzuconych; limit zmienialny w panelu admina → Ustawienia). Każde zgłoszenie: dane pojazdu + do **5 zdjęć, łącznie max 50 MB** (pojedyncze zdjęcie może zająć cały limit).
- Dozwolone formaty: JPG, PNG, WEBP, AVIF. Backend nadaje własną nazwę i rozszerzenie pliku oraz sprawdza zawartość (magic bytes) — plik HTML/SVG udający obraz jest odrzucany (`backend/src/utils/imageUpload.ts`).
- Zdjęcia trafiają do `backend/uploads/submissions/<userId>/`, ale **nie są publiczne**: serwuje je `GET /api/submissions/photos/:userId/:plik` tylko właścicielowi i adminom.
- Użytkownik może edytować lub wycofać zgłoszenie, dopóki jest `pending`. Może też pobrać swoje dane i usunąć konto (Ustawienia konta, RODO).
- Admin: akceptacja/odrzucenie pojedynczo lub zbiorczo, komentarz dla uczestnika + notatka wewnętrzna, potwierdzanie opłat, usuwanie zgłoszeń, eksport do Excela, otwieranie/zamykanie zapisów z terminem.
- **Lista rezerwowa i limit miejsc:** statusy zgłoszenia to `pending`, `approved`, `rejected`, `waitlist` (lista rezerwowa — bez kolejki, admin sam wybiera auta do akceptacji) i `withdrawn` (rezygnacja). Przy ustawionej „Liczbie miejsc” akceptacja ponad limit wymaga potwierdzenia. Gdy są wolne miejsca, a lista rezerwowa nie jest pusta, Zgłoszenia pokazują alert z przyciskiem „Pokaż listę rezerwową”.
- **Rezygnacja:** uczestnik z zaakceptowanym zgłoszeniem lub na liście rezerwowej klika „Rezygnuję” (`POST /api/submissions/:id/withdraw`). Zgłoszenie zostaje w bazie jako `withdrawn`, a organizatorzy (`ADMIN_NOTIFY_EMAIL`) dostają e-mail. Admin może też sam oznaczyć rezygnację.
- **Termin opłaty:** liczony per zgłoszenie (`backend/src/payments.ts`) jako wcześniejszy z dwóch: stały „Termin płatności” albo „Dni na opłatę od akceptacji”. 3 dni przed terminem uczestnik dostaje jedno przypomnienie e-mailem (`backend/src/submissions/paymentReminders.ts`, sprawdzane co godzinę, wysyłka 9–20 czasu polskiego). Zgłoszenia po terminie mają filtr „Po terminie płatności” i grupę odbiorców w wiadomościach.
- Stary publiczny formularz (`POST /upload` z Google Sheets/Drive) został usunięty z backendu.

## Wjazd na strefę Select (QR)

- Po akceptacji i potwierdzeniu opłaty uczestnik ma w panelu wejściówkę z kodem QR. Kod zawiera link `APP_URL/wjazd?kod=SSP-…`, więc skanuje go zwykły aparat w każdym telefonie.
- Obsługa bramy: admin nadaje w Użytkownicy uprawnienie **„Obsługa wjazdu”**. Taka osoba po zalogowaniu widzi tylko `/wjazd` (wynik skanu, rejestrację wjazdu i listę aut bez telefonów/e-maili) i nie ma dostępu do panelu admina. Admini mają ten sam ekran w Panel admina → Wjazd.
- API: `/api/gate/*` (`backend/src/gate/routes.ts`), każdy wjazd trafia do dziennika działań z kontem osoby, która go zarejestrowała.
- **Tryb offline:** ekran wjazdu zapisuje w telefonie ostatnią listę aut (z hashem SHA-256 kodu wejściówki zamiast samego kodu), więc skan i wyszukiwanie działają bez zasięgu. Wjazdy bez sieci trafiają do kolejki (`src/utils/gateOffline.ts`) i wysyłają się same po powrocie internetu, z godziną faktycznego wjazdu. Service worker (`frontend/public/sw.js`, tylko build produkcyjny) pozwala otworzyć `/wjazd` bez sieci, jeśli telefon był na nim wcześniej zalogowany online. Przed wydarzeniem otwórz `/wjazd` na każdym telefonie z zasięgiem.
- Plan awaryjny bez telefonu: Zgłoszenia → „Lista na bramę (druk)”.

## Galeria (skrót dla AI/dewelopera)

- Albumy = foldery na Dysku Google. Podfoldery `DRIVE_GALLERY_FOLDER_ID` są wykrywane automatycznie (rok z nazwy, np. „StreetShow 2025”); zdjęcia leżące luzem w folderze głównym trafiają do albumu „Archiwum”. Inny folder można dodać linkiem w panelu. Folder musi być udostępniony kontu serwisowemu (`GOOGLE_CLIENT_EMAIL`) jako „Przeglądający”.
- Synchronizacja (`backend/src/gallery/sync.ts`) pobiera oryginał tylko dla nowych/zmienionych plików i zapisuje dwie wersje WEBP (480 px i 1600 px) w `backend/uploads/gallery/<album>/`. Usunięte z Dysku znikają ze strony. Działa w tle (panel pokazuje postęp) i codziennie w nocy. HEIC nie jest obsługiwany.
- Publicznie: `GET /api/gallery/albums`, `GET /api/gallery/albums/:id`; miniatury z długim cache (`/uploads/gallery/...?v=<wersja>`).

## Auta strefy Select i odliczanie

- Strona `/auta-select` (i zapowiedź na stronie głównej) pokazuje zaakceptowane auta bieżącej edycji, ale tylko te, których właściciele zaznaczyli w zgłoszeniu zgodę na publikację zdjęć. Domyślnie wyłączona — włącza się w Ustawieniach. Pojedyncze auto można ukryć w Zgłoszeniach.
- Publicznie widać tylko markę i zdjęcia (bez nazwisk, rejestracji i opisów). `GET /api/showcase` zwraca listę, a `GET /api/showcase/photos/:id/:n?w=480|1200` zmniejszone kopie WEBP bez EXIF (`backend/uploads/showcase/`). Każde żądanie ponownie sprawdza zgodę i widoczność, więc nie serwuj tego katalogu statycznie z nginx.
- Sekcja „Strefa Select” na stronie głównej (4 kroki z CMS) pobiera stan zapisów z `GET /api/select-status` (`open`, `reason`, `deadline`, `maxVehicles`, `edition`) i pokazuje odpowiedni przycisk.
- Na stronie głównej pod datą jest odliczanie do wydarzenia (`Countdown`), liczone z daty i godziny w sekcji Edycja.

## Powiadom o dacie

- Gdy w sekcji Edycja nie ma jeszcze daty, strona główna pokazuje formularz „Powiadom mnie o dacie” (`POST /api/notify`, wymagana zgoda, rate limit 5 / 15 min). Adresy trafiają do tabeli `date_subscribers`.
- Panel admina → Ustawienia: lista zapisanych, eksport CSV i wysyłka e-maila z datą (`/api/admin/date-subscribers*`). Mail ma nagłówek `List-Unsubscribe` i link do `/wypisz?token=…` (`POST /api/notify/unsubscribe`). Wymaga SMTP.

## Treści strony (CMS)

- Wszystkie sekcje są w tabeli `site_content` (domyślne wartości: `backend/src/content/defaults.ts`, walidacja: `validators.ts`). Każdy zapis trafia do `content_revisions` (30 ostatnich wersji na sekcję) i można go przywrócić z panelu.
- Publiczne API: `GET /api/content?keys=home,event,...` (kilka sekcji jednym zapytaniem) i `GET /api/content/:key`.
- FAQ i regulamin to HTML z edytora TipTap. Backend czyści go przy zapisie (`sanitize-html`, tylko nagłówki/listy/pogrubienia/linki). Listy wklejone z Worda (`mso-list`) są zamieniane na prawdziwe listy (`frontend/src/utils/wordPaste.ts`).
- Data i miejsce wydarzenia pochodzą z sekcji `edition`; strona główna generuje z nich też dane strukturalne `schema.org/Event` dla Google. Podgląd linku na Facebooku (Open Graph w `frontend/index.html`) jest celowo bez daty.

## Bezpieczeństwo (skrót)

- `helmet` (nagłówki bezpieczeństwa, `nosniff`) na API; rola i blokada konta sprawdzane w bazie przy każdym żądaniu (zablokowanie działa natychmiast).
- Rate limit liczony po `req.ip` z `trust proxy` — nagłówek `X-Forwarded-For` od klienta nie pozwala go obejść.
- Linki i obrazy w CMS muszą zaczynać się od `https://`, `http://`, `/` lub `#` (blokada `javascript:`).
- Codzienna kopia bazy SQLite do `backend/backups/` (`npm run backup` ręcznie). **To nie zastępuje kopii poza serwerem** — kopiuj `backups/` i `uploads/` gdzie indziej (np. rclone/rsync z crona).
- nginx: `sw.js` serwuj z `Cache-Control: no-cache` (inaczej telefony długo trzymają starą wersję), `/assets/*` może mieć długi cache.
- nginx: `/api` przekazuj do backendu z `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, a **nie serwuj katalogu `backend/uploads/submissions` bezpośrednio** (tylko `/uploads/content`, jeśli w ogóle — backend robi to sam).

## Plany pod wdrożenie (mikrus / hostinger.pl)

Pełna checklista przed uruchomieniem produkcyjnym (SMTP, `.env`, nginx, SSL, backupy, testy): [DEPLOYMENT.md](DEPLOYMENT.md).

Backend jest zwykłym Node/Express (bez zależności od Azure Functions w nowym kodzie auth/submissions), więc powinien działać identycznie na VPS (mikrus) i na hostingu z obsługą Node.js (hostinger — wymaga planu VPS/Cloud lub hostingu z Node, zwykły shared hosting z samym PHP nie wystarczy). Do zrobienia przed wdrożeniem:

- Osobne sekrety `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` per środowisko.
- Proces trzymający backend przy życiu (PM2 / systemd) + reverse proxy (nginx) serwujący `frontend/dist` i przekazujący `/api` i `/uploads` do backendu.
- Backup katalogu `backend/data/` (baza SQLite) i `backend/uploads/`.
