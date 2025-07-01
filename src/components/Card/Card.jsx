import { useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import styles from "./card.module.css";

const Card = ({
    imgSrc,
    imgAlt,
    title = "",
    children = null,
    content = "",
    isHtml = false,
    link = "",
    className = "",
    imgHeight = "250px",
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    const handleLinkClick = (title) => {
        if (window.gtag) {
            window.gtag("event", "card_click", {
                event_category: "Card",
                event_label: title,
            });
        }
    };

    const renderContent = () => {
        if (content) {
            if (isHtml) {
                return (
                    <div
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(content),
                        }}
                    />
                );
            }
            return <p className={styles.cardText}>{content}</p>;
        }

        if (children) {
            return <p className={styles.cardText}>{children}</p>;
        }
        return null;
    };

    return (
        <div className={`${styles.cardWrapper} col ${className}`}>
            <div className={styles.card}>
                {imageError ? (
                    <div
                        className={styles.imagePlaceholder}
                        style={{ height: imgHeight }}
                        aria-label="Obraz nie został załadowany"
                    >
                        Brak zdjęcia
                    </div>
                ) : (
                    <>
                        {!imageLoaded && (
                            <div
                                className={styles.imageLoading}
                                style={{ height: imgHeight }}
                            >
                                <span className={styles.spinner}></span>
                            </div>
                        )}
                        <LazyLoadImage
                            src={imgSrc}
                            alt={imgAlt}
                            className={styles.cardImgTop}
                            onError={handleImageError}
                            onLoad={handleImageLoad}
                            style={{ height: imgHeight }}
                        />
                    </>
                )}
                {(title || content || children) && (
                    <div className={styles.cardBody}>
                        {title &&
                            (link ? (
                                <h3 className={styles.cardTitle}>
                                    <a
                                        href={link}
                                        className={styles.cardLink}
                                        aria-label={`Przejdź do ${title}`}
                                        onClick={() => handleLinkClick(title)}
                                    >
                                        {title}
                                    </a>
                                </h3>
                            ) : (
                                <h3 className={styles.cardTitle}>{title}</h3>
                            ))}
                        {renderContent()}
                    </div>
                )}
            </div>
        </div>
    );
};

Card.propTypes = {
    imgSrc: PropTypes.string.isRequired,
    imgAlt: PropTypes.string.isRequired,
    title: PropTypes.string,
    children: PropTypes.node,
    content: PropTypes.string,
    isHtml: PropTypes.bool,
    link: PropTypes.string,
    className: PropTypes.string,
    imgHeight: PropTypes.string,
};

export default Card;
