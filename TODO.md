# TODO - Street Show

Lista rzeczy do dodania lub dopracowania w projekcie.

## Funkcje

- [ ] Forum dla uczestnikow i fanow wydarzenia
- [ ] Kategorie forum, tematy, komentarze i moderacja przez administratora
- [ ] Powiadomienia o nowych odpowiedziach na forum
- [x] Edycja i usuwanie wlasnych zgloszen przez uzytkownika
- [x] Powiadomienia e-mail o zmianie statusu zgloszenia
- [x] Panel administratora z dodatkowymi statystykami zgloszen
- [x] Edycje wydarzenia (rok) — zgloszenia, limity i statystyki per edycja, archiwum lat
- [x] Galeria z albumami z Dysku Google, miniatury na serwerze
- [x] FAQ, regulamin (edytor + PDF), ogloszenia, partnerzy edytowalne w panelu, historia zmian
- [x] Lista na brame do druku, wiadomosci e-mail do grup uczestnikow
- [x] Wejsciowki z kodem QR i check-in na bramie (Admin → Wjazd)
- [x] Wgrywanie potwierdzenia przelewu przez uczestnika, dane do przelewu w panelu
- [x] Weryfikacja i zmiana adresu e-mail (dzialaja po skonfigurowaniu SMTP)
- [x] Zgody (regulamin/RODO) przy rejestracji i zgloszeniu, z data i wersja regulaminu
- [x] Garaz pojazdow, zgloszenie z garazu, "Zglos ponownie" na nowa edycje
- [x] Komunikaty od organizatora w panelu uczestnika
- [x] Lista rezerwowa, limit miejsc przy akceptacji, rezygnacja uczestnika
- [x] Tryb offline na bramie (lista aut w telefonie, kolejka wjazdów, service worker)
- [x] Odliczanie do wydarzenia i publiczna lista "Auta strefy Select" (za zgodą)
- [x] Szablony wiadomości, wejściówka PDF/PNG, preferencje powiadomień, wątek wiadomości przy zgłoszeniu
- [x] Oceny zgłoszeń przez adminów, raport po wydarzeniu, podgląd stanu systemu
- [x] Termin opłaty od akceptacji, przypomnienie e-mail, filtr "po terminie"

## E-mail i powiadomienia

- [ ] Skonfigurowac produkcyjny SMTP w `backend/config/.env`
- [ ] Ustawic `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` i `SMTP_FROM`
- [ ] Ustawic kwote oplaty w panelu (Ustawienia) albo `SELECT_FEE_AMOUNT`
- [x] Dodac e-mail potwierdzajacy utworzenie konta
- [ ] Przetestowac wysylke e-maili w srodowisku produkcyjnym

## Wdrozenie

- [ ] Wybrac hosting: Mikrus lub Hostinger VPS/Cloud z obsluga Node.js
- [ ] Skonfigurowac nginx jako reverse proxy dla frontendu i API
- [ ] Uruchomic backend przez PM2 lub systemd
- [ ] Dodac produkcyjne sekrety JWT i zmienne CORS
- [x] Codzienna kopia bazy na serwerze (`backend/backups/`)
- [ ] Kopiowac `backend/backups/` i `backend/uploads/` poza serwer (rclone/rsync z crona)
- [ ] nginx: CSP dla frontendu, nie serwowac `uploads/submissions` bezposrednio
- [ ] nginx: `client_max_body_size 55m` (zgloszenia do 50 MB zdjec)
- [ ] Uruchamiac backend jako osobny uzytkownik zamiast root
- [ ] Zmienic lub usunac testowe konto administratora przed publikacja
- [ ] Udostepnic folder galerii na Dysku kontu serwisowemu i ustawic `DRIVE_GALLERY_FOLDER_ID`
- [ ] Ustawic w panelu edycje 2027 (data, godziny) i wkleic regulamin 2027

## Jakosc i bezpieczenstwo

- [ ] Dodac automatyczne testy backendu i frontendu
- [ ] Dodac monitoring bledow i logow produkcyjnych (np. Sentry + uptime check na /api/health)
- [x] Usunac stara statyczna strone i pliki Azure z repo
- [ ] Usunac nieuzywane `frontend/public/img/gallery/` oraz stary katalog `img/` w glownym folderze (NIE usuwac `frontend/public/img/optimized/` — `utils/photos.ts` serwuje z niego wersje 400/800/1200 zdjec)
- [x] Sprawdzic limity uploadu (5 zdjec / 50 MB, 5 pojazdow na konto)
- [ ] Ustalic retencje przeslanych zdjec po wydarzeniu (RODO) i wpisac ja do polityki prywatnosci
- [ ] Dac do sprawdzenia domyslna polityke prywatnosci (Panel → Tresci strony → Polityka prywatnosci)
- [ ] Rozwazyc potwierdzenie zapisu na "Powiadom o dacie" e-mailem (double opt-in)
- [ ] Przejrzec polityke prywatnosci i regulamin przed uruchomieniem produkcyjnym
