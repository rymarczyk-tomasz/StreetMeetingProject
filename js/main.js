document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    const navLinks = document.querySelectorAll(".nav-link");
    const gallery = document.getElementById("gallery-folder");

    let dotsInterval;

    function animateDots() {
        clearInterval(dotsInterval); // Upewnij się, że poprzedni interwał został zatrzymany
        let dots = "";
        dotsInterval = setInterval(() => {
            dots = dots.length < 3 ? dots + "." : "";
            responseMessage.innerText = `Wysyłanie formularza, proszę czekać${dots}`;
        }, 500);
    }

    // Funkcja asynchroniczna do ładowania galerii
    async function loadGallery() {
        try {
            // Pobierz listę zdjęć z serwera
            const response = await fetch("/api/gallery");
            if (!response.ok) throw new Error("Nie udało się pobrać zdjęć.");

            const photos = await response.json();

            // Wyświetl zdjęcia w galerii
            photos.forEach((photo) => {
                const img = document.createElement("img");
                img.src = photo.url;
                img.alt = photo.name;
                img.style.maxWidth = "300px";
                img.style.margin = "10px";
                gallery.appendChild(img);
            });
        } catch (error) {
            console.error("Błąd przy generowaniu galerii:", error.message);
        }
    }

    // Wywołaj funkcję asynchroniczną do ładowania galerii
    loadGallery();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        responseMessage.innerText = "Wysyłanie formularza, proszę czekać";
        responseMessage.style.color = "blue";
        animateDots();

        const formData = new FormData(form);

        try {
            const response = await fetch(window.ENV.API_BASE_URL, {
                // Użyj API_BASE_URL z config.js
                method: "POST",
                body: formData,
            });

            clearInterval(dotsInterval); // Zatrzymanie animacji
            if (response.ok) {
                responseMessage.innerText = `Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)`;
                responseMessage.style.color = "green";
            } else {
                const error = await response.json();
                responseMessage.innerText = `Błąd: ${
                    error.message || "Wystąpił błąd przy wysyłaniu formularza."
                }`;
                responseMessage.style.color = "red";
            }
        } catch (error) {
            clearInterval(dotsInterval); // Zatrzymanie animacji
            responseMessage.innerText =
                "Wystąpił błąd przy wysyłaniu formularza. Spróbuj ponownie później.";
            responseMessage.style.color = "red";
        }
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (navbarCollapse.classList.contains("show")) {
                new bootstrap.Collapse(navbarCollapse).toggle();
            }
        });
    });
});
