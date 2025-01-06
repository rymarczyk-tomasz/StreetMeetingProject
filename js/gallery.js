document.addEventListener("DOMContentLoaded", () => {
    const gallery = document.getElementById("gallery-folder");

    async function loadGallery() {
        try {
            const response = await fetch("http://127.0.0.1:3000/api/gallery");
            if (!response.ok) throw new Error("Nie udało się pobrać zdjęć.");

            const photos = await response.json();

            photos.forEach((photo) => {
                const img = document.createElement("img");
                img.src = `http://127.0.0.1:3000${photo.path}`; // Dodanie poprawnego URL
                img.alt = photo.name;
                img.style.maxWidth = "300px";
                img.style.margin = "10px";
                gallery.appendChild(img);
            });
        } catch (error) {
            console.error("Błąd przy generowaniu galerii:", error.message);
        }
    }

    loadGallery();
});
