document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    const navLinks = document.querySelectorAll(".nav-link");

    let dotsInterval;

    function animateDots() {
        clearInterval(dotsInterval); // Upewnij się, że poprzedni interwał został zatrzymany
        let dots = "";
        dotsInterval = setInterval(() => {
            dots = dots.length < 3 ? dots + "." : "";
            responseMessage.innerText = `Wysyłanie formularza, proszę czekać${dots}`;
        }, 500);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const files = document.getElementById("photos").files;
        if (files.length > 5) {
            responseMessage.innerText = "Możesz przesłać maksymalnie 5 zdjęć.";
            responseMessage.style.color = "red";
            return;
        }

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
                responseMessage.innerText =
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)";
                responseMessage.style.color = "green";
                form.reset(); // Opcjonalnie: wyczyszczenie formularza
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
