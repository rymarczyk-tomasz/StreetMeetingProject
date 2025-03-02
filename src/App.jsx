import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Navbar from "./components/Navbar/Navbar";
import Header from "./components/Header/Header";
import EventSection from "./components/EventSection/EventSection";
import GallerySection from "./components/GallerySection/GallerySection";
import FormSection from "./components/FormSection/FormSection";
import Footer from "./components/Footer/Footer";
import ContactSection from "./components/ContactSection/ContactSection";
import { Routes, Route } from "react-router-dom";
import Regulations from "./pages/RegulationsPage/RegulationsPage";
import FAQ from "./pages/FaqPage/FaqPage";
import GalleryPage from "./pages/GalleryPage/GalleryPage"; // Importuj GalleryPage

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
                <Route path="/gallery" element={<GalleryPage />} />{" "}
                {/* Dodaj trasę dla GalleryPage */}
            </Routes>
            <Footer />
        </>
    );
}

export default App;
