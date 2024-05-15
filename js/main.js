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
