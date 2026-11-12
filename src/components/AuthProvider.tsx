"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase-browser";
import { writeAuthCookie } from "@/lib/auth-cookie";

interface AuthState { user: User | null; loading: boolean; configured: boolean; error: string; }
const AuthContext = createContext<AuthState>({ user: null, loading: true, configured: false, error: "" });
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, configured: false, error: "" });
  useEffect(() => {
    const client = browserSupabase();
    if (!client) { writeAuthCookie(null); setState({ user: null, loading: false, configured: false, error: "" }); return; }
    let active = true;
    let recovering = window.location.pathname === "/" && new URLSearchParams(window.location.search).get("auth") === "required";
    let authEvent = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (recovering) return;
      authEvent = true;
      if (active) {
        writeAuthCookie(session);
        setState({ user: session?.user ?? null, loading: false, configured: true, error: "" });
      }
    });
    if (recovering) {
      writeAuthCookie(null);
      void client.auth.signOut({ scope: "local" }).catch(() => {}).finally(() => {
        if (!active) return;
        recovering = false;
        window.history.replaceState({}, "", "/");
        setState({ user: null, loading: false, configured: true, error: "Your session is no longer valid. Please sign in again." });
      });
      return () => { active = false; subscription.unsubscribe(); };
    }
    void client.auth.getSession().then(({ data, error }) => {
      if (active && !authEvent) {
        writeAuthCookie(data.session);
        setState({ user: data.session?.user ?? null, loading: false, configured: true, error: error ? "Could not restore your sign-in. Please sign in again." : "" });
      }
    }).catch(() => {
      if (active && !authEvent) {
        writeAuthCookie(null);
        setState({ user: null, loading: false, configured: true, error: "Could not restore your sign-in. Please sign in again." });
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
