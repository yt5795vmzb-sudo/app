import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";
import { api, setApiToken, User } from "@/src/api";

const TOKEN_KEY = "auth_token";

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await storage.secureGet(TOKEN_KEY, "");
      if (t) {
        setApiToken(t);
        try { setUser(await api<User>("/auth/me")); } catch { setApiToken(null); await storage.secureRemove(TOKEN_KEY); }
      }
      setLoading(false);
    })();
  }, []);

  const handle = async (res: { token: string; user: User }) => {
    setApiToken(res.token);
    await storage.secureSet(TOKEN_KEY, res.token);
    setUser(res.user);
  };

  const value: Ctx = {
    user, loading, setUser,
    login: async (email, password) => handle(await api("/auth/login", { method: "POST", body: { email, password } })),
    register: async (body) => handle(await api("/auth/register", { method: "POST", body })),
    logout: async () => { setApiToken(null); await storage.secureRemove(TOKEN_KEY); setUser(null); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
