import styles from "./Header.module.css";

const Header = () => {
    return (
        <header id="home" className={styles.home}>
            <div
                className={`${styles.heroContent} container-fluid h-100 d-flex flex-column justify-content-center align-items-center text-light text-center`}
            >
                <h1 className="display-3 text-uppercase">Street Show</h1>
                <div className={styles.heroShadow}></div>
            </div>
        </header>
    );
};

export default Header;
