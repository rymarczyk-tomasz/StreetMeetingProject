document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const closeBtn = document.querySelector(".close");
    const prevBtn = document.getElementById("prevImage");
    const nextBtn = document.getElementById("nextImage");

    if (!gallery || !modal || !modalImg) {
        console.error("Brak wymaganych elementów galerii");
        return;
    }

    const photos = [];
    let currentIndex = 0;

    async function getImageNames() {
        const fallback = [
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

        try {
            const response = await fetch(
                `img/gallery/manifest.json?t=${Date.now()}`,
                {
                    cache: "no-store",
                },
            );

            if (!response.ok) return fallback;

            const manifest = await response.json();
            if (!manifest || !Array.isArray(manifest.files)) return fallback;

            const files = manifest.files.filter(
                (name) => typeof name === "string",
            );
            return files.length ? files : fallback;
        } catch (error) {
            return fallback;
        }
    }

    async function loadGallery() {
        const imageFolder = "img/gallery";
        const imageNames = await getImageNames();

        const fragment = document.createDocumentFragment();

        imageNames.forEach((name, index) => {
            const photoPath = `${imageFolder}/${name}`;
            photos.push(photoPath);

            const base = name.replace(/\.[^.]+$/, "");
            const picture = document.createElement("picture");

            const sourceAvif = document.createElement("source");
            sourceAvif.type = "image/avif";
            sourceAvif.dataset.srcset = `img/optimized/gallery/${base}-400.avif 400w, img/optimized/gallery/${base}-800.avif 800w, img/optimized/gallery/${base}-1200.avif 1200w`;

            const sourceWebp = document.createElement("source");
            sourceWebp.type = "image/webp";
            sourceWebp.dataset.srcset = `img/optimized/gallery/${base}-400.webp 400w, img/optimized/gallery/${base}-800.webp 800w, img/optimized/gallery/${base}-1200.webp 1200w`;

            const img = document.createElement("img");
            img.dataset.src = photoPath;
            img.loading = "lazy";
            img.alt = `Zdjęcie z galerii Street Show ${index + 1}`;
            img.className = "gallery-thumb";

            img.addEventListener("click", () => {
                if (!img.src) img.src = img.dataset.src;
                openModal(photos.indexOf(photoPath));
            });

            img.addEventListener("error", () => {
                console.error(`Nie udało się załadować: ${photoPath}`);
                img.style.display = "none";
            });

            picture.appendChild(sourceAvif);
            picture.appendChild(sourceWebp);
            picture.appendChild(img);
            fragment.appendChild(picture);
        });

        const lazyLoad = (img) => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
            }
            const picture = img.parentElement;
            if (picture) {
                const sources = picture.querySelectorAll("source");
                sources.forEach((s) => {
                    if (s.dataset.srcset) {
                        s.srcset = s.dataset.srcset;
                        s.removeAttribute("data-srcset");
                    }
                });
            }
        };

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                (entries, obs) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            lazyLoad(entry.target);
                            obs.unobserve(entry.target);
                        }
                    });
                },
                { rootMargin: "200px" },
            );
            gallery.appendChild(fragment);
            gallery
                .querySelectorAll("img.gallery-thumb")
                .forEach((img) => observer.observe(img));
            return;
        }

        gallery.appendChild(fragment);
        gallery
            .querySelectorAll("img.gallery-thumb")
            .forEach((img) => lazyLoad(img));
    }

    function openModal(index) {
        currentIndex = index;
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
        updateModal();
        preloadImages();
    }

    function closeModal() {
        modal.style.display = "none";
        document.body.style.overflow = "";
        if (modalImg) modalImg.classList.remove("modal-image");
    }

    function updateModal() {
        modalImg.src = photos[currentIndex];
        modalImg.alt = `Powiększone zdjęcie ${currentIndex + 1} z ${photos.length}`;
        modalImg.classList.add("modal-image");
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

    if (nextBtn) {
        nextBtn.addEventListener("click", showNextImage);
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", showPrevImage);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

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

    modal.addEventListener("touchstart", handleTouchStart, { passive: true });
    modal.addEventListener("touchmove", handleTouchMove, { passive: true });
    modal.addEventListener("touchend", handleTouchEnd, { passive: true });

    loadGallery().catch((error) => {
        console.error("Błąd podczas ładowania galerii:", error);
    });
});
