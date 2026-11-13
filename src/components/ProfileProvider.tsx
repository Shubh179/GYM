"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { sharingClient } from "@/lib/sharing-client";
export interface UserProfile { id: string; username: string | null; avatar_path: string | null; }
interface ProfileState { profile: UserProfile | null; loading: boolean; error: string; refresh: () => Promise<void>; }
const Context = createContext<ProfileState | null>(null);
export function profileError(error: { message?: string; code?: string }): string {
  if (["42P01", "PGRST202", "PGRST205", "42883"].includes(error.code ?? "")) return "Profiles and sharing are not available yet. Please try again later.";
  if (error.code === "23505") return "That username is already taken. Choose another.";
  return error.message || "Could not load your profile. Please try again.";
}
export default function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const id = user?.id;
  const generation = useRef(0);
  const [state, setState] = useState<{ owner?: string; profile: UserProfile | null; loading: boolean; error: string }>({ profile: null, loading: true, error: "" });
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!id) { setState({ profile: null, loading: false, error: "" }); return; }
    setState(previous => ({ owner: id, profile: previous.owner === id ? previous.profile : null, loading: true, error: "" }));
    try {
      const client = await sharingClient(id);
      const { data, error } = await client.from("profiles").select("id,username,avatar_path").eq("id", id).maybeSingle();
      if (error) throw error;
      if (current === generation.current) setState({ owner: id, profile: (data as UserProfile | null) ?? { id, username: null, avatar_path: null }, loading: false, error: "" });
    } catch (error) {
      if (current === generation.current) setState({ owner: id, profile: null, loading: false, error: profileError(error as { message?: string; code?: string }) });
    }
  }, [id]);
  useEffect(() => { void refresh(); const focus = () => { void refresh(); }; window.addEventListener("focus", focus); return () => { generation.current++; window.removeEventListener("focus", focus); }; }, [refresh]);
  const visible = state.owner === id ? state : { profile: null, loading: !!id, error: "" };
  return <Context.Provider value={{ ...visible, refresh }}>{children}</Context.Provider>;
}
export function useProfile() { const value = useContext(Context); if (!value) throw Error("Missing ProfileProvider"); return value; }
