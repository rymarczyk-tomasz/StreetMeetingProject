document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeBtn = document.querySelector(".close");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");

    // Sprawdzenie czy wszystkie wymagane elementy istnieją
    if (!gallery || !modal || !modalImg) {
        console.error("Brak wymaganych elementów galerii");
        return;
    }

    const photos = [];
    let currentIndex = 0;

    function loadGallery() {
        const imageFolder = "img/gallery";
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
        ];

        const fragment = document.createDocumentFragment();

        imageNames.forEach((name, index) => {
            const photoPath = `${imageFolder}/${name}`;
            photos.push(photoPath);

            const img = document.createElement("img");
            img.src = photoPath;
            img.loading = "lazy";
            img.alt = `Zdjęcie z galerii Street Show ${index + 1}`;
            img.style.maxWidth = "300px";
            img.style.margin = "10px";
            img.style.cursor = "pointer";

            img.addEventListener("click", () => {
                openModal(photos.indexOf(photoPath));
            });

            // Obsługa błędów ładowania obrazów
            img.addEventListener("error", () => {
                console.error(`Nie udało się załadować: ${photoPath}`);
                img.style.display = "none";
            });

            fragment.appendChild(img);
        });

        gallery.appendChild(fragment);
    }

    function openModal(index) {
        currentIndex = index;
        modal.style.display = "block";
        document.body.style.overflow = "hidden"; // Zapobiega scrollowaniu w tle
        updateModal();
        preloadImages();
    }

    function closeModal() {
        modal.style.display = "none";
        document.body.style.overflow = ""; // Przywraca scrollowanie
    }

    function updateModal() {
        modalImg.src = photos[currentIndex];
        modalImg.alt = `Powiększone zdjęcie ${currentIndex + 1} z ${photos.length}`;
        modalImg.style.display = "block";
        modalImg.style.margin = "auto";
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % photos.length;
        updateModal();
        preloadImages();
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        updateModal();
        preloadImages();
    }

    function preloadImages() {
        const nextIndex = (currentIndex + 1) % photos.length;
        const prevIndex = (currentIndex - 1 + photos.length) % photos.length;

        const nextImg = new Image();
        nextImg.src = photos[nextIndex];

        const prevImg = new Image();
        prevImg.src = photos[prevIndex];
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Event listeners z sprawdzeniem istnienia elementów
    if (nextBtn) {
        nextBtn.addEventListener("click", showNextImage);
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", showPrevImage);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    // Obsługa klawiatury
    window.addEventListener(
        "keydown",
        debounce((e) => {
            if (modal.style.display === "block") {
                if (e.key === "ArrowRight") showNextImage();
                if (e.key === "ArrowLeft") showPrevImage();
                if (e.key === "Escape") closeModal();
            }
        }, 100),
    );

    // Zamknięcie modala po kliknięciu w tło
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Obsługa gestów dotykowych (swipe)
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchMove(e) {
        touchEndX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd() {
        const swipeThreshold = 50;
        if (touchStartX - touchEndX > swipeThreshold) {
            showNextImage();
        } else if (touchEndX - touchStartX > swipeThreshold) {
            showPrevImage();
        }
    }

    modal.addEventListener("touchstart", handleTouchStart, { passive: true });
    modal.addEventListener("touchmove", handleTouchMove, { passive: true });
    modal.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Inicjalizacja galerii
    try {
        loadGallery();
    } catch (error) {
        console.error("Błąd podczas ładowania galerii:", error);
    }
});
