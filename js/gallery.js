document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = document.querySelector(".close");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");

    let photos = []; // Tablica zdjęć
    let currentIndex = 0; // Indeks bieżącego zdjęcia

    async function loadGallery() {
        loader.style.display = "block"; // Pokaż loader
        try {
            const response = await fetch("http://127.0.0.1:3000/api/gallery");

            if (!response.ok) throw new Error("Nie udało się pobrać zdjęć.");

            // Wczytaj dane do globalnej tablicy `photos`
            photos = await response.json();
            loader.style.display = "none"; // Ukryj loader po załadowaniu

            // Generowanie galerii
            photos.forEach((photo, index) => {
                const img = document.createElement("img");
                img.src = `http://127.0.0.1:3000${photo.path}`;
                img.loading = "lazy"; // Lazy loading
                img.style.maxWidth = "300px";
                img.style.margin = "10px";

                // Dodaj zdarzenie kliknięcia, aby otworzyć modal
                img.addEventListener("click", () => {
                    openModal(index); // Przekazanie indeksu zdjęcia
                });

                gallery.appendChild(img);
            });
        } catch (error) {
            console.error("Błąd przy generowaniu galerii:", error.message);
            loader.style.display = "none"; // Ukryj loader w przypadku błędu
        }
    }

    function openModal(index) {
        currentIndex = index; // Ustaw indeks bieżącego zdjęcia
        modal.style.display = "block";
        updateModal();
    }

    function closeModal() {
        modal.style.display = "none";
    }

    function updateModal() {
        const photo = photos[currentIndex];
        modalImg.src = `http://127.0.0.1:3000${photo.path}`;
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % photos.length; // Przejście do następnego zdjęcia
        updateModal();
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + photos.length) % photos.length; // Przejście do poprzedniego zdjęcia
        updateModal();
    }

    // Obsługa zdarzeń nawigacyjnych
    nextBtn.addEventListener("click", showNextImage);
    prevBtn.addEventListener("click", showPrevImage);
    closeBtn.addEventListener("click", closeModal);

    // Obsługa klawiatury
    window.addEventListener("keydown", (e) => {
        if (modal.style.display === "block") {
            if (e.key === "ArrowRight") showNextImage();
            if (e.key === "ArrowLeft") showPrevImage();
            if (e.key === "Escape") closeModal();
        }
    });

    // Zamknij modal po kliknięciu poza obrazem
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    loadGallery();
});
