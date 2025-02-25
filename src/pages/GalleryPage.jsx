import { useState, useEffect } from "react";
import Modal from "../components/Modal";

const Gallery = () => {
    const [photos, setPhotos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(null);

    useEffect(() => {
        const imageFolder = "/img/gallery";
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

        const loadedPhotos = imageNames.map((name) => `${imageFolder}/${name}`);
        setPhotos(loadedPhotos);
    }, []);

    const openModal = (index) => {
        setCurrentIndex(index);
    };

    const closeModal = () => {
        setCurrentIndex(null);
    };

    const showNextImage = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    };

    const showPrevImage = () => {
        setCurrentIndex(
            (prevIndex) => (prevIndex - 1 + photos.length) % photos.length
        );
    };

    return (
        <>
            <div id="gallery-folder" className="gallery container">
                {photos.map((photo, index) => (
                    <img
                        key={index}
                        src={photo}
                        alt={`Gallery image ${index + 1}`}
                        style={{ maxWidth: "300px", margin: "10px" }}
                        onClick={() => openModal(index)}
                    />
                ))}
            </div>
            {currentIndex !== null && (
                <Modal
                    photo={photos[currentIndex]}
                    onClose={closeModal}
                    onNext={showNextImage}
                    onPrev={showPrevImage}
                />
            )}
        </>
    );
};

export default Gallery;
