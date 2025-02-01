import React from "react";

const Modal = () => {
    return (
        <div id="imageModal" className="modal">
            <span className="close">&times;</span>
            <img className="modal-content" id="modalImage" />
            <div className="navigation">
                <span className="prev" id="prevImage">
                    &#10094;
                </span>
                <span className="next" id="nextImage">
                    &#10095;
                </span>
            </div>
        </div>
    );
};

export default Modal;