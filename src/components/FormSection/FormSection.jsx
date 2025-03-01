const FormSection = () => {
    return (
        <section id="form" className="form bg-light text-dark py-5">
            <div className="container text-center">
                <h2 className="display-3 pb-lg-3 text-uppercase">
                    Formularz Strefa Select
                </h2>
                <form
                    id="registrationForm"
                    action="https://streetmeetingbackend.azurewebsites.net/upload"
                    method="post"
                    encType="multipart/form-data"
                >
                    <div className="mb-3">
                        <label htmlFor="firstName" className="form-label">
                            Imię:
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="lastName" className="form-label">
                            Nazwisko:
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">
                            E-mail:
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="phone" className="form-label">
                            Numer telefonu:
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="licensePlate" className="form-label">
                            Numer tablic rejestracyjnych:
                        </label>
                        <input
                            type="text"
                            id="licensePlate"
                            name="licensePlate"
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="carBrand" className="form-label">
                            Marka pojazdu:
                        </label>
                        <input
                            type="text"
                            id="carBrand"
                            name="carBrand"
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="carDescription" className="form-label">
                            Opis pojazdu:
                        </label>
                        <textarea
                            id="carDescription"
                            name="carDescription"
                            className="form-control"
                            rows="3"
                            required
                        ></textarea>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="photo" className="form-label">
                            Zdjęcie:
                        </label>
                        <input
                            type="file"
                            id="photo"
                            name="photo"
                            className="form-control"
                            accept="image/*"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary mt-3">
                        Wyślij formularz
                    </button>
                    <div className="privacy-policy">
                        <a
                            href="https://download.filekitcdn.com/d/uzeDKvVKHexiMfMTdLbQ4G/74vzptpgRGHpp6EDxgX22B"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Polityka prywatności
                        </a>
                    </div>
                </form>
                <div id="responseMessage" className="mt-3"></div>
            </div>
        </section>
    );
};

export default FormSection;
