"use client";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import type { Workout } from "@/lib/library";
import { sharingClient } from "@/lib/sharing-client";
import { useAuth } from "./AuthProvider";
import { normalizeUsername, usernameError, shareSnapshot } from "@/lib/workout-sharing";
import { useProfile, profileError } from "./ProfileProvider";
export default function ShareWorkout({ workouts, label = "Share session" }: { workouts: Workout[]; label?: string }) {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(false), [recipient, setRecipient] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const pending = useRef(false);
  async function send(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    setError(""); setMessage("");
    const invalid = usernameError(recipient); if (invalid) { setError(invalid); return; }
    if (!profile?.username) { setError("Create your username on Profile first."); return; }
    pending.current = true; setBusy(true);
    try {
      if (!user) throw Error("Sign in first.");
      const client = await sharingClient(user.id);
      const sessions = shareSnapshot(workouts);
      const { error } = await client.rpc("send_workout", { p_recipient: normalizeUsername(recipient), p_sessions: sessions });
      if (error) throw error;
      setMessage(`Sent to @${normalizeUsername(recipient)}.`); setRecipient("");
    } catch (cause) { setError(profileError(cause as { message?: string; code?: string })); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="min-w-0" onClick={event => event.stopPropagation()}>
    <button type="button" aria-expanded={open} aria-controls={id} disabled={!workouts.length} onClick={() => { setOpen(v => !v); setMessage(""); setError(""); }} className="min-h-11 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold disabled:opacity-40">{label}</button>
    {open && <div id={id} className="mt-3 w-full max-w-md rounded-xl border border-white/10 bg-ink-950 p-4">
      {loading ? <p role="status" className="text-sm text-white/60">Loading your profile...</p> : !profile?.username ? <p className="text-sm text-white/60"><Link href="/profile" className="text-accent underline">Create your username</Link> to send and receive workouts.</p> : <form onSubmit={send} className="space-y-3">
        <label className="block text-sm">Recipient username<input required autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={24} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="e.g. alex_fit" className="mt-2 block min-h-11 w-full rounded-lg border border-white/15 bg-ink-850 px-3" /></label>
        <p className="text-xs text-white/50">{workouts.length} {workouts.length === 1 ? "session" : "sessions"}. Only session names and exercises are shared.</p>
        <button disabled={busy} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-ink-950 disabled:opacity-50">{busy ? "Sending..." : "Send workout"}</button>
      </form>}
      {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}{message && <p role="status" className="mt-3 text-sm text-accent">{message}</p>}
    </div>}
  </div>;
}
