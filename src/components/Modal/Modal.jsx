import { useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import styles from "./Modal.module.css";

const Modal = ({
    photo,
    onClose,
    onNext,
    onPrev,
    altText = "Zdjęcie z galerii",
}) => {
    const handleClickOutside = (e) => {
        if (e.target.id === "imageModal") {
            onClose();
        }
    };

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onPrev();
            if (e.key === "ArrowRight") onNext();
        },
        [onClose, onNext, onPrev]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div
            id="imageModal"
            className={`${styles.modal} ${styles.modalVisible}`}
            onClick={handleClickOutside}
            role="dialog"
            aria-labelledby="modalImage"
            aria-modal="true"
        >
            <button
                className={styles.close}
                onClick={onClose}
                aria-label="Zamknij modal"
            >
                ×
            </button>
            <img
                className={styles.modalContent}
                id="modalImage"
                src={photo}
                alt={altText}
            />
            <div className={styles.navigation}>
                <button
                    className={styles.prev}
                    onClick={onPrev}
                    aria-label="Poprzednie zdjęcie"
                >
                    ❮
                </button>
                <button
                    className={styles.next}
                    onClick={onNext}
                    aria-label="Następne zdjęcie"
                >
                    ❯
                </button>
            </div>
        </div>
    );
};

Modal.propTypes = {
    photo: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onPrev: PropTypes.func.isRequired,
    altText: PropTypes.string,
};

export default Modal;
