"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase-browser";

interface AuthState { user: User | null; loading: boolean; configured: boolean; error: string; }
const AuthContext = createContext<AuthState>({ user: null, loading: true, configured: false, error: "" });
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, configured: false, error: "" });
  useEffect(() => {
    const client = browserSupabase();
    if (!client) { setState({ user: null, loading: false, configured: false, error: "" }); return; }
    let active = true;
    let authEvent = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      authEvent = true;
      if (active) setState({ user: session?.user ?? null, loading: false, configured: true, error: "" });
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (active && !authEvent) setState({ user: data.session?.user ?? null, loading: false, configured: true, error: error ? "Could not restore your sign-in. Please sign in again." : "" });
    }).catch(() => {
      if (active && !authEvent) setState({ user: null, loading: false, configured: true, error: "Could not restore your sign-in. Please sign in again." });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
