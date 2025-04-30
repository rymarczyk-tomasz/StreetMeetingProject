import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import styles from "./FormSection.module.css";
import { FORM_ACTION_URL } from "../../constants";

const FormSection = () => {
    const [responseMessage, setResponseMessage] = useState("");
    const [messageColor, setMessageColor] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [dots, setDots] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setFocus,
    } = useForm({
        mode: "onSubmit",
        reValidateMode: "onChange",
    });

    useEffect(() => {
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
            setFocus(firstErrorField);
        }
    }, [errors, setFocus]);

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

    const validateFiles = (files) => {
        if (files.length === 0) {
            return "Proszę przesłać co najmniej jedno zdjęcie.";
        }
        if (files.length > 5) {
            return "Możesz przesłać maksymalnie 5 zdjęć.";
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("image/")) {
                return "Proszę przesłać tylko pliki graficzne (np. JPG, PNG).";
            }
        }

        const totalSize = Array.from(files).reduce(
            (sum, file) => sum + file.size,
            0
        );
        if (totalSize > 50 * 1024 * 1024) {
            return "Łączny rozmiar zdjęć nie może przekraczać 50 MB.";
        }

        return true;
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        setResponseMessage("Wysyłanie formularza, proszę czekać");
        setMessageColor("blue");

        const formData = new FormData();
        formData.append("firstName", data.firstName);
        formData.append("lastName", data.lastName);
        formData.append("email", data.email);
        formData.append("phone", data.phone);
        formData.append("licensePlate", data.licensePlate);
        formData.append("carBrand", data.carBrand);
        formData.append("carDescription", data.carDescription);
        Array.from(data.photos).forEach((file) =>
            formData.append("photos", file)
        );

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
                reset();
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
                    onSubmit={handleSubmit(onSubmit)}
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
                            className={`form-control ${
                                errors.firstName ? "is-invalid" : ""
                            }`}
                            {...register("firstName", {
                                required: "Imię jest wymagane.",
                            })}
                            aria-invalid={!!errors.firstName}
                            aria-describedby={
                                errors.firstName ? "firstNameError" : undefined
                            }
                        />
                        {errors.firstName && (
                            <div
                                id="firstNameError"
                                className="invalid-feedback"
                            >
                                {errors.firstName.message}
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
                            className={`form-control ${
                                errors.lastName ? "is-invalid" : ""
                            }`}
                            {...register("lastName", {
                                required: "Nazwisko jest wymagane.",
                            })}
                            aria-invalid={!!errors.lastName}
                            aria-describedby={
                                errors.lastName ? "lastNameError" : undefined
                            }
                        />
                        {errors.lastName && (
                            <div
                                id="lastNameError"
                                className="invalid-feedback"
                            >
                                {errors.lastName.message}
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
                            className={`form-control ${
                                errors.email ? "is-invalid" : ""
                            }`}
                            {...register("email", {
                                required: "E-mail jest wymagany.",
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message:
                                        "Proszę podać poprawny adres e-mail.",
                                },
                            })}
                            aria-invalid={!!errors.email}
                            aria-describedby={
                                errors.email ? "emailError" : undefined
                            }
                        />
                        {errors.email && (
                            <div id="emailError" className="invalid-feedback">
                                {errors.email.message}
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
                            className={`form-control ${
                                errors.phone ? "is-invalid" : ""
                            }`}
                            {...register("phone", {
                                required: "Numer telefonu jest wymagany.",
                                pattern: {
                                    value: /^\d{9}$/,
                                    message:
                                        "Proszę podać poprawny numer telefonu (9 cyfr).",
                                },
                            })}
                            aria-invalid={!!errors.phone}
                            aria-describedby={
                                errors.phone ? "phoneError" : undefined
                            }
                        />
                        {errors.phone && (
                            <div id="phoneError" className="invalid-feedback">
                                {errors.phone.message}
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
                            className={`form-control ${
                                errors.licensePlate ? "is-invalid" : ""
                            }`}
                            {...register("licensePlate", {
                                required:
                                    "Numer tablic rejestracyjnych jest wymagany.",
                            })}
                            aria-invalid={!!errors.licensePlate}
                            aria-describedby={
                                errors.licensePlate
                                    ? "licensePlateError"
                                    : undefined
                            }
                        />
                        {errors.licensePlate && (
                            <div
                                id="licensePlateError"
                                className="invalid-feedback"
                            >
                                {errors.licensePlate.message}
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
                            className={`form-control ${
                                errors.carBrand ? "is-invalid" : ""
                            }`}
                            {...register("carBrand", {
                                required: "Marka pojazdu jest wymagana.",
                            })}
                            aria-invalid={!!errors.carBrand}
                            aria-describedby={
                                errors.carBrand ? "carBrandError" : undefined
                            }
                        />
                        {errors.carBrand && (
                            <div
                                id="carBrandError"
                                className="invalid-feedback"
                            >
                                {errors.carBrand.message}
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
                            className={`form-control ${
                                errors.carDescription ? "is-invalid" : ""
                            }`}
                            rows="3"
                            {...register("carDescription", {
                                required: "Opis pojazdu jest wymagany.",
                            })}
                            aria-invalid={!!errors.carDescription}
                            aria-describedby={
                                errors.carDescription
                                    ? "carDescriptionError"
                                    : undefined
                            }
                        />
                        {errors.carDescription && (
                            <div
                                id="carDescriptionError"
                                className="invalid-feedback"
                            >
                                {errors.carDescription.message}
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
                            className={`form-control ${
                                errors.photos ? "is-invalid" : ""
                            }`}
                            accept="image/*"
                            multiple
                            {...register("photos", {
                                required:
                                    "Proszę przesłać co najmniej jedno zdjęcie.",
                                validate: validateFiles,
                            })}
                            aria-invalid={!!errors.photos}
                            aria-describedby={
                                errors.photos ? "photosError" : undefined
                            }
                        />
                        {errors.photos && (
                            <div id="photosError" className="invalid-feedback">
                                {errors.photos.message}
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
