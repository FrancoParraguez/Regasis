import React, { createContext, useContext, useMemo, useState } from "react";
import type { User } from "../services/auth";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "../services/auth";

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, login: async () => { throw new Error("not ready"); }, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  const value = useMemo<AuthCtx>(() => ({
    user,
    async login(email, password){
      const u = await apiLogin({ email, password });
      setUser(u);
      return u;
    },
    logout(){ apiLogout(); setUser(null); }
  }), [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth(){ return useContext(Ctx); }
