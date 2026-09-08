import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
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
