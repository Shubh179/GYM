"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/AuthProvider";
import { browserSupabase } from "./supabase-browser";
import type { LibraryState } from "./library";
import { LIBRARY_KEY, SCHEDULE_KEY, emptyTraining, mergeTraining, parseTraining, sameTraining, readDeviceTraining } from "./training-merge";

export type SyncStatus = "local" | "syncing" | "synced" | "error";
interface Cache { state: LibraryState; base: LibraryState; imported: boolean; }

export function useTrainingSync(state: LibraryState, setState: Dispatch<SetStateAction<LibraryState>>) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setStatus] = useState<SyncStatus>("local");
  const [syncError, setError] = useState("");
  const latest = useRef(state);
  latest.current = state;
  const base = useRef(emptyTraining());
  const imported = useRef(false);
  const key = useRef("");
  const blocked = useRef(false);
  const active = useRef(true);
  const busy = useRef(false);
  const retryRef = useRef<() => Promise<void>>(async () => {});

  const persistLocal = useCallback((next: LibraryState) => {
    if (blocked.current || !key.current) throw Error("Local backup unavailable. Original data has been retained.");
    if (uid || key.current !== LIBRARY_KEY) {
      localStorage.setItem(key.current, JSON.stringify({ state: next, base: base.current, imported: imported.current } satisfies Cache));
    } else {
      // Keep the legacy guest format compatible with existing browser data.
      const { weeklySchedule, ...training } = next;
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(training));
      localStorage.setItem(SCHEDULE_KEY, weeklySchedule);
    }
  }, [uid]);

  useEffect(() => {
    if (authLoading) return;
    active.current = true;
    try {
      const cache = readDeviceTraining(localStorage, uid);
      key.current = cache.key;
      base.current = cache.base;
      imported.current = cache.imported;
      const next = cache.state;
      latest.current = next;
      setState(next);
    } catch (error) {
      blocked.current = true;
      setStatus("error");
      setError(error instanceof Error ? error.message : "Could not read your local training backup.");
    }
    setHydrated(true);
    return () => { active.current = false; };
  }, [uid, authLoading, setState]);

  const syncNow = useCallback(async () => {
    if (!uid || !hydrated || blocked.current || busy.current || !active.current) return;
    busy.current = true;
    setStatus("syncing");
    setError("");
    let succeeded = false;
    try {
      const auth = browserSupabase();
      const session = auth ? (await auth.auth.getSession()).data.session : null;
      if (!session || session.user.id !== uid) throw Error("Please sign in again to sync your training.");
      // Pin this request to the initiating user's JWT. An account switch while
      // a request is pending cannot send the old user's state to the new user.
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        accessToken: async () => session.access_token,
      });
      const snapshot = latest.current;
      const originalBase = base.current;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: row, error: readError } = await client.from("personal_training")
          .select("state,revision").eq("user_id", uid).abortSignal(AbortSignal.timeout(15000)).maybeSingle();
        if (readError) throw Error("Cloud sync is unavailable. Your device copy is retained. Please retry when connected.");
        if (!active.current) return;
        const remote = row ? parseTraining(row.state) : emptyTraining();
        const merged = mergeTraining(originalBase, snapshot, remote);
        if (!sameTraining(merged, remote) || !row) {
          const { data: revision, error: writeError } = await client.rpc("save_personal_training", {
            p_state: merged, p_revision: row?.revision ?? 0,
          }).abortSignal(AbortSignal.timeout(15000));
          if (writeError) throw Error("Could not save to your account. Your device copy is retained; retry when connected.");
          if (revision === null) continue;
        }
        if (!active.current) return;
        const next = mergeTraining(snapshot, latest.current, merged);
        base.current = merged;
        imported.current = true;
        const changed = !sameTraining(latest.current, next);
        latest.current = next;
        persistLocal(next);
        if (changed) setState(next);
        setStatus(sameTraining(next, merged) ? "synced" : "syncing");
        succeeded = true;
        break;
      }
      if (!succeeded) throw Error("Training changed on another device. Your changes are retained; please retry syncing.");
    } catch (error) {
      if (active.current) {
        setStatus("error");
        setError(error instanceof Error ? error.message : "Sync failed. Your device copy is retained.");
      }
    } finally {
      busy.current = false;
      if (succeeded && active.current && !sameTraining(latest.current, base.current)) void retryRef.current();
    }
  }, [uid, hydrated, persistLocal, setState]);
  retryRef.current = syncNow;

  useEffect(() => {
    if (!hydrated || blocked.current) return;
    try { persistLocal(state); }
    catch { setStatus("error"); setError("Could not save the device backup. Keep this page open and retry when device storage is available."); }
    if (!uid) return;
    if (!sameTraining(state, base.current)) setStatus("syncing");
    const timer = window.setTimeout(() => void syncNow(), 700);
    return () => window.clearTimeout(timer);
  }, [state, hydrated, uid, persistLocal, syncNow]);

  useEffect(() => {
    if (!uid || !hydrated) return;
    const refresh = () => { void syncNow(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, [uid, hydrated, syncNow]);
  return { hydrated, syncStatus, syncError, syncNow, persistLocal };
}
