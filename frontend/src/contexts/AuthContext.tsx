import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  admin: Admin | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setIsLoading(false); return; }
    api.get("/auth/me")
      .then((r) => setAdmin(r.data))
      .catch(() => localStorage.removeItem("admin_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (token: string) => {
    localStorage.setItem("admin_token", token);
    const r = await api.get("/auth/me");
    setAdmin(r.data);
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
