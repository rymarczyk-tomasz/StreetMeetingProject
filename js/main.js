document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector(".navbar-collapse");
    const footerYear = document.querySelector(".footer-year");

    // Obsługa kliknięcia poza menu nawigacyjne
    document.addEventListener("click", () => {
        if (nav.classList.contains("show")) {
            nav.classList.remove("show");
        }
    });

    // Ustawianie aktualnego roku w stopce
    const handleCurrentYear = () => {
        const year = new Date().getFullYear();
        footerYear.innerText = year;
    };

    handleCurrentYear();

    // Śledzenie kliknięć w linki
    document.querySelectorAll("a").forEach((anchor) => {
        anchor.addEventListener("click", () => {
            // Śledzenie zdarzeń w Google Analytics
            if (typeof gtag === "function") {
                gtag("event", "click", {
                    event_category: "link",
                    event_label: anchor.href,
                });
            }
        });
    });

    // Obsługa formularza
    const uploadForm = document.getElementById("uploadForm");

    if (uploadForm) {
        uploadForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Zapobieganie domyślnemu działaniu formularza

            const formData = new FormData(uploadForm);

            // Wysyłanie danych do serwera
            fetch(uploadForm.action, {
                method: "POST",
                body: formData,
            })
                .then((response) => response.json())
                .then((data) => {
                    alert(data.message); // Wyświetlenie komunikatu sukcesu
                })
                .catch((error) => {
                    console.error("Błąd:", error);
                    alert("Wystąpił błąd podczas przesyłania formularza.");
                });
        });
    }
});
