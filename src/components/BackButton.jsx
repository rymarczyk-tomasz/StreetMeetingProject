import React from "react";
import { Link } from "react-router-dom";

const BackButton = () => {
    return (
        <Link to="/" className="back-btn">
            Wróć na stronę główną
        </Link>
    );
};

export default BackButton;