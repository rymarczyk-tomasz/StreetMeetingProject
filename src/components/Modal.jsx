import React from "react";

const Modal = ({ photo, onClose, onNext, onPrev }) => {
    const handleClickOutside = (e) => {
        if (e.target.id === "imageModal") {
            onClose();
        }
    };

    return (
        <div id="imageModal" className="modal" style={{ display: "block" }} onClick={handleClickOutside}>
            <span className="close" onClick={onClose}>&times;</span>
            <img className="modal-content" id="modalImage" src={photo} alt="Modal" />
            <div className="navigation">
                <span className="prev" id="prevImage" onClick={onPrev}>
                    &#10094;
                </span>
                <span className="next" id="nextImage" onClick={onNext}>
                    &#10095;
                </span>
            </div>
        </div>
    );
};

export default Modal;