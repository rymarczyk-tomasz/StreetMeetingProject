import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type ProtectedRouteProps = {
    children: ReactNode;
    roles?: string[];
};

export default function ProtectedRoute({
    children,
    roles,
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

    return children;
}
