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
import { Routes, Route } from "react-router-dom";
import Regulations from "./pages/RegulationsPage";
import FAQ from "./pages/FaqPage";

function App() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route
                    path="/"
                    element={
                        <>
                            <Header />
                            <main>
                                <EventSection />
                                <GallerySection />
                                <ContactSection />
                                <FormSection />
                            </main>
                        </>
                    }
                />
                <Route path="/regulations" element={<Regulations />} />
                <Route path="/faq" element={<FAQ />} />
            </Routes>
            <Footer />
        </>
    );
}

export default App;
