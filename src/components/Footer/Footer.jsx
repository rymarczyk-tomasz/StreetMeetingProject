import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./Footer.module.css";

const Footer = () => {
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const newsletterRef = useRef(null);
    const scriptRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());

        if (location.pathname === "/" && !scriptRef.current) {
            const script = document.createElement("script");
            script.async = true;
            script.setAttribute("data-uid", "f7aa0c4987");
            script.src = "https://streetshow.kit.com/f7aa0c4987/index.js";
            scriptRef.current = script;
            if (newsletterRef.current) {
                newsletterRef.current.appendChild(script);
            }

            return () => {
                if (newsletterRef.current && scriptRef.current) {
                    newsletterRef.current.removeChild(scriptRef.current);
                    scriptRef.current = null;
                }
            };
        }
    }, [location.pathname]);

    return (
        <footer className={styles.footer}>
            {location.pathname === "/" && (
                <div className={styles.newsletter} ref={newsletterRef}></div>
            )}
            <p className={styles.footerText}>
                © {currentYear} Street Meeting Poland
            </p>
        </footer>
    );
};

export default Footer;
