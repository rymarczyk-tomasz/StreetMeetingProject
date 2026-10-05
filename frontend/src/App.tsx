import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import "./App.css";

// Everything except the landing page is split into its own chunk, so visitors of
// the home page don't download the panels (the admin panel alone is the biggest part).
// The Suspense boundary lives in Layout, so header and footer stay visible while loading.
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const RegulaminPage = lazy(() => import("./pages/RegulaminPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage"));
const SubmissionPage = lazy(() => import("./pages/SubmissionPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const GaragePage = lazy(() => import("./pages/GaragePage"));
const EmailTokenPage = lazy(() => import("./pages/EmailTokenPage"));
const GatePage = lazy(() => import("./pages/GatePage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="galeria" element={<GalleryPage />} />
                <Route path="galeria/:albumId" element={<GalleryPage />} />
                <Route path="auta-select" element={<ShowcasePage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="regulamin" element={<RegulaminPage />} />
                <Route path="logowanie" element={<LoginPage />} />
                <Route path="rejestracja" element={<RegisterPage />} />
                <Route
                    path="nie-pamietam-hasla"
                    element={<ForgotPasswordPage />}
                />
                <Route path="reset-hasla" element={<ResetPasswordPage />} />
                <Route path="potwierdz-email" element={<EmailTokenPage action="verify" />} />
                <Route path="zmiana-emaila" element={<EmailTokenPage action="change" />} />
                <Route
                    path="wjazd"
                    element={
                        <ProtectedRoute requireCheckIn>
                            <GatePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="garaz"
                    element={
                        <ProtectedRoute>
                            <GaragePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="panel"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="ustawienia-konta"
                    element={
                        <ProtectedRoute>
                            <AccountSettingsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="formularz"
                    element={
                        <ProtectedRoute>
                            <SubmissionPage />
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
