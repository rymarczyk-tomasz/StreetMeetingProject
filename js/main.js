document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector(".navbar-collapse");
    const footerYear = document.querySelector(".footer-year");

    document.addEventListener("click", () => {
        if (nav.classList.contains("show")) {
            nav.classList.remove("show");
        }
    });

    const handleCurrentYear = () => {
        const year = new Date().getFullYear();
        footerYear.innerText = year;
    };

    handleCurrentYear();

    // Dodaj śledzenie zdarzeń
    document.querySelectorAll("a").forEach((anchor) => {
        anchor.addEventListener("click", () => {
            // Śledź zdarzenie kliknięcia, na przykład za pomocą Google Analytics
            if (typeof gtag === "function") {
                gtag("event", "click", {
                    event_category: "link",
                    event_label: anchor.href,
                });
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Wyświetl komunikat o trwającym przesyłaniu
        responseMessage.innerText = "Wysyłanie formularza, proszę czekać...";
        responseMessage.style.color = "blue";

        const formData = new FormData(form);

        try {
            const response = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                responseMessage.innerText =
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją.";
                responseMessage.style.color = "green";
                form.reset(); // Wyczyść formularz
            } else {
                const error = await response.json();
                responseMessage.innerText = `Błąd: ${
                    error.message || "Wystąpił błąd przy wysyłaniu formularza."
                }`;
                responseMessage.style.color = "red";
            }
        } catch (error) {
            console.error("Błąd podczas przesyłania:", error);
            responseMessage.innerText =
                "Wystąpił błąd przy wysyłaniu formularza. Spróbuj ponownie później.";
            responseMessage.style.color = "red";
        }
    });
});
