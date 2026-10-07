# Checklista przed wdrożeniem — Street Show

Wszystko, co trzeba zrobić, zanim strona ruszy produkcyjnie na `www.streetshow.pl`.
Konfiguracja backendu siedzi w `backend/config/.env` na serwerze (nie w repo).

## 1. E-mail (SMTP)

Bez SMTP nie działają: reset hasła, weryfikacja i zmiana adresu e-mail, powiadomienia o statusie zgłoszenia, przypomnienia o opłacie, wiadomości do grup uczestników, powiadomienia dla organizatorów, e-mail z datą do listy „Powiadom o dacie”.

- [ ] Założyć skrzynkę nadawczą (np. `kontakt@streetshow.pl` / `no-reply@streetshow.pl`) u dostawcy poczty domeny
- [ ] Wpisać do `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
  - port 587 → `SMTP_SECURE=false`, port 465 → `SMTP_SECURE=true`
  - przy Gmailu/Google Workspace: hasło aplikacji, nie zwykłe hasło
- [ ] DNS domeny: rekord **SPF**, **DKIM** i **DMARC** dla serwera pocztowego — inaczej maile lądują w spamie
- [ ] `ADMIN_NOTIFY_EMAIL` — adres(y) organizatorów, po przecinku
- [ ] Panel admina → System → wysłać testowy e-mail
- [ ] Przetestować na żywo: rejestracja, reset hasła, akceptacja zgłoszenia — sprawdzić, czy maile dochodzą (i nie do spamu) na Gmail, Onet, WP, Outlook

## 2. Zmienne środowiskowe (`backend/config/.env`)

- [ ] `NODE_ENV=production` — **wymagane**, bez tego ciasteczka logowania nie mają flagi `Secure`
- [ ] `JWT_ACCESS_SECRET` i `JWT_REFRESH_SECRET` — nowe, losowe, inne niż lokalnie (np. `openssl rand -hex 64`)
- [ ] `CORS_ORIGINS=https://www.streetshow.pl,https://streetshow.pl`
- [ ] `APP_URL=https://www.streetshow.pl` — linki w mailach i kody QR na wejściówkach; zmiana po wydaniu wejściówek psuje stare kody
- [ ] `PORT` — zgodny z nginx i healthcheckiem w `.github/workflows/deploy.yml` (tam: `4001`)
- [ ] `TRUST_PROXY=loopback` (nginx na tym samym serwerze)
- [ ] `SELECT_FEE_AMOUNT` albo kwota w panelu (Ustawienia — ma pierwszeństwo)
- [ ] Galeria: `DRIVE_GALLERY_FOLDER_ID` + dane konta serwisowego `GOOGLE_*` (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, …)
- [ ] Backupy: `BACKUP_DIR`, `BACKUP_KEEP`
- [ ] Panel admina → System: sprawdzić, czy wszystko świeci na zielono

## 3. Serwer i nginx

