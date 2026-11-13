# Checklista przed wdrożeniem — Street Show

Wszystko, co trzeba zrobić, zanim strona ruszy produkcyjnie na `www.streetshow.pl`.
Konfiguracja backendu siedzi w `backend/config/.env` na serwerze (nie w repo).

## 1. E-mail (SMTP)

Bez SMTP nie działają: reset hasła, weryfikacja i zmiana adresu e-mail, powiadomienia o statusie zgłoszenia, przypomnienia o opłacie, wiadomości do grup uczestników, powiadomienia dla organizatorów, e-mail z datą do listy „Powiadom o dacie”.

- [ ] Założyć skrzynkę nadawczą (np. `kontakt@streetshow.pl` / `no-reply@streetshow.pl`) u dostawcy poczty domeny
- [ ] Wpisać do `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
  - port 587 → `SMTP_SECURE=false`, port 465 → `SMTP_SECURE=true`
  - przy Gmailu/Google Workspace: hasło aplikacji, nie zwykłe hasło
  - Brevo: `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER` = login SMTP z panelu Brevo (nie e-mail konta), `SMTP_PASSWORD` = klucz SMTP; domenę nadawcy trzeba uwierzytelnić w Brevo (rekordy DKIM i DMARC w Cloudflare), a plan dobrać do dziennego limitu wysyłek — wiadomość do wszystkich uczestników to jeden e-mail na osobę
- [ ] Opcjonalnie `SMTP_REPLY_TO` — adres, na który trafią odpowiedzi na maile (np. `kontakt@streetshow.pl`, gdy nadawcą jest `no-reply@…`); bez niej odpowiedzi idą na `SMTP_FROM`
- [ ] DNS domeny: rekord **SPF**, **DKIM** i **DMARC** dla serwera pocztowego — inaczej maile lądują w spamie
- [ ] `ADMIN_NOTIFY_EMAIL` — adres(y) organizatorów, po przecinku
- [ ] Panel admina → System → wysłać testowy e-mail
- [ ] Przetestować na żywo: rejestracja, reset hasła, akceptacja zgłoszenia — sprawdzić, czy maile dochodzą (i nie do spamu) na Gmail, Onet, WP, Outlook

## 1a. Konta administratorów

- [ ] Każdy admin przy pierwszym wejściu do panelu włącza **logowanie dwuetapowe** (aplikacja Google/Microsoft Authenticator, 1Password, Authy) i zapisuje 10 kodów zapasowych poza telefonem
- [ ] Hasła adminów: min. 12 znaków, nieużywane nigdzie indziej; skrzynki e-mail adminów też z 2FA
- [ ] Najlepiej co najmniej dwóch adminów — jeden może zresetować drugiemu 2FA (Użytkownicy → „Resetuj logowanie dwuetapowe”); w ostateczności na serwerze: `cd backend && node dist/scripts/reset-2fa.js <email>`
- Zmiana danych do przelewu, nadanie roli admina i wiadomości grupowe wymagają ponownie hasła i kodu; zmiany danych do przelewu i nowi admini wysyłają alert e-mail do wszystkich adminów

## 2. Zmienne środowiskowe (`backend/config/.env`)

- [ ] `NODE_ENV=production` — **wymagane**, bez tego ciasteczka logowania nie mają flagi `Secure`
- [ ] `JWT_ACCESS_SECRET` i `JWT_REFRESH_SECRET` — nowe, losowe, inne niż lokalnie (np. `openssl rand -hex 64`)
- [ ] `CORS_ORIGINS=https://www.streetshow.pl,https://streetshow.pl`
- [ ] `APP_URL=https://www.streetshow.pl` — linki w mailach i kody QR na wejściówkach; zmiana po wydaniu wejściówek psuje stare kody
- [ ] `PORT` — zgodny z nginx i healthcheckiem w `.github/workflows/deploy.yml` (tam: `4001`)
- [ ] `TRUST_PROXY=loopback` (nginx na tym samym serwerze)
- [ ] `SELECT_FEE_AMOUNT` albo kwota w panelu (Ustawienia — ma pierwszeństwo)
- [ ] Galeria: dane konta serwisowego `GOOGLE_*` w `.env` (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, …). Folder ze zdjęciami wskazuje się w panelu (Admin → Galeria; `DRIVE_GALLERY_FOLDER_ID` nie jest już używane) i udostępnia kontu serwisowemu jako „Przeglądający”. `GOOGLE_PRIVATE_KEY` to cały klucz z pliku JSON konta serwisowego (pole `private_key`, zaczyna się od `-----BEGIN PRIVATE KEY-----`), w jednej linii, w cudzysłowie, ze znakami `
` zamiast nowych linii — nie mylić z krótkim `private_key_id`
- [ ] Backupy: `BACKUP_DIR`, `BACKUP_KEEP`
- [ ] Panel admina → System: sprawdzić, czy wszystko świeci na zielono

