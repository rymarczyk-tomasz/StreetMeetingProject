import styles from "./ContactSection.module.css";
import { SOCIAL_MEDIA_LINKS } from "../../constants";

const ContactSection = () => {
    return (
        <section id="contact" className={styles.contact}>
            <div className="container text-center">
                <h2 className="display-3 pb-lg-3 text-uppercase">kontakt</h2>
                <div className="row">
                    <div
                        className={`${styles.contactInfo} col-lg-6 mt-4 m-lg-0`}
                    >
                        <h3>Social media:</h3>
                        <a
                            className={styles.socialMedia}
                            href={SOCIAL_MEDIA_LINKS.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="bi bi-facebook"></i>
                        </a>
                        <a
                            className={styles.socialMedia}
                            href={SOCIAL_MEDIA_LINKS.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="bi bi-instagram"></i>
                        </a>
                    </div>
                    <div
                        className={`${styles.contactInfo} col-lg-6 mt-4 m-lg-0`}
                    >
                        <h3>Adres:</h3>
                        <p>Street Meeting Poland</p>
                        <a
                            href="http://maps.app.goo.gl/PePJY3TXBjM7t4v37"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.links}
                        >
                            <p>
                                <i className="bi bi-geo-alt"></i> ul. Pokoleń
                                Lechia Gdańsk 1 <br />
                                80-560 Gdańsk
                            </p>
                        </a>
                        <a
                            href="mailto:streetmeetingpolska@gmail.com"
                            className={styles.links}
                        >
                            <p>
                                <i className="bi bi-at"></i>{" "}
                                streetmeetingpolska@gmail.com
                            </p>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
