document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    const navLinks = document.querySelectorAll(".nav-link");
    const footerYear = document.querySelector(".footer-year");

    let dotsInterval;

    function animateDots() {
        clearInterval(dotsInterval);
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
                method: "POST",
                body: formData,
            });

            clearInterval(dotsInterval);
            if (response.ok) {
                responseMessage.innerText =
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)";
                responseMessage.style.color = "green";
                form.reset();
            } else {
                const error = await response.json();
                responseMessage.innerText = `Błąd: ${
                    error.message || "Wystąpił błąd przy wysyłaniu formularza."
                }`;
                responseMessage.style.color = "red";
            }
        } catch (error) {
            clearInterval(dotsInterval);
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

    const handleCurrentYear = () => {
        const currentYear = new Date().getFullYear();
        footerYear.innerText = currentYear;
    };

    handleCurrentYear();
});
