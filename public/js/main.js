document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    const responseMessage = document.getElementById("responseMessage");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Formularz został wysłany");

        responseMessage.innerText = "Wysyłanie formularza, proszę czekać...";
        responseMessage.style.color = "blue";

        const formData = new FormData(form);
        console.log("Formularz wysyłany:", formData);

        try {
            const response = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Odpowiedź serwera:", result);
                responseMessage.innerText =
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją.";
                responseMessage.style.color = "green";
                form.reset();
            } else {
                const error = await response.json();
                console.log("Błąd odpowiedzi:", error);
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
