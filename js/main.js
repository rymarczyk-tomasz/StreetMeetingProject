document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    const navLinks = document.querySelectorAll(".nav-link");
    const footerYear = document.querySelector(".footer-year");

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
                responseMessage.innerText = `Przepraszamy za probemy, ale formularz jest aktualnie w przebudowie i nie działa. Postaramy sie go naprawić jak najszybciej.`;
                responseMessage.style.color = "red";
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

    const handleCurrentYear = () => {
        const currentYear = new Date().getFullYear();
        footerYear.innerText = currentYear;
    };

    handleCurrentYear();
});