## 3. Serwer i nginx

- [ ] VPS OVH z Ubuntu 24.04, min. 2 GB RAM i 40 GB dysku (zdjęcia zgłoszeń: do 50 MB na auto)
- [ ] Domena: rekordy A/AAAA na serwer, przekierowanie `streetshow.pl` → `www.streetshow.pl` (lub odwrotnie, ale spójnie z `APP_URL`)
- [ ] SSL: Cloudflare w trybie Full (strict) + Cloudflare Origin Certificate na serwerze, przekierowanie HTTP → HTTPS
- [ ] nginx serwuje `frontend/dist`, z fallbackiem SPA (`try_files $uri /index.html`)
- [ ] nginx: `/api` i `/uploads` → backend, z `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
- [ ] nginx: **nie** serwować bezpośrednio `backend/uploads/submissions`, `vehicles` ani `showcase` (prywatne zdjęcia — backend sprawdza uprawnienia)
- [ ] nginx: `client_max_body_size 55m` (zgłoszenia do 50 MB zdjęć)
- [ ] nginx: `sw.js` z `Cache-Control: no-cache`, `/assets/*` z długim cache
- [ ] nginx: nagłówek CSP dla frontendu (`deploy/nginx/streetshow-headers.conf`; ikony i font są w paczce aplikacji, więc bez zewnętrznych domen)
- [ ] nginx: przekierowania 301 ze starych adresów `/faq.html`, `/galeria.html`, `/regulamin.html` (są w `deploy/nginx/streetshow.conf`)
- [ ] Backend przez PM2 (`streetshow-api`) z `pm2 startup` + `pm2 save`, żeby wstawał po restarcie serwera
- [ ] Uruchamiać backend jako osobny użytkownik zamiast `root` (dotyczy też ścieżek w `deploy.yml`)
- [ ] Firewall: otwarte tylko SSH, 80, 443 — port backendu niedostępny z zewnątrz

### Postawienie serwera skryptem (VPS OVH, Ubuntu 24.04)

`deploy/setup.sh` robi większość punktów powyżej: użytkownik `streetshow`, ufw, fail2ban, automatyczne aktualizacje, swap, Node 22, PM2 (+ logrotate, start po restarcie), nginx z `deploy/nginx/`, prawdziwe IP z Cloudflare (`deploy/cloudflare-realip.sh`, odświeżane co miesiąc), szablon `.env` z wygenerowanymi sekretami JWT. Aplikacja ląduje w `/home/streetshow/streetshow`. Skrypt można uruchamiać wielokrotnie.

1. Cloudflare → SSL/TLS: tryb **Full (strict)**; Origin Server → Create Certificate (`*.streetshow.pl`, `streetshow.pl`).
2. Na serwerze (jako `ubuntu` z sudo):
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/rymarczyk-tomasz/StreetMeetingProject/newProject/deploy/setup.sh
   sudo DEPLOY_PUBKEY="ssh-ed25519 AAAA... streetshow-deploy" bash setup.sh
   ```
3. Wkleić certyfikat i klucz z Cloudflare do `/etc/ssl/cloudflare/origin.pem` i `origin.key`, uzupełnić `/home/streetshow/streetshow/backend/config/.env` (SMTP, Google, `ADMIN_NOTIFY_EMAIL`) i uruchomić skrypt ponownie — włączy nginx, zbuduje i wystartuje aplikację.
4. Test przed przełączeniem domeny: `sudo DOMAIN=nowa.streetshow.pl APEX=none bash setup.sh` + rekord `nowa` w Cloudflare (proxied). Po testach uruchomić skrypt bez tych zmiennych i poprawić `APP_URL`/`CORS_ORIGINS` w `.env` na `www.streetshow.pl` (`pm2 restart streetshow-api --update-env`).
5. Przełączenie: w Cloudflare rekordy `www` i `streetshow.pl` → A/AAAA serwera (proxied), zamiast CNAME na Azure.
6. GitHub → Settings → Secrets: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`; Variables: `DEPLOY_USER=streetshow`, `DEPLOY_PORT=22`, `DEPLOY_PATH=/home/streetshow/streetshow`. Bez nich workflow dalej deployuje na Mikrusa.

### Bezpieczeństwo serwera — do zrobienia ręcznie

`setup.sh` ustawia firewall (tylko SSH, 80, 443), logowanie SSH wyłącznie kluczem, fail2ban, automatyczne aktualizacje, katalogi z danymi dostępne tylko dla użytkownika `streetshow` i API słuchające tylko na `127.0.0.1`. Poza skryptem zostaje:

- [ ] Ruch tylko przez Cloudflare: Cloudflare → SSL/TLS → Origin Server → włączyć **Authenticated Origin Pulls**, potem na serwerze `sudo ORIGIN_PULLS=1 bash setup.sh`. Od tej chwili nginx odrzuca (400) każde połączenie HTTPS, które nie przyszło z Cloudflare — bez tego ktoś, kto pozna adres IP serwera, omija ochronę Cloudflare. Kolejność jest ważna: najpierw przełącznik w Cloudflare, inaczej strona przestanie działać
- [ ] Cloudflare: reguła ograniczania liczby żądań (rate limiting) dla `/api/auth/*`
- [ ] Konto GitHub z dostępem do repo: 2FA, a gałąź `newProject` chroniona (bez force-push) — kto może do niej wypchnąć kod, ten ma dostęp do serwera i bazy
- [ ] Konto OVH i Cloudflare klienta: 2FA
- [ ] Zdalny dysk z kopiami: szyfrowanie `rclone crypt` (sekcja 5) — w kopii jest cała baza i zdjęcia
- [ ] `backend/config/.env` i klucz SSH do deployu tylko w menedżerze haseł, nigdy w mailu ani na czacie

## 4. GitHub Actions (automatyczny deploy)

- [ ] Sekrety repo: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`; zmienne: `DEPLOY_USER=streetshow`, `DEPLOY_PORT=22`, `DEPLOY_PATH=/home/streetshow/streetshow` (bez nich workflow deployuje na stary serwer testowy)
- [ ] Po przełączeniu usunąć sekrety `MIKRUS_*` i domyślne wartości Mikrusa z `deploy.yml`
- [ ] Rozważyć deploy z `main` zamiast `newProject` po scaleniu gałęzi

## 5. Kopie zapasowe

- [ ] Codzienna kopia bazy działa (Panel → System pokazuje ostatnią kopię)
- [ ] Kopia poza serwerem: `backend/scripts/offsite-backup.sh` z crona (opis niżej)
- [ ] Raz przetestować odtworzenie systemu z kopii (opis niżej)

### Kopia poza serwerem (rclone)

Skrypt `backend/scripts/offsite-backup.sh` wysyła przez rclone na `OFFSITE_REMOTE` tylko to, czego nie da się odtworzyć:

| Na zdalnym dysku | Co to jest | Jak długo |
| --- | --- | --- |
| `db/app-RRRR-MM-DD.sqlite.gz` | dzienna kopia bazy (kilka MB) | 30 dni |
| `uploads/submissions`, `uploads/vehicles`, `uploads/content` | lustro katalogów ze zdjęciami — każdego dnia jadą tylko nowe pliki | dopóki są na serwerze |
| `deleted/RRRR-MM-DD/…` | pliki usunięte lub podmienione na serwerze od poprzedniej kopii | 30 dni |

Pomijane są `uploads/gallery` (miniatury odtwarza synchronizacja z Dysku Google) i `uploads/showcase` (kopie generują się przy pierwszym wyświetleniu). Zdjęcia nie są pakowane w dzienne archiwa, więc kopia zajmuje tyle, co same zdjęcia, a nie wielokrotność. Przy każdym błędzie skrypt kończy się kodem ≠ 0. Dane dostępowe trzyma rclone w swojej konfiguracji (`~/.config/rclone/rclone.conf`), nie skrypt ani repo.

1. Konto u innego dostawcy niż OVH, z serwerami w UE (w kopii są dane osobowe): np. Hetzner Storage Box albo Backblaze B2 w regionie EU. Osobny bucket/katalog `streetshow-backups` i klucz z dostępem tylko do niego.
   - B2: przy usuwaniu plików B2 domyślnie zostawia ukryte stare wersje — ustaw w buckecie lifecycle „Keep only the last version” albo dopisz do remote'a `hard_delete = true`.
   - Zalecane: remote typu `crypt` nałożony na właściwy (`rclone config` → `crypt`), wtedy u dostawcy leżą zaszyfrowane pliki. Hasło crypt trzymać w menedżerze haseł — bez niego kopia jest bezużyteczna.
2. Instalacja rclone na serwerze:
   ```bash
   curl https://rclone.org/install.sh | sudo bash
   rclone version
   ```
3. Konfiguracja remote'a jako użytkownik `streetshow` (ten sam, z którego działa cron):
   ```bash
   sudo -iu streetshow
   rclone config            # n → nazwa np. "b2" → typ → dane dostępowe
   rclone lsd b2:           # powinien pokazać bucket streetshow-backups
   ```
4. W `backend/config/.env` dopisać `OFFSITE_REMOTE=b2:streetshow-backups` (skrypt czyta ją stamtąd, jeśli nie ma jej w środowisku).
5. Test ręczny:
   ```bash
   cd ~/streetshow/backend
   ./scripts/offsite-backup.sh
   rclone tree b2:streetshow-backups --max-depth 2
   ```
6. Cron (`crontab -e` jako `streetshow`), codziennie o 4:00 — po nocnej synchronizacji galerii:
   ```cron
   PATH=/usr/local/bin:/usr/bin:/bin
   0 4 * * * flock -n /tmp/streetshow-offsite.lock /home/streetshow/streetshow/backend/scripts/offsite-backup.sh >> /home/streetshow/offsite-backup.log 2>&1
   ```
   Warto dopiąć monitoring nieudanych kopii (np. healthchecks.io: `&& curl -fsS https://hc-ping.com/<id>` na końcu wiersza).

### Odtworzenie na nowym serwerze

1. Postawić serwer skryptem `deploy/setup.sh` (sekcja 3), odtworzyć `backend/config/.env` (sekrety trzymać osobno, np. w menedżerze haseł — nie ma ich w kopii).
2. Skonfigurować rclone jak wyżej i przy zatrzymanym backendzie (`pm2 stop streetshow-api`) pobrać dane:
   ```bash
   cd ~/streetshow/backend
   rclone copy b2:streetshow-backups/uploads ./uploads
   rclone lsf b2:streetshow-backups/db | sort | tail -3
   rclone copy b2:streetshow-backups/db/app-RRRR-MM-DD.sqlite.gz /tmp/
   mkdir -p data
   gunzip -c /tmp/app-RRRR-MM-DD.sqlite.gz > data/app.sqlite
   rm -f data/app.sqlite-wal data/app.sqlite-shm
   ```
   Plik usunięty przez pomyłkę w ostatnich 30 dniach jest w `deleted/<data usunięcia>/`.
3. `pm2 restart streetshow-api`, potem Panel → System: baza i uploady. W Panel → Galeria uruchomić synchronizację (miniatury pobiorą się z Dysku od nowa). Zalogować się i otworzyć kilka zgłoszeń ze zdjęciami oraz wejściówkę.
4. Jeśli zmienił się adres serwera — zaktualizować rekordy w Cloudflare i sekret `DEPLOY_HOST`; `APP_URL` zostawić bez zmian, bo od niego zależą kody QR na wejściówkach.

## 5a. Przejście ze starej strony (Azure + arkusz Google)

Stara strona to Azure Static Web Apps + App Service `streetmeetingbackend`; formularz dopisuje wiersze do arkusza Google i wgrywa zdjęcia do folderu na Dysku. Uczestnicy nie mają tam kont, więc zgłoszenia wysyłają w nowym systemie ponownie.

- [ ] Spisać z App Service zmienne `GOOGLE_*` (to samo konto serwisowe obsłuży galerię) oraz zachować dostęp do arkusza i folderu zgłoszeń jako archiwum
- [ ] Dzień przed przełączeniem obniżyć TTL rekordów `www` i `streetshow.pl` w Cloudflare
- [ ] Zamknąć stary formularz, przełączyć rekordy na VPS (sekcja 3, krok 5), przejść test z sekcji 10
- [ ] Wysłać osobom z arkusza e-mail: nowa strona, prośba o założenie konta i ponowne zgłoszenie auta
- [ ] Po kilku dniach bez problemów: wyłączyć oba zasoby Azure i usunąć z gałęzi `main` ich workflowy; ustawić `newProject` (albo scalone `main`) jako gałąź domyślną repo

## 6. Konta i dane

- [ ] Utworzyć konto admina skryptem `create-admin` na produkcji
- [ ] Usunąć / zmienić testowe konto administratora
- [ ] Nadać uprawnienie „Obsługa wjazdu” osobom na bramie
- [ ] Wysłać obsłudze bramy instrukcję: „W dniu wydarzenia otwórz /wjazd przy dobrym zasięgu, zanim zaczniesz wpuszczać auta. Na iPhonie korzystaj z Safari, nie z ikony na ekranie głównym” (Safari i ikona mają osobne logowanie i osobną listę offline)
- [ ] Nie przenosić lokalnej bazy z danymi testowymi na produkcję (albo ją wyczyścić)

## 7. Treści w panelu admina

- [ ] Ustawienia → Edycja wydarzenia: rok 2027, data, godziny, miejsce
- [ ] Ustawienia: zapisy do Select (termin, limity, liczba miejsc, kwota i termin opłaty, dane do przelewu)
- [ ] Wkleić regulamin 2027 i FAQ, uzupełnić kontakt i partnerów
- [ ] Treści strony → Home: lead pod tytułem; „Co Cię czeka”: sprawdzić kafelki (zapisana wcześniej treść ma stary kafelek BILETY i link drift — domyślnie teraz: Strefa Select → `#select`, Drift taxi → `/faq`, Expo → bilety); „Strefa Select”: 4 kroki
- [ ] Polityka prywatności (`/polityka-prywatnosci`, Treści strony → Polityka prywatności): domyślna treść opisuje dane zbierane przez stronę i retencję zdjęć (przyjęte: 12 miesięcy po wydarzeniu, pozostałe: 30 dni; usuwane automatycznie) — dać klientowi do sprawdzenia. Jeśli sekcja była już zapisana w panelu, nowy tekst o retencji trzeba dopisać ręcznie (zapisana treść ma pierwszeństwo przed domyślną)
- [ ] Po ogłoszeniu daty: Ustawienia → lista „Powiadom o dacie” → wysłać e-mail do zapisanych (najpierw sprawdzić na prawdziwym SMTP, w tym link „Wypisz”)
- [x] Retencja zdjęć po wydarzeniu ustalona z klientem i zautomatyzowana (`backend/src/retention.ts`). Warunek: w Ustawienia → Edycja wydarzenia musi być wpisana data — bez niej zdjęcia bieżącej edycji nie są usuwane, a minionej edycji liczą się od 31 grudnia
- [ ] Galeria: udostępnić folder na Dysku kontu serwisowemu („Przeglądający”) i zrobić pierwszą synchronizację

## 8. SEO i wygląd linków

- [x] Obrazek podglądu linku `frontend/public/img/og-image.jpg` (1200×630) — przy zmianie zdjęcia hero warto go odświeżyć
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
