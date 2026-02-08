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

  function setMessage(text, type) {
    clearInterval(dotsInterval);
    responseMessage.innerText = text;
    responseMessage.classList.remove("msg-info", "msg-success", "msg-error");
    if (type === "info") responseMessage.classList.add("msg-info");
    if (type === "success") responseMessage.classList.add("msg-success");
    if (type === "error") responseMessage.classList.add("msg-error");
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
      }

      const files = document.getElementById("photos").files;

      if (files.length > 5) {
        setMessage("Możesz przesłać maksymalnie 5 zdjęć.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      let totalSize = 0;
      for (let file of files) {
        totalSize += file.size;
      }

      if (totalSize > maxSize) {
        setMessage("Łączny rozmiar plików przekracza 50MB.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }
        return;
      }

      for (let file of files) {
        if (!file.type.startsWith("image/")) {
          setMessage("Wszystkie pliki muszą być obrazami.", "error");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute("aria-busy");
          }
          return;
        }
      }

      setMessage("Wysyłanie formularza, proszę czekać", "info");
      animateDots();

      const formData = new FormData(form);

      const controller = new AbortController();
      const timeoutMs = 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(window.ENV.API_BASE_URL, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearInterval(dotsInterval);
        clearTimeout(timeoutId);

        if (response.ok) {
          setMessage(
            "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
            "success",
          );
          form.reset();
          form.classList.remove("was-validated");
        } else {
          let errorText = "Wystąpił błąd przy wysyłaniu formularza.";
          try {
            const error = await response.json();
            errorText = error.message || errorText;
          } catch (e) {}
          setMessage(`Błąd: ${errorText}`, "error");
        }
      } catch (error) {
        clearInterval(dotsInterval);
        clearTimeout(timeoutId);
        console.error("Błąd wysyłania:", error);
        if (error.name === "AbortError") {
          setMessage(
            "Przekroczono czas oczekiwania wysyłki. Spróbuj ponownie.",
            "error",
          );
        } else {
          setMessage(
            "Wystąpił błąd przy wysyłaniu formularza. Spróbuj ponownie później.",
            "error",
          );
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }
      }
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (!navbarCollapse) return;
      const instance = bootstrap.Collapse.getInstance(navbarCollapse);
      if (instance && navbarCollapse.classList.contains("show")) {
        instance.hide();
      } else if (navbarCollapse.classList.contains("show")) {
        const bs = new bootstrap.Collapse(navbarCollapse, { toggle: true });
        bs.hide();
      }
    });
  });

  const handleCurrentYear = () => {
    const currentYear = new Date().getFullYear();
    if (footerYear) {
      footerYear.innerText = currentYear;
    }
  };

  handleCurrentYear();
});
