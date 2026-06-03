import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { userApi, type User } from "@/lib/api";

interface UserContextValue {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("user_token");
    if (!token) { setIsLoading(false); return; }
    userApi.get("/users/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("user_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("user_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("user_token");
    setUser(null);
  };

  const updateUser = (userData: User) => setUser(userData);

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
