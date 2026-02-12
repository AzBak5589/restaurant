"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Cookies from "js-cookie";
import api from "./api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  restaurantId: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    restaurantId?: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("accessToken");
    if (token) {
      api
        .get("/auth/profile")
        .then((res) => setUser(res.data))
        .catch(() => {
          Cookies.remove("accessToken");
          Cookies.remove("refreshToken");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (
    email: string,
    password: string,
    restaurantId?: string,
  ) => {
    const body: Record<string, string> = { email, password };
    if (restaurantId) body.restaurantId = restaurantId;
    const res = await api.post("/auth/login", body);
    Cookies.set("accessToken", res.data.accessToken, { expires: 7 });
    Cookies.set("refreshToken", res.data.refreshToken, { expires: 30 });
    setUser(res.data.user);
  };

  const logout = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
