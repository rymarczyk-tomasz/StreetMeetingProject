document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeBtn = document.querySelector(".close");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");

    const photos = [];
    let currentIndex = 0;

    function loadGallery() {
        const imageFolder = "img/gallery"; // Ścieżka do folderu ze zdjęciami
        const imageNames = [
            "1.jpg",
            "2.jpg",
            "3.jpg",
            "4.jpg",
            "5.jpg",
            "6.jpg",
            "7.jpg",
            "8.jpg",
            "9.jpg",
            "10.jpg",
            "11.jpg",
            "12.jpg",
            "13.jpg",
        ]; // Dodaj tutaj swoje zdjęcia

        const fragment = document.createDocumentFragment();

        imageNames.forEach((name) => {
            const photoPath = `${imageFolder}/${name}`;
            photos.push(photoPath);

            const img = document.createElement("img");
            img.src = photoPath;
            img.loading = "lazy"; // Lazy loading
            img.style.maxWidth = "300px";
            img.style.margin = "10px";

            img.addEventListener("click", () => {
                openModal(photos.indexOf(photoPath));
            });

            fragment.appendChild(img);
        });

        gallery.appendChild(fragment);
    }

    function openModal(index) {
        currentIndex = index;
        modal.style.display = "block";
        updateModal();
        preloadImages();
    }

    function closeModal() {
        modal.style.display = "none";
    }

    function updateModal() {
        modalImg.src = photos[currentIndex];
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % photos.length;
        updateModal();
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        updateModal();
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

    nextBtn.addEventListener("click", showNextImage);
    prevBtn.addEventListener("click", showPrevImage);
    closeBtn.addEventListener("click", closeModal);

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

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    loadGallery();
});
