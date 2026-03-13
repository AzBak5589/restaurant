"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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
  ) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const buildLoginBody = (
  email: string,
  password: string,
  restaurantId?: string,
): Record<string, string> => {
  const body: Record<string, string> = { email, password };
  if (restaurantId) {
    body.restaurantId = restaurantId;
  }
  return body;
};

export const hasSessionToken = (token: string | undefined): boolean => {
  return Boolean(token);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() =>
    hasSessionToken(Cookies.get("accessToken")),
  );
  const router = useRouter();

  const clearSession = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    setUser(null);
  };

  useEffect(() => {
    const token = Cookies.get("accessToken");
    if (!token) {
      return;
    }

    let cancelled = false;
    api
      .get("/auth/profile")
      .then((res) => {
        if (!cancelled) {
          setUser(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    restaurantId?: string,
  ): Promise<User> => {
    const body = buildLoginBody(email, password, restaurantId);
    const res = await api.post("/auth/login", body);
    Cookies.set("accessToken", res.data.accessToken, { expires: 7 });
    Cookies.set("refreshToken", res.data.refreshToken, { expires: 30 });
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Keep UX stable even if network/logout endpoint fails.
    } finally {
      clearSession();
      router.replace("/login");
    }
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
