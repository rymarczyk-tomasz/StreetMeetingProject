import React, { useEffect } from "react";

const Footer = () => {
    useEffect(() => {
        const footerYear = document.querySelector(".footer-year");
        const currentYear = new Date().getFullYear();
        footerYear.innerText = currentYear;
    }, []);

    return (
        <footer className="bg-dark text-light">
            <div className="newsletter">
                <script
                    async
                    data-uid="f7aa0c4987"
                    src="https://streetshow.kit.com/f7aa0c4987/index.js"
                ></script>
            </div>
            <p className="text-center mb-0 py-3">
                &copy; <span className="footer-year"></span> Street Meeting
                Poland
            </p>
        </footer>
    );
};

export default Footer;