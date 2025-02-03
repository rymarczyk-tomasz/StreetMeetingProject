import React from "react";
import Modal from "src/components/Modal";
import BackButton from "../components/BackButton";

const Gallery = () => {
    return (
        <>
            <div id="gallery-folder" className="gallery container"></div>
            <Modal />
            <BackButton />
        </>
    );
};

export default Gallery;
