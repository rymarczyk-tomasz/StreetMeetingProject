import React from "react";

const GallerySection = () => {
    return (
        <section id="gallery" className="bg-light text-dark py-5">
            <div className="container text-center">
                <h2 className="display-3 pb-lg-3 text-uppercase">Galeria</h2>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                    <div className="col">
                        <div className="card h-100">
                            <img
                                loading="lazy"
                                src="src/img/photos/Street Meeting Poland 2024-139.jpg"
                                className="card-img-top"
                                alt="Czeno biały nissan"
                            />
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100">
                            <img
                                loading="lazy"
                                src="src/img/photos/Street Meeting Poland 2024-252.jpg"
                                className="card-img-top"
                                alt="Czeno biały nissan"
                            />
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100">
                            <img
                                loading="lazy"
                                src="src/img/photos/2024.03.29 Street Meeting 2-13.jpg"
                                className="card-img-top"
                                alt="Czeno biały nissan"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="container text-center">
                <a
                    href="https://streetshow.pl/galeria.html"
                    className="gallery-btn"
                >
                    Przejdź do galerii
                </a>
            </div>
        </section>
    );
};

export default GallerySection;