- [ ] Wybrać hosting (Mikrus albo Hostinger VPS/Cloud z Node.js — zwykły shared hosting z PHP nie wystarczy)
- [ ] Domena: rekordy A/AAAA na serwer, przekierowanie `streetshow.pl` → `www.streetshow.pl` (lub odwrotnie, ale spójnie z `APP_URL`)
- [ ] Certyfikat SSL (Let's Encrypt / certbot) z automatycznym odnawianiem + przekierowanie HTTP → HTTPS
- [ ] nginx serwuje `frontend/dist`, z fallbackiem SPA (`try_files $uri /index.html`)
- [ ] nginx: `/api` i `/uploads` → backend, z `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
- [ ] nginx: **nie** serwować bezpośrednio `backend/uploads/submissions`, `vehicles` ani `showcase` (prywatne zdjęcia — backend sprawdza uprawnienia)
- [ ] nginx: `client_max_body_size 55m` (zgłoszenia do 50 MB zdjęć)
- [ ] nginx: `sw.js` z `Cache-Control: no-cache`, `/assets/*` z długim cache
- [ ] nginx: nagłówek CSP dla frontendu (pamiętać o cdn.jsdelivr.net i fonts.googleapis.com / fonts.gstatic.com)
- [ ] Backend przez PM2 (`streetshow-api`) z `pm2 startup` + `pm2 save`, żeby wstawał po restarcie serwera
- [ ] Uruchamiać backend jako osobny użytkownik zamiast `root` (dotyczy też ścieżek w `deploy.yml`)
- [ ] Firewall: otwarte tylko SSH, 80, 443 — port backendu niedostępny z zewnątrz

## 4. GitHub Actions (automatyczny deploy)

- [ ] Sekrety repo: `MIKRUS_HOST`, `MIKRUS_SSH_KEY`
- [ ] Sprawdzić port SSH i ścieżkę `/root/streetshow` w `deploy.yml`
- [ ] Rozważyć deploy z `main` zamiast `newProject` po scaleniu gałęzi

## 5. Kopie zapasowe

- [ ] Codzienna kopia bazy działa (Panel → System pokazuje ostatnią kopię)
- [ ] Kopiować `backend/backups/` i `backend/uploads/` **poza serwer** (rclone/rsync z crona)
- [ ] Raz przetestować odtworzenie bazy z kopii

## 6. Konta i dane

- [ ] Utworzyć konto admina skryptem `create-admin` na produkcji
- [ ] Usunąć / zmienić testowe konto administratora
- [ ] Nadać uprawnienie „Obsługa wjazdu” osobom na bramie
- [ ] Nie przenosić lokalnej bazy z danymi testowymi na produkcję (albo ją wyczyścić)

## 7. Treści w panelu admina

- [ ] Ustawienia → Edycja wydarzenia: rok 2027, data, godziny, miejsce
- [ ] Ustawienia: zapisy do Select (termin, limity, liczba miejsc, kwota i termin opłaty, dane do przelewu)
- [ ] Wkleić regulamin 2027 i FAQ, uzupełnić kontakt i partnerów
- [ ] Treści strony → Home: lead pod tytułem; „Co Cię czeka”: sprawdzić kafelki (zapisana wcześniej treść ma stary kafelek BILETY i link drift — po redesignie domyślnie: Strefa Select → `#select`, Drift taxi → `/faq`, Expo → bilety); „Strefa Select”: 4 kroki
- [ ] Polityka prywatności: osobna strona/URL — formularz „Powiadom o dacie” linkuje teraz do `/regulamin`
- [ ] Po ogłoszeniu daty: Ustawienia → lista „Powiadom o dacie” → wysłać e-mail do zapisanych (najpierw sprawdzić na prawdziwym SMTP, w tym link „Wypisz”)
- [ ] Przejrzeć politykę prywatności / RODO, ustalić retencję zdjęć po wydarzeniu
- [ ] Galeria: udostępnić folder na Dysku kontu serwisowemu („Przeglądający”) i zrobić pierwszą synchronizację

## 8. SEO i wygląd linków

- [ ] Dodać brakujące pliki `frontend/public/img/og-image.jpg` i `twitter-image.jpg` (są w `index.html`, ale ich nie ma — podgląd linku na FB/Messengerze będzie bez obrazka)
- [ ] Google Search Console: weryfikacja (`googlebc20c8e2109ced24.html` już jest) i zgłoszenie `sitemap.xml`
- [ ] Sprawdzić podgląd linku w Facebook Sharing Debugger

## 9. Monitoring

- [ ] Uptime check na `https://www.streetshow.pl/api/health` (np. UptimeRobot) z powiadomieniem mailowym
- [ ] Opcjonalnie: Sentry dla błędów frontendu i backendu
- [ ] Rotacja logów PM2 (`pm2 install pm2-logrotate`)

## 10. Test końcowy (na produkcji)

- [ ] Rejestracja → mail weryfikacyjny → logowanie
- [ ] Zgłoszenie auta ze zdjęciami (duże pliki, telefon)
- [ ] Akceptacja → mail → opłata → wejściówka z QR
- [ ] Skan QR zwykłym aparatem telefonu otwiera `/wjazd` na właściwej domenie
- [ ] Reset hasła
- [ ] Zapis do „Powiadom o dacie” i wypisanie się linkiem z maila (`/wypisz`)
- [ ] Strona na telefonie (iOS + Android) i w trybie offline na `/wjazd`
- [ ] Sprawdzić, że `https://www.streetshow.pl/uploads/submissions/...` **nie** zwraca zdjęć bez logowania
