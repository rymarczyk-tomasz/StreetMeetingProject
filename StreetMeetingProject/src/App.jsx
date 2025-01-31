import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import EventSection from "./components/EventSection";
import GallerySection from "./components/GallerySection";
import FormSection from "./components/FormSection";
import Footer from "./components/Footer";
import ContactSection from "./components/ContactSection";

function App() {
    return (
        <>
            <Navbar />
            <Header />
            <main>
                <EventSection />
                <GallerySection />
                <ContactSection />
                <FormSection />
            </main>
            <Footer />
        </>
    );
}

export default App;
