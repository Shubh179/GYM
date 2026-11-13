"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { browserSupabase } from "@/lib/supabase-browser";
import { normalizeUsername, usernameError } from "@/lib/workout-sharing";

const SIGNIN_DESTINATION = "repvisual:signin-destination:v1";

export default function TrainingAccount({ redirectWhenSignedIn = false }: { redirectWhenSignedIn?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, configured, error: authError } = useAuth();
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
    else if (pathname === "/account") router.replace("/profile");
  }, [user, redirectWhenSignedIn, pathname, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && usernameError(username)) { setError(usernameError(username)!); return; }
    if (mode === "signup" && password !== confirmPassword) { setError("Passwords do not match."); return; }
    const client = browserSupabase();
    if (!client) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const availability = await client.rpc("username_available", { p_username: normalizeUsername(username) });
        if (availability.error) throw Error("Could not check your username. Please try again later.");
        if (!availability.data) throw Error("That username is already taken. Choose another.");
      }
      try { sessionStorage.setItem(SIGNIN_DESTINATION, "/library"); } catch { /* Direct email redirect remains available. */ }
      const result = mode === "signup"
        ? await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account`, data: { username: normalizeUsername(username) } } })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword("");
      setConfirmPassword("");
      if (result.data.session) router.replace("/library");
      else { try { sessionStorage.removeItem(SIGNIN_DESTINATION); } catch { /* No session to redirect. */ } }
      if (mode === "signup" && !result.data.session) setMessage("Check your email to confirm your account.");
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
  if (!user) return <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink-950 px-5 py-10">
    <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[100px]" />
    <div className="relative w-full max-w-[400px]">
      <Link href="/" aria-label="RepVisual home" className="mb-9 flex min-h-11 items-center justify-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-ink-950">
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8v8M7 5v14M17 5v14M21 8v8M7 12h10" /></svg>
        </span>
        <span className="text-2xl font-bold tracking-tight text-white">RepVisual<span className="text-accent">.</span></span>
      </Link>
      <section aria-labelledby="auth-title" className="rounded-2xl border border-white/[0.08] bg-ink-850/70 p-6 shadow-2xl sm:p-8">
        <h1 id="auth-title" className="mb-7 text-center text-2xl font-semibold tracking-tight text-white">{mode === "signup" ? "Create account" : "Sign in"}</h1>
        {(error || authError) && <p role="alert" className="mb-5 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2.5 text-sm text-red-200">{error || authError}</p>}
        {message && <p role="status" className="mb-5 rounded-lg bg-accent/10 px-3 py-2.5 text-sm text-accent">{message}</p>}
        {!configured && <p role="alert" className="mb-5 text-sm text-red-200">Sign-in is temporarily unavailable.</p>}
        <button type="button" disabled={busy || !configured} onClick={() => void google()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 text-sm font-semibold text-ink-950 transition hover:bg-white/90 disabled:opacity-40">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6v5h6.5c3.8-3.5 6.1-8.6 6.1-14.7Z"/><path fill="#34A853" d="M24 44c5.4 0 9.9-1.8 13.2-4.8l-6.5-5c-1.8 1.2-4 1.9-6.7 1.9-5.2 0-9.6-3.5-11.2-8.2H6.1v5.2C9.4 39.6 16.2 44 24 44Z"/><path fill="#FBBC05" d="M12.8 27.9c-.4-1.2-.6-2.5-.6-3.9s.2-2.7.6-3.9v-5.2H6.1C4.8 17.7 4 20.8 4 24s.8 6.3 2.1 9.1l6.7-5.2Z"/><path fill="#EA4335" d="M24 11.9c2.9 0 5.5 1 7.5 2.9l5.7-5.7C33.9 6 29.4 4 24 4 16.2 4 9.4 8.4 6.1 14.9l6.7 5.2c1.6-4.7 6-8.2 11.2-8.2Z"/></svg>
          Continue with Google
        </button>
        <div className="my-6 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/50">or</span><span className="h-px flex-1 bg-white/10" /></div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && <label className="block text-sm font-medium text-white/75">Username
            <input required disabled={busy || !configured} minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Choose a unique username" value={username} onChange={e => setUsername(e.target.value)} className="mt-2 block h-12 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 text-base text-white" />
            <span className="mt-2 block text-xs text-white/45">3-24 letters, numbers or underscores. Used to share workouts.</span>
          </label>}
          <label className="block text-sm font-medium text-white/75">Email
            <input required disabled={busy || !configured} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block h-12 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 text-base text-white outline-none transition focus:border-accent/60 disabled:opacity-40" />
          </label>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-white/75">Password</label>
            <div className="relative mt-2">
              <input id="auth-password" required disabled={busy || !configured} minLength={mode === "signup" ? 8 : 1} type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"} value={password} onChange={e => setPassword(e.target.value)} className="block h-12 w-full rounded-xl border border-white/10 bg-ink-900 pl-3.5 pr-12 text-base text-white outline-none transition focus:border-accent/60 disabled:opacity-40" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-white/40 hover:text-white">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{showPassword && <path d="m3 3 18 18" />}</svg>
              </button>
            </div>
          </div>
          {mode === "signup" && <label className="block text-sm font-medium text-white/75">Confirm password
            <input required disabled={busy || !configured} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-2 block h-12 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 text-base text-white outline-none transition focus:border-accent/60 disabled:opacity-40" />
          </label>}
          <button disabled={busy || !configured} className="!mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-ink-950 transition hover:bg-accent-soft disabled:opacity-40">{busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-white/55">{mode === "signin" ? "No account?" : "Already registered?"} <button type="button" disabled={busy} className="inline-flex min-h-11 items-center px-1 font-semibold text-accent hover:text-accent-soft" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setConfirmPassword(""); setShowPassword(false); setMessage(""); setError(""); }}>{mode === "signin" ? "Sign up" : "Sign in instead"}</button></p>
      </section>
      <div className="mt-6 text-center"><Link href="/privacy-policy" className="inline-flex min-h-11 items-center px-3 text-xs text-white/50 hover:text-white/80">Privacy Policy</Link></div>
    </div>
  </div>;

  return <div className="page-shell py-12 text-white/60" role="status">Opening your profile...</div>;
}
