"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { useLibrary } from "@/lib/library";
import { browserSupabase } from "@/lib/supabase-browser";

const SIGNIN_DESTINATION = "repvisual:signin-destination:v1";

export default function TrainingAccount({ redirectWhenSignedIn = false }: { redirectWhenSignedIn?: boolean }) {
  const router = useRouter();
  const { user, configured, error: authError } = useAuth();
  const library = useLibrary();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const button = "min-h-11 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-50";
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (params.has("error") || query.has("error")) {
      try { sessionStorage.removeItem(SIGNIN_DESTINATION); } catch { /* Storage may be disabled. */ }
      setError("Sign-in was cancelled or could not be completed. Please try again.");
      window.history.replaceState({}, "", "/account");
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    let pending = false;
    try {
      pending = sessionStorage.getItem(SIGNIN_DESTINATION) === "/library";
      if (pending) sessionStorage.removeItem(SIGNIN_DESTINATION);
    } catch { /* The homepage redirect also works without session storage. */ }
    if (redirectWhenSignedIn || pending) router.replace("/library");
  }, [user, redirectWhenSignedIn, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const client = browserSupabase();
    if (!client) return;
    setBusy(true); setError(""); setMessage("");
    try {
      try { sessionStorage.setItem(SIGNIN_DESTINATION, "/library"); } catch { /* Direct email redirect remains available. */ }
      const result = mode === "signup"
        ? await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account` } })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword("");
      if (result.data.session) router.replace("/library");
      else { try { sessionStorage.removeItem(SIGNIN_DESTINATION); } catch { /* No session to redirect. */ } }
      if (mode === "signup" && !result.data.session) setMessage("Check your email to confirm your account, then sign in. Your browser data will stay here until it can be imported.");
    } catch (cause) {
      try { sessionStorage.removeItem(SIGNIN_DESTINATION); } catch { /* Storage may be disabled. */ }
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Please try again.");
    }
    finally { setBusy(false); }
  }
  async function google() {
    const client = browserSupabase();
    if (!client) return;
    setBusy(true); setError("");
    try {
      try { sessionStorage.setItem(SIGNIN_DESTINATION, "/library"); } catch { /* Account still opens after OAuth if storage is unavailable. */ }
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/account` } });
      if (error) throw error;
    } catch (cause) {
      try { sessionStorage.removeItem(SIGNIN_DESTINATION); } catch { /* Storage may be disabled. */ }
      setError(cause instanceof Error ? cause.message : "Google sign-in failed."); setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true); setError("");
    try {
      const result = await browserSupabase()?.auth.signOut({ scope: "local" });
      if (result?.error) throw result.error;
      router.replace("/");
    } catch { setError("Could not sign out. Please try again."); }
    finally { setBusy(false); }
  }
  function exportBackup() {
    const { favourites, workouts, progress, completions, sessionLog, workoutHistory, notes, weeklySchedule } = library;
    const blob = new Blob([JSON.stringify({ favourites, workouts, progress, completions, sessionLog, workoutHistory, notes, weeklySchedule }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "repvisual-training-backup.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="page-shell py-10"><div className="mx-auto max-w-xl space-y-6">
    <h1 className="page-title">{user ? "Your account" : mode === "signup" ? "Create your account" : "Sign in to RepVisual"}</h1>
    <p className="text-sm leading-6 text-white/60">Sign in to save your workouts, exercises, favourites, notes, weekly schedule and progress across devices. Existing data from this browser is imported into the first account you sign in to. A device backup is retained.</p>
    {(error || authError) && <p role="alert" className="rounded-lg border border-red-400/30 p-4 text-sm text-red-200">{error || authError}</p>}
    {message && <p role="status" className="text-sm text-accent">{message}</p>}
    {!configured ? <p className="rounded-xl border border-white/10 p-5 text-white/60">Sign-in is not configured. Please contact the app administrator.</p> : user ? <section className="space-y-4 rounded-xl border border-white/10 bg-ink-850 p-5">
      <p className="break-all text-sm">Signed in as {user.email ?? "your account"}</p>
      <p role="status" className="text-sm text-white/70">{library.syncStatus === "synced" ? "All changes synced to your account." : library.syncStatus === "syncing" ? "Syncing your training..." : library.syncStatus === "error" ? "Sync needs attention." : "Saved on this device."}</p>
      {library.syncError && <p role="alert" className="text-sm text-red-200">{library.syncError}</p>}
      <div className="flex flex-wrap gap-3">
        <button className={button} disabled={library.syncStatus === "syncing"} onClick={() => void library.syncNow()}>Sync now</button>
        <button className={button} disabled={busy} onClick={() => void signOut()}>Sign out</button>
      </div>
      <p className="text-xs leading-5 text-white/50">Unsynced changes remain in this account’s device cache if you sign out. Sign back into the same account to finish syncing.</p>
    </section> : <section className="space-y-5 rounded-xl border border-white/10 bg-ink-850 p-5">
      <button className={`${button} w-full bg-white text-ink-950`} disabled={busy} onClick={() => void google()}>Continue with Google</button>
      <p className="text-center text-xs text-white/40">or use email</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-white/15 bg-ink-900 px-3" /></label>
        <label className="block text-sm">Password<input required minLength={mode === "signup" ? 8 : 1} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-white/15 bg-ink-900 px-3" /></label>
        <button disabled={busy} className={`${button} w-full bg-accent text-ink-950`}>{busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}</button>
      </form>
      <button disabled={busy} className={`${button} w-full`} onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); setError(""); }}>{mode === "signin" ? "Create an account instead" : "Already have an account? Sign in"}</button>
    </section>}
    {!user && library.syncError && <p role="alert" className="text-sm text-red-200">{library.syncError}</p>}
    {user && <div className="flex flex-wrap gap-3"><button className={button} onClick={exportBackup}>Export training backup</button><Link className={`${button} inline-flex items-center`} href="/library">Back to training</Link></div>}
  </div></div>;
}
