import { useState, useEffect, useRef } from "react";
import styles from "./FormSection.module.css";
import { FORM_ACTION_URL } from "../../constants";

const FormSection = () => {
    const [responseMessage, setResponseMessage] = useState("");
    const [messageColor, setMessageColor] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const firstErrorFieldRef = useRef(null);
    const [dots, setDots] = useState("");

    useEffect(() => {
        if (Object.keys(formErrors).length > 0 && firstErrorFieldRef.current) {
            firstErrorFieldRef.current.focus();
        }
    }, [formErrors]);

    useEffect(() => {
        let interval;
        if (
            isLoading &&
            responseMessage === "Wysyłanie formularza, proszę czekać"
        ) {
            interval = setInterval(() => {
                setDots((prev) => (prev.length < 3 ? prev + "." : ""));
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isLoading, responseMessage]);

    const validateForm = (form) => {
        const errors = {};
        const email = form.email.value.trim();
        const phone = form.phone.value.trim();
        const files = form.photos.files;
        const firstName = form.firstName.value.trim();
        const lastName = form.lastName.value.trim();
        const licensePlate = form.licensePlate.value.trim();
        const carBrand = form.carBrand.value.trim();
        const carDescription = form.carDescription.value.trim();

        if (!firstName) errors.firstName = "Imię jest wymagane.";
        if (!lastName) errors.lastName = "Nazwisko jest wymagane.";
        if (!licensePlate)
            errors.licensePlate = "Numer tablic rejestracyjnych jest wymagany.";
        if (!carBrand) errors.carBrand = "Marka pojazdu jest wymagana.";
        if (!carDescription)
            errors.carDescription = "Opis pojazdu jest wymagany.";

        if (!email) {
            errors.email = "E-mail jest wymagany.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Proszę podać poprawny adres e-mail.";
        }

        if (!phone) {
            errors.phone = "Numer telefonu jest wymagany.";
        } else if (!/^\d{9}$/.test(phone)) {
            errors.phone = "Proszę podać poprawny numer telefonu (9 cyfr).";
        }

        if (files.length === 0) {
            errors.photos = "Proszę przesłać co najmniej jedno zdjęcie.";
        } else {
            if (files.length > 5) {
                errors.photos = "Możesz przesłać maksymalnie 5 zdjęć.";
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.type.startsWith("image/")) {
                    errors.photos =
                        "Proszę przesłać tylko pliki graficzne (np. JPG, PNG).";
                    break;
                }
            }

            const totalSize = Array.from(files).reduce(
                (sum, file) => sum + file.size,
                0
            );
            if (totalSize > 50 * 1024 * 1024) {
                errors.photos =
                    "Łączny rozmiar zdjęć nie może przekraczać 50 MB.";
            }
        }

        return errors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setResponseMessage("Wysyłanie formularza, proszę czekać");
        setMessageColor("blue");
        setFormErrors({});

        const form = event.target;
        const errors = validateForm(form);

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setIsLoading(false);
            setResponseMessage("");
            setMessageColor("");
            return;
        }

        const formData = new FormData(form);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(FORM_ACTION_URL, {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                setResponseMessage(
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)"
                );
                setMessageColor("green");
                form.reset();
                setFormErrors({});
            } else {
                const error = await response.json();
                setResponseMessage(
                    `Błąd: ${
                        error.message ||
                        "Wystąpił błąd przy wysyłaniu formularza."
                    }`
                );
                setMessageColor("red");
            }
        } catch (error) {
            if (error.name === "AbortError") {
                setResponseMessage(
                    "Przekroczono czas oczekiwania na odpowiedź serwera. Spróbuj ponownie później."
                );
            } else {
                setResponseMessage(
                    "Wystąpił błąd przy wysyłaniu formularza. Sprawdź swoje połączenie internetowe i spróbuj ponownie."
                );
            }
            setMessageColor("red");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section id="form" className={styles.form}>
            <div className="container text-center">
                <h2
                    className={`${styles.formTitle} display-3 pb-lg-3 text-uppercase`}
                >
                    Formularz Strefa Select
                </h2>
                <form
                    id="registrationForm"
                    onSubmit={handleSubmit}
                    encType="multipart/form-data"
                    className={styles.formContainer}
                >
                    <div className="mb-3">
                        <label htmlFor="firstName" className={styles.formLabel}>
                            Imię:
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            className={`form-control ${
                                formErrors.firstName ? "is-invalid" : ""
                            }`}
                            required
                            aria-invalid={!!formErrors.firstName}
                            aria-describedby={
                                formErrors.firstName
                                    ? "firstNameError"
                                    : undefined
                            }
                            ref={
                                formErrors.firstName ? firstErrorFieldRef : null
                            }
                        />
                        {formErrors.firstName && (
                            <div
                                id="firstNameError"
                                className="invalid-feedback"
                            >
                                {formErrors.firstName}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="lastName" className={styles.formLabel}>
                            Nazwisko:
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            className={`form-control ${
                                formErrors.lastName ? "is-invalid" : ""
                            }`}
                            required
                            aria-invalid={!!formErrors.lastName}
                            aria-describedby={
                                formErrors.lastName
                                    ? "lastNameError"
                                    : undefined
                            }
                            ref={
                                formErrors.lastName && !formErrors.firstName
                                    ? firstErrorFieldRef
                                    : null
                            }
                        />
                        {formErrors.lastName && (
                            <div
                                id="lastNameError"
                                className="invalid-feedback"
                            >
                                {formErrors.lastName}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="email" className={styles.formLabel}>
                            E-mail:
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className={`form-control ${
                                formErrors.email ? "is-invalid" : ""
                            }`}
                            required
                            aria-invalid={!!formErrors.email}
                            aria-describedby={
                                formErrors.email ? "emailError" : undefined
                            }
                            ref={
                                formErrors.email &&
                                !formErrors.firstName &&
                                !formErrors.lastName
                                    ? firstErrorFieldRef
                                    : null
                            }
                        />
                        {formErrors.email && (
                            <div id="emailError" className="invalid-feedback">
                                {formErrors.email}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="phone" className={styles.formLabel}>
                            Numer telefonu:
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            className={`form-control ${
                                formErrors.phone ? "is-invalid" : ""
                            }`}
                            required
                            aria-invalid={!!formErrors.phone}
                            aria-describedby={
                                formErrors.phone ? "phoneError" : undefined
                            }
                            ref={
                                formErrors.phone &&
                                !formErrors.firstName &&
                                !formErrors.lastName &&
                                !formErrors.email
                                    ? firstErrorFieldRef
                                    : null
                            }
                        />
                        {formErrors.phone && (
                            <div id="phoneError" className="invalid-feedback">
                                {formErrors.phone}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label
                            htmlFor="licensePlate"
                            className={styles.formLabel}
                        >
                            Numer tablic rejestracyjnych:
                        </label>
                        <input
                            type="text"
                            id="licensePlate"
                            name="licensePlate"
                            className={`form-control ${
                                formErrors.licensePlate ? "is-invalid" : ""
                            }`}
                            required
                            aria-invalid={!!formErrors.licensePlate}
                            aria-describedby={
                                formErrors.licensePlate
                                    ? "licensePlateError"
                                    : undefined
                            }
                            ref={
                                formErrors.licensePlate &&
                                !formErrors.firstName &&
                                !formErrors.lastName &&
                                !formErrors.email &&
                                !formErrors.phone
                                    ? firstErrorFieldRef
                                    : null
                            }
                        />
                        {formErrors.licensePlate && (
                            <div
                                id="licensePlateError"
                                className="invalid-feedback"
                            >
                                {formErrors.licensePlate}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="carBrand" className={styles.formLabel}>
                            Marka pojazdu:
                        </label>
                        <input
                            type="text"
                            id="carBrand"
                            name="carBrand"
                            className={`form-control ${
                                formErrors.carBrand ? "is-invalid" : ""
                            }`}
                            required
                            aria-invalid={!!formErrors.carBrand}
                            aria-describedby={
                                formErrors.carBrand
                                    ? "carBrandError"
                                    : undefined
                            }
                            ref={
                                formErrors.carBrand &&
                                !formErrors.firstName &&
                                !formErrors.lastName &&
                                !formErrors.email &&
                                !formErrors.phone &&
                                !formErrors.licensePlate
                                    ? firstErrorFieldRef
                                    : null
                            }
                        />
                        {formErrors.carBrand && (
                            <div
                                id="carBrandError"
                                className="invalid-feedback"
                            >
                                {formErrors.carBrand}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label
                            htmlFor="carDescription"
                            className={styles.formLabel}
                        >
                            Opis pojazdu:
                        </label>
                        <textarea
                            id="carDescription"
                            name="carDescription"
                            className={`form-control ${
                                formErrors.carDescription ? "is-invalid" : ""
                            }`}
                            rows="3"
                            required
                            aria-invalid={!!formErrors.carDescription}
                            aria-describedby={
                                formErrors.carDescription
                                    ? "carDescriptionError"
                                    : undefined
                            }
                            ref={
                                formErrors.carDescription &&
                                !formErrors.firstName &&
                                !formErrors.lastName &&
                                !formErrors.email &&
                                !formErrors.phone &&
                                !formErrors.licensePlate &&
                                !formErrors.carBrand
                                    ? firstErrorFieldRef
                                    : null
                            }
                        ></textarea>
                        {formErrors.carDescription && (
                            <div
                                id="carDescriptionError"
                                className="invalid-feedback"
                            >
                                {formErrors.carDescription}
                            </div>
                        )}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="photos" className={styles.formLabel}>
                            Zdjęcia (maksymalnie 5 o łącznej wadze do 50MB):
                        </label>
                        <input
                            type="file"
                            id="photos"
                            name="photos"
                            className={`form-control ${
                                formErrors.photos ? "is-invalid" : ""
                            }`}
                            accept="image/*"
                            multiple
                            required
                            aria-invalid={!!formErrors.photos}
                            aria-describedby={
                                formErrors.photos ? "photosError" : undefined
                            }
                            ref={
                                formErrors.photos &&
                                !formErrors.firstName &&
                                !formErrors.lastName &&
                                !formErrors.email &&
                                !formErrors.phone &&
                                !formErrors.licensePlate &&
                                !formErrors.carBrand &&
                                !formErrors.carDescription
                                    ? firstErrorFieldRef
                                    : null
                            }
                        />
                        {formErrors.photos && (
                            <div id="photosError" className="invalid-feedback">
                                {formErrors.photos}
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                        aria-busy={isLoading}
                    >
                        {isLoading ? "Wysyłanie..." : "Wyślij formularz"}
                    </button>
                    <div className={styles.privacyPolicy}>
                        <a
                            href="/documents/regulations.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Polityka prywatności
                        </a>
                    </div>
                </form>
                {responseMessage && (
                    <div
                        id="responseMessage"
                        className="mt-3"
                        style={{ color: messageColor }}
                        role="alert"
                        aria-live="polite"
                    >
                        {responseMessage}
                        {isLoading &&
                            responseMessage ===
                                "Wysyłanie formularza, proszę czekać" && (
                                <span>{dots}</span>
                            )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default FormSection;
