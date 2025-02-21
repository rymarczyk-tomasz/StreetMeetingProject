const navLinks = document.querySelectorAll(".nav-link");
const navbarCollapse = document.getElementById("navbarNavAltMarkup");
const footerYear = document.querySelector(".footer-year");

window.ENV = {
    API_BASE_URL: "https://streetmeetingbackend.azurewebsites.net/upload",
    // API_BASE_URL: "http://localhost:33000/upload",
};

navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        if (navbarCollapse.classList.contains("show")) {
            new bootstrap.Collapse(navbarCollapse).toggle();
        }
    });
});

function animateDots() {
    clearInterval(dotsInterval); // Upewnij się, że poprzedni interwał został zatrzymany
    let dots = "";
    dotsInterval = setInterval(() => {
        dots = dots.length < 3 ? dots + "." : "";
        responseMessage.innerText = `Wysyłanie formularza, proszę czekać${dots}`;
    }, 500);
}

const handleCurrentYear = () => {
    const currentYear = new Date().getFullYear();
    footerYear.innerText = currentYear;
};

handleCurrentYear();

const form = document.getElementById("registrationForm");
const responseMessage = document.getElementById("responseMessage");

let dotsInterval;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    responseMessage.innerText = "Wysyłanie formularza, proszę czekać";
    responseMessage.style.color = "blue";
    // animateDots();

    const formData = new FormData(form);

    await fetch(window.ENV.API_BASE_URL, {
        method: "POST",
        body: formData,
    })
        .then((_) => {
            responseMessage.innerText = `Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)`;
            responseMessage.style.color = "green";
        })
        .catch((_) => {
            responseMessage.innerText =
                "Wystąpił błąd przy wysyłaniu formularza. Spróbuj ponownie później.";
            responseMessage.style.color = "red";
        });
});
