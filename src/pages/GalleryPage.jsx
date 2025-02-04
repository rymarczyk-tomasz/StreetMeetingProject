import React, { useState, useEffect } from "react";
import Modal from "../components/Modal";
import BackButton from "../components/BackButton";

const Gallery = () => {
    const [photos, setPhotos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(null);

    useEffect(() => {
        const imageFolder = "src/img/gallery";
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
            <BackButton />
        </>
    );
};

export default Gallery;
