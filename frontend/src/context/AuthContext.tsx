import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data.user);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    async function login(email, password) {
        const { data } = await api.post("/auth/login", { email, password });
        setUser(data.user);
        return data.user;
    }

    async function register(payload) {
        const { data } = await api.post("/auth/register", payload);
        setUser(data.user);
        return data.user;
    }

    async function logout() {
        await api.post("/auth/logout");
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{ user, isLoading, login, register, logout, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
