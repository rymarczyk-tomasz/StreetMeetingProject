import { Routes, Route } from "react-router-dom";
import NavBar from "./components/Navbar/Navbar";
import HomePage from "./pages/HomePage/HomePage";
import FaqPage from "./pages/FaqPage/FaqPage";
import GalleryPage from "./pages/GalleryPage/GalleryPage";
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
                </Routes>
                <Footer />
            </ErrorBoundary>
        </>
    );
}

export default App;
