import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar/NavBar";
import HomePage from "./pages/HomePage/HomePage";
import FaqPage from "./pages/FaqPage/FaqPage";
import GalleryPage from "./pages/GalleryPage/GalleryPage";
import RegulationsPage from "./pages/RegulationsPage/RegulationsPage";
import Footer from "./components/Footer/Footer";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
    return (
        <>
            <ErrorBoundary>
                <NavBar />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/regulations" element={<RegulationsPage />} />
                </Routes>
                <Footer />
            </ErrorBoundary>
        </>
    );
}

export default App;
