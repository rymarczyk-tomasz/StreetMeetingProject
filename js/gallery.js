const gallery = document.getElementById("gallery-folder");

// Funkcja asynchroniczna do ładowania galerii
async function loadGallery() {
    try {
        // Pobierz listę zdjęć z serwera
        const response = await fetch("http://127.0.0.1:3000/api/gallery");
        if (!response.ok) throw new Error("Nie udało się pobrać zdjęć.");

        const photos = await response.json();

        // Wyświetl zdjęcia w galerii
        photos.forEach((photo) => {
            const img = document.createElement("img");
            img.src = photo.url;
            img.alt = photo.name;
            img.style.maxWidth = "300px";
            img.style.margin = "10px";
            gallery.appendChild(img);
        });
    } catch (error) {
        console.error("Błąd przy generowaniu galerii:", error.message);
    }
}

// Wywołaj funkcję asynchroniczną do ładowania galerii
loadGallery();
