import styles from "./Card.module.css";

const Card = ({ imgSrc, imgAlt, title, children }) => {
  return (
    <div className="col">
      <div className="card h-100">
        <img
          loading="lazy"
          src={imgSrc}
          className={styles.cardImgTop}
          alt={imgAlt}
        />
        {(title || children) && (
          <div className="card-body">
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {children && <p className="card-text">{children}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;