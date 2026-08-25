import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import GalleryPage from "./pages/GalleryPage";
import FaqPage from "./pages/FaqPage";
import RegulaminPage from "./pages/RegulaminPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import "./App.css";

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="galeria" element={<GalleryPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="regulamin" element={<RegulaminPage />} />
                <Route path="logowanie" element={<LoginPage />} />
                <Route path="rejestracja" element={<RegisterPage />} />
                <Route
                    path="panel"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin"
                    element={
                        <ProtectedRoute roles={["admin"]}>
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}

export default App;
