"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { browserSupabase } from "@/lib/supabase-browser";
import type { SearchResult } from "@/lib/types";

interface Access {
  configured: boolean;
  requiresAuth: boolean;
  signedIn: boolean;
  canCreate: boolean;
  email?: string;
}
const inputClass = "mt-1 block w-full rounded-lg border border-white/15 bg-ink-850 px-3 py-2 text-base text-white";
const buttonClass = "min-h-11 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-50";

export default function AddExerciseForm({ onCreated }: { onCreated?: (exercise: SearchResult) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<SearchResult | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function authHeaders(): Promise<Record<string, string>> {
    const client = browserSupabase();
    const session = client ? (await client.auth.getSession()).data.session : null;
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  useEffect(() => {
    if (!open) return;
    let active = true;
    let generation = 0;
    async function checkAccess() {
      const current = ++generation;
      try {
        const response = await fetch("/api/exercise-access", { headers: await authHeaders(), cache: "no-store" });
        if (!response.ok) throw new Error("Access check failed");
        const value: Access = await response.json();
        if (active && current === generation) setAccess(value);
      } catch {
        if (active && current === generation) setError("Could not check sign-in access. Close this panel and try again.");
      }
    }
    void checkAccess();
    const subscription = browserSupabase()?.auth.onAuthStateChange(() => {
      // Avoid calling auth methods inside Supabase's auth-state lock.
      setTimeout(() => { if (active) void checkAccess(); }, 0);
    });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, [open]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signingIn) return;
    const client = browserSupabase();
    if (!client) { setError("Sign-in is not available yet."); return; }
    setSigningIn(true); setError("");
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error("Sign-in failed. Check your email and password.");
      const response = await fetch("/api/exercise-access", { headers: await authHeaders(), cache: "no-store" });
      if (!response.ok) throw new Error("Could not check account access.");
      setAccess(await response.json());
    } catch (err) { setError(err instanceof Error ? err.message : "Sign-in failed."); }
    finally { setPassword(""); setSigningIn(false); }
  }

  async function signOut() {
    await browserSupabase()?.auth.signOut({ scope: "local" });
    setAccess(null); setError(""); setCreated(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setCreated(null);
    try {
      const response = await fetch("/api/exercises", {
        method: "POST", headers: { "Content-Type": "application/json", ...await authHeaders() },
        body: JSON.stringify({ name, youtubeUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save exercise.");
      const exercise = { ...data.exercise, thumbUrl: data.exercise.imageUrls?.[0] ?? null } as SearchResult;
      onCreated?.(exercise); setCreated(exercise); setName(""); setYoutubeUrl("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save exercise."); }
    finally { setSaving(false); }
  }

  return <div className="my-4">
    <button type="button" onClick={() => { setOpen(value => !value); setError(""); }} aria-expanded={open}
      className="min-h-11 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
      {open ? "Close new exercise" : "+ Create exercise"}
    </button>
    {open && <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-ink-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-white">Add exercise</h2>
        {access?.signedIn && <button type="button" onClick={signOut} className="min-h-11 px-2 text-sm text-white/60">Sign out</button>}
      </div>
      {!access ? (!error && <p role="status" className="text-sm text-white/60">Checking access...</p>) : !access.configured ?
        <p className="text-sm text-white/60">Exercise publishing has not been configured yet. Browsing is still available.</p> : access.canCreate ?
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm text-white/70">Exercise name
            <input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={saving}
              placeholder="e.g. Cable chest press" className={inputClass} />
          </label>
          <label className="block text-sm text-white/70">YouTube link
            <input required type="url" value={youtubeUrl} onChange={event => setYoutubeUrl(event.target.value)} disabled={saving}
              placeholder="https://www.youtube.com/watch?v=..." className={inputClass} />
          </label>
          <button disabled={saving} className={buttonClass}>{saving ? "Saving..." : "Save exercise"}</button>
        </form> : access.signedIn ? <p role="status" className="text-sm text-white/60">This account cannot add exercises. Sign out to use the admin account.</p> :
        <form onSubmit={signIn} className="space-y-3">
          <p className="text-sm text-white/60">Sign in with your admin account to add exercises.</p>
          <label className="block text-sm text-white/70">Email
            <input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm text-white/70">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
          </label>
          <button disabled={signingIn} className={buttonClass}>{signingIn ? "Signing in..." : "Sign in"}</button>
        </form>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {created && <p role="status" className="text-sm text-accent">Saved {created.name}. <Link className="underline" href={`/exercise/${created.slug}`}>View exercise</Link></p>}
    </div>}
  </div>;
}
