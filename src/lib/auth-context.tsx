"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { SessionProvider, signIn, signOut } from "next-auth/react";

type User = {
  id: string;
  username: string;
  displayName: string;
  roleName: string;
  email?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      return true;
    }
    return false;
  };

  const loginWithGoogle = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  const logout = async () => {
    await signOut({ redirect: false });
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <SessionProvider>
      <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
        {children}
      </AuthContext.Provider>
    </SessionProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
