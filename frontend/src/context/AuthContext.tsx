import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import api from "../api/client";
import { clearSavedCars } from "../utils/gateOffline";

const AuthContext = createContext(null);

// Gate staff must be able to reopen /wjazd with no signal on the event day, so
// the last signed-in gate user is remembered and used only when the server
// can't be reached at all. The API still checks the session on every request.
const OFFLINE_USER_KEY = "gate.user.v1";

function rememberGateUser(user) {
    try {
        if (user?.canCheckIn) {
            localStorage.setItem(
                OFFLINE_USER_KEY,
                JSON.stringify({
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    role: user.role,
                    canCheckIn: true,
                }),
            );
        } else {
            localStorage.removeItem(OFFLINE_USER_KEY);
        }
    } catch {
        // Storage unavailable: no offline start, everything else works.
    }
}

function rememberedGateUser() {
    try {
        return JSON.parse(localStorage.getItem(OFFLINE_USER_KEY) || "null");
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data.user);
            rememberGateUser(data.user);
        } catch (err) {
            if (err.response) {
                rememberGateUser(null);
                setUser(null);
            } else {
                setUser(rememberedGateUser());
            }
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
        rememberGateUser(data.user);
        return data.user;
    }

    async function register(payload) {
        const { data } = await api.post("/auth/register", payload);
        setUser(data.user);
        return data.user;
    }

    async function logout() {
        await api.post("/auth/logout");
        rememberGateUser(null);
        clearSavedCars();
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
