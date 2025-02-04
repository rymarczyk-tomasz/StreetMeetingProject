import React, { useEffect, useRef } from "react";

const Footer = () => {
    const footerYearRef = useRef(null);
    const newsletterRef = useRef(null);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        if (footerYearRef.current) {
            footerYearRef.current.innerText = currentYear;
        }

        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("data-uid", "f7aa0c4987");
        script.src = "https://streetshow.kit.com/f7aa0c4987/index.js";
        if (newsletterRef.current) {
            newsletterRef.current.appendChild(script);
        }

        return () => {
            if (newsletterRef.current) {
                newsletterRef.current.removeChild(script);
            }
        };
    }, []);

    return (
        <footer className="bg-dark text-light">
            <div className="newsletter" ref={newsletterRef}></div>
            <p className="text-center mb-0 py-3">
                &copy; <span ref={footerYearRef} className="footer-year"></span>{" "}
                Street Meeting Poland
            </p>
        </footer>
    );
};

export default Footer;
