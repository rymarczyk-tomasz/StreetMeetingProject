import React from "react";

const Card = ({ imgSrc, imgAlt, title, children }) => {
    return (
        <div className="col">
            <div className="card h-100">
                <img
                    loading="lazy"
                    src={imgSrc}
                    className="card-img-top"
                    alt={imgAlt}
                />
                {(title || children) && (
                    <div className="card-body">
                        {title && <h3 className="card-title py-3">{title}</h3>}
                        {children && <p className="card-text">{children}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Card;
