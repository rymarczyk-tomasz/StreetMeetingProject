document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeBtn = document.querySelector(".close");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");

    let photos = [];
    let currentIndex = 0;

    function loadGallery() {
        const imageFolder = "img/gallery"; // Ścieżka do folderu ze zdjęciami
        const imageExtensions = ["jpg", "jpeg", "png", "gif"];

        // Mocking an array of image names (in a real case, you'd get this list dynamically)
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

        photos = imageNames.map((name) => `${imageFolder}/${name}`);

        photos.forEach((photoPath, index) => {
            const img = document.createElement("img");
            img.src = photoPath;
            img.loading = "lazy"; // Lazy loading
            img.style.maxWidth = "300px";
            img.style.margin = "10px";

            img.addEventListener("click", () => {
                openModal(index);
            });

            gallery.appendChild(img);
        });
    }

    function openModal(index) {
        currentIndex = index;
        modal.style.display = "block";
        updateModal();
    }

    function closeModal() {
        modal.style.display = "none";
    }

    function updateModal() {
        const photo = photos[currentIndex];
        modalImg.src = photo;
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % photos.length;
        updateModal();
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        updateModal();
    }

    nextBtn.addEventListener("click", showNextImage);
    prevBtn.addEventListener("click", showPrevImage);
    closeBtn.addEventListener("click", closeModal);

    window.addEventListener("keydown", (e) => {
        if (modal.style.display === "block") {
            if (e.key === "ArrowRight") showNextImage();
            if (e.key === "ArrowLeft") showPrevImage();
            if (e.key === "Escape") closeModal();
        }
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    loadGallery();
});
