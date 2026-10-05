import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type ProtectedRouteProps = {
    children: ReactNode;
    roles?: string[];
    // Gate check-in: admins and users with "Obsługa wjazdu".
    requireCheckIn?: boolean;
};

export default function ProtectedRoute({
    children,
    roles,
    requireCheckIn = false,
}: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <p className="page-status">Ładowanie...</p>;
    }

    if (!user) {
        return <Navigate to="/logowanie" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    if (requireCheckIn && !user.canCheckIn) {
        return (
            <section className="page auth-page">
                <h1>Brak uprawnień</h1>
                <p>
                    Ta strona jest dla obsługi wjazdu. Jeśli pomagasz przy bramie, poproś
                    organizatora o nadanie uprawnienia „Obsługa wjazdu” dla konta{" "}
                    <strong>{user.email}</strong>.
                </p>
            </section>
        );
    }

    return children;
}
