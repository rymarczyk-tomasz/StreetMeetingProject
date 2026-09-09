# TODO - Street Show

Lista rzeczy do dodania lub dopracowania w projekcie.

## Funkcje

- [ ] Forum dla uczestnikow i fanow wydarzenia
- [ ] Kategorie forum, tematy, komentarze i moderacja przez administratora
- [ ] Powiadomienia o nowych odpowiedziach na forum
- [ ] Edycja i usuwanie wlasnych zgloszen przez uzytkownika
- [ ] Powiadomienia e-mail o zmianie statusu zgloszenia
- [ ] Panel administratora z dodatkowymi statystykami zgloszen

## E-mail i powiadomienia

- [ ] Skonfigurowac produkcyjny SMTP w `backend/config/.env`
- [ ] Ustawic `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` i `SMTP_FROM`
- [ ] Skonfigurowac `SELECT_FEE_AMOUNT` dla wiadomosci do zaakceptowanych zgloszen
- [ ] Dodac e-mail potwierdzajacy utworzenie konta
- [ ] Przetestowac wysylke e-maili w srodowisku produkcyjnym

## Wdrozenie

- [ ] Wybrac hosting: Mikrus lub Hostinger VPS/Cloud z obsluga Node.js
- [ ] Skonfigurowac nginx jako reverse proxy dla frontendu i API
- [ ] Uruchomic backend przez PM2 lub systemd
- [ ] Dodac produkcyjne sekrety JWT i zmienne CORS
- [ ] Skonfigurowac kopie zapasowe `backend/data/` oraz `backend/uploads/`
- [ ] Zmienic lub usunac testowe konto administratora przed publikacja

## Jakosc i bezpieczenstwo

- [ ] Dodac automatyczne testy backendu i frontendu
- [ ] Dodac monitoring bledow i logow produkcyjnych
- [ ] Sprawdzic limity uploadu oraz retencje przeslanych zdjec
- [ ] Przejrzec polityke prywatnosci i regulamin przed uruchomieniem produkcyjnym
