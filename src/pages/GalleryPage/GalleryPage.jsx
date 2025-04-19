import { useState } from "react";
import Modal from "../../components/Modal/Modal";
import useMetaTags from "../../hooks/useMetaTags";
import styles from "./GalleryPage.module.css";

const images = Array.from({ length: 13 }, (_, i) => ({
    src: `/gallery/${i + 1}.webp`,
    alt: `Zdjęcie z wydarzenia motoryzacyjnego ${i + 1}`,
}));

const GalleryPage = () => {
    const [selectedImage, setSelectedImage] = useState(null);

    useMetaTags({
        title: "Galeria - Street Meeting Poland 2025",
        description:
            "Galeria zdjęć z wydarzenia Street Meeting Poland 2025. Zobacz najlepsze momenty z Polsat Plus Arena w Gdańsku!",
        keywords:
            "Galeria, Street Meeting Poland, 2025, Polsat Plus Arena, Gdańsk, wydarzenie motoryzacyjne, zdjęcia",
        ogTitle: "Galeria - Street Meeting Poland 2025",
        ogDescription:
            "Galeria zdjęć z wydarzenia Street Meeting Poland 2025. Zobacz najlepsze momenty z Polsat Plus Arena w Gdańsku!",
        ogUrl: "https://www.streetshow.pl/gallery",
        canonical: "https://www.streetshow.pl/gallery",
    });

    const openModal = (image) => setSelectedImage(image);
    const closeModal = () => setSelectedImage(null);

    // Funkcja do przechodzenia do następnego zdjęcia
    const handleNext = () => {
        const currentIndex = images.findIndex(
            (img) => img.src === selectedImage.src
        );
        const nextIndex = (currentIndex + 1) % images.length; // Zapętlanie do pierwszego zdjęcia
        setSelectedImage(images[nextIndex]);
    };

    // Funkcja do przechodzenia do poprzedniego zdjęcia
    const handlePrev = () => {
        const currentIndex = images.findIndex(
            (img) => img.src === selectedImage.src
        );
        const prevIndex = (currentIndex - 1 + images.length) % images.length; // Zapętlanie do ostatniego zdjęcia
        setSelectedImage(images[prevIndex]);
    };

    return (
        <div className={styles.galleryContainer}>
            <h1 className={styles.galleryTitle}>Galeria</h1>
            <div className={styles.galleryGrid}>
                {images.map((image, index) => (
                    <img
                        key={index}
                        src={image.src}
                        alt={image.alt}
                        className={styles.galleryImage}
                        onClick={() => openModal(image)}
                        loading="lazy"
                    />
                ))}
            </div>
            {selectedImage && (
                <Modal
                    photo={selectedImage.src}
                    altText={selectedImage.alt}
                    onClose={closeModal}
                    onNext={handleNext}
                    onPrev={handlePrev}
                />
            )}
        </div>
    );
};

export default GalleryPage;
