import styles from "./Header.module.css";
import { buildAssetPath } from "../../constants";
import { useState, useEffect } from "react";

const Header = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const bgImage = isMobile
    ? buildAssetPath("/img/photos/hero_image-mobile.webp")
    : buildAssetPath("/photos/Hero-image.webp");

  return (
    <header
      id="home"
      className={styles.home}
      style={{
        backgroundImage: `url("${bgImage}")`,
      }}
    >
      <div
        className={`${styles.heroContent} container-fluid h-100 d-flex flex-column justify-content-center align-items-center text-light text-center`}
      >
        <h1 className="display-3 text-uppercase">Street Show 2025</h1>
        <h2 className="mb-2 display-5 text-uppercase">31 maja</h2>
        <h2 className="mb-2 text-uppercase">Polsat Plus Arena, Gdańsk</h2>
        <a
          href="https://bkb.pl/151648-edcca"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaButton}
        >
          Kup bilet
        </a>
        <div className={styles.heroShadow}></div>
      </div>
    </header>
  );
};

export default Header;
