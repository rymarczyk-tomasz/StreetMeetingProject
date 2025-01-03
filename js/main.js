document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    const navLinks = document.querySelectorAll(".nav-link");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        responseMessage.innerText = "Wysyłanie formularza, proszę czekać...";
        responseMessage.style.color = "blue";

        const formData = new FormData(form);

        try {
            const response = await fetch(window.ENV.API_BASE_URL, {
                // Użyj API_BASE_URL z config.js
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                responseMessage.innerText = `Gratulacje! ${firstName} ${lastName}! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją.`;
                responseMessage.style.color = "green";
            } else {
                const error = await response.json();
                responseMessage.innerText = `Błąd: ${
                    error.message || "Wystąpił błąd przy wysyłaniu formularza."
                }`;
                responseMessage.style.color = "red";
            }
        } catch (error) {
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
