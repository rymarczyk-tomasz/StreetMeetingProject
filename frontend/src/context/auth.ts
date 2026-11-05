import { createContext, useContext } from "react";

// value comes from <AuthProvider> in AuthContext.tsx
export const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
