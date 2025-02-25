document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeBtn = document.querySelector(".close");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");

    const photos = [];
    let currentIndex = 0;

    // Funkcja ładująca galerię zdjęć
    function loadGallery() {
        const imageFolder = "img/gallery"; // Ścieżka do folderu ze zdjęciami
        const imageNames = [
            "1.webp",
            "2.webp",
            "3.webp",
            "4.webp",
            "5.webp",
            "6.webp",
            "7.webp",
            "8.webp",
            "9.webp",
            "10.webp",
            "11.webp",
            "12.webp",
            "13.webp",
        ]; // Lista nazw zdjęć - dostosuj do swoich potrzeb

        const fragment = document.createDocumentFragment();

        imageNames.forEach((name) => {
            const photoPath = `${imageFolder}/${name}`;
            photos.push(photoPath);

            const img = document.createElement("img");
            img.src = photoPath;
            img.loading = "lazy"; // Włączanie leniwego ładowania
            img.style.maxWidth = "300px";
            img.style.margin = "10px";

            img.addEventListener("click", () => {
                openModal(photos.indexOf(photoPath));
            });

            fragment.appendChild(img);
        });

        gallery.appendChild(fragment);
    }

    // Funkcja otwierająca modal z wybranym zdjęciem
    function openModal(index) {
        currentIndex = index;
        modal.style.display = "block";
        updateModal();
        preloadImages();
    }

    // Funkcja zamykająca modal
    function closeModal() {
        modal.style.display = "none";
    }

    // Funkcja aktualizująca zdjęcie w modalu
    function updateModal() {
        modalImg.src = photos[currentIndex];
        modalImg.style.display = "block";
        modalImg.style.margin = "auto"; // Wyśrodkowanie zdjęcia w modalu
    }

    // Funkcja pokazująca następne zdjęcie
    function showNextImage() {
        currentIndex = (currentIndex + 1) % photos.length;
        updateModal();
    }

    // Funkcja pokazująca poprzednie zdjęcie
    function showPrevImage() {
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        updateModal();
    }

    // Funkcja wstępnie ładująca sąsiednie zdjęcia
    function preloadImages() {
        const nextIndex = (currentIndex + 1) % photos.length;
        const prevIndex = (currentIndex - 1 + photos.length) % photos.length;

        const nextImg = new Image();
        nextImg.src = photos[nextIndex];

        const prevImg = new Image();
        prevImg.src = photos[prevIndex];
    }

    // Funkcja debounce do opóźniania zdarzeń
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Obsługa zdarzeń przycisków
    nextBtn.addEventListener("click", showNextImage);
    prevBtn.addEventListener("click", showPrevImage);
    closeBtn.addEventListener("click", closeModal);

    // Obsługa nawigacji klawiaturą
    window.addEventListener(
        "keydown",
        debounce((e) => {
            if (modal.style.display === "block") {
                if (e.key === "ArrowRight") showNextImage();
                if (e.key === "ArrowLeft") showPrevImage();
                if (e.key === "Escape") closeModal();
            }
        }, 100)
    );

    // Zamykanie modala po kliknięciu w tło
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Obsługa gestów przesunięcia palcem na urządzeniach mobilnych
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchMove(e) {
        touchEndX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd() {
        const swipeThreshold = 50; // Próg przesunięcia w pikselach
        if (touchStartX - touchEndX > swipeThreshold) {
            showNextImage(); // Przesunięcie w lewo -> następne zdjęcie
        } else if (touchEndX - touchStartX > swipeThreshold) {
            showPrevImage(); // Przesunięcie w prawo -> poprzednie zdjęcie
        }
    }

    modal.addEventListener("touchstart", handleTouchStart, false);
    modal.addEventListener("touchmove", handleTouchMove, false);
    modal.addEventListener("touchend", handleTouchEnd, false);

    // Uruchomienie galerii
    loadGallery();
});
