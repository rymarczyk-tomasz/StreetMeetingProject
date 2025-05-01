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

        imageNames.forEach((name) => {
            const photoPath = `${imageFolder}/${name}`;
            photos.push(photoPath);

            const img = document.createElement("img");
            img.src = photoPath;
            img.loading = "lazy";
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
        modalImg.style.display = "block";
        modalImg.style.margin = "auto";
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

    modal.addEventListener("touchstart", handleTouchStart, false);
    modal.addEventListener("touchmove", handleTouchMove, false);
    modal.addEventListener("touchend", handleTouchEnd, false);

    loadGallery();
});
