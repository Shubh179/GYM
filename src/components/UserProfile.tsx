"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useProfile, profileError } from "./ProfileProvider";
import { browserSupabase } from "@/lib/supabase-browser";
import { sharingClient } from "@/lib/sharing-client";
import { writeAuthCookie } from "@/lib/auth-cookie";
import { useLibrary } from "@/lib/library";
import { normalizeUsername, usernameError, parseSharedSessions, sharedSessionId, type ReceivedWorkout } from "@/lib/workout-sharing";
const button = "min-h-11 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold disabled:opacity-40";
const PAGE_SIZE = 20;
async function photoBlob(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("Choose a JPG, PNG or WebP photo.");
  if (file.size > 2 * 1024 * 1024) throw Error("Choose a photo smaller than 2 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const side = Math.min(bitmap.width, bitmap.height);
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d"); if (!context) throw Error("Could not process this photo.");
    context.fillStyle = "#111315"; context.fillRect(0, 0, 512, 512);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("Could not process this photo.")), "image/jpeg", 0.85));
  } finally { bitmap.close(); }
}
export default function UserProfile() {
  const { user } = useAuth(); const { profile, loading, error: loadError, refresh } = useProfile();
  const { workouts, hydrated, addReceivedWorkouts } = useLibrary(); const router = useRouter();
  const [username, setUsername] = useState(""), [avatar, setAvatar] = useState(""), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(""), [inbox, setInbox] = useState<ReceivedWorkout[]>([]), [inboxLoading, setInboxLoading] = useState(false), [inboxError, setInboxError] = useState(""), [hasMore, setHasMore] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null), action = useRef(false), generation = useRef(0), inboxBusy = useRef(false);
  const cursor = useRef(0);
  const uid = user?.id; const handle = profile?.username; const path = profile?.avatar_path;
  useEffect(() => {
    let active = true; setAvatar("");
    async function resolve() {
      if (!path || !uid) return;
      try {
        const client = await sharingClient(uid);
        const result = await client.storage.from("profile-photos").createSignedUrl(path, 3600);
        if (result?.error) throw result.error;
        if (active && result?.data) setAvatar(result.data.signedUrl);
      } catch { if (active) setError("Could not load your profile photo. Please refresh and try again."); }
    }
    void resolve(); const timer = window.setInterval(() => { void resolve(); }, 45 * 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [path, uid]);
  const loadInbox = useCallback(async (reset = true) => {
    if (!uid || !handle || inboxBusy.current) return;
    const current = generation.current; inboxBusy.current = true; setInboxLoading(true); setInboxError("");
    try {
      const client = await sharingClient(uid);
      const offset = reset ? 0 : cursor.current;
      const { data, error } = await client.from("workout_shares").select("id,sender_username,sessions,created_at").eq("recipient_id", uid).order("created_at", { ascending: false }).order("id").range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data ?? []).map(row => ({ ...row, sessions: parseSharedSessions(row.sessions) })) as ReceivedWorkout[];
      if (generation.current !== current) return;
      cursor.current = offset + rows.length; setHasMore(rows.length === PAGE_SIZE);
      setInbox(previous => reset ? rows : [...previous, ...rows.filter(row => !previous.some(item => item.id === row.id))]);
    } catch (cause) { if (generation.current === current) setInboxError(profileError(cause as { message?: string; code?: string })); }
    finally { if (generation.current === current) { inboxBusy.current = false; setInboxLoading(false); } }
  }, [uid, handle]);
  useEffect(() => {
    generation.current++; inboxBusy.current = false; cursor.current = 0; setInbox([]); setHasMore(false);
    void loadInbox(); const focus = () => { void loadInbox(); }; window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 60_000);
    return () => { generation.current++; window.removeEventListener("focus", focus); window.clearInterval(timer); };
  }, [loadInbox]);
  async function claim(event: FormEvent) {
    event.preventDefault(); if (action.current) return; setError(""); setMessage("");
    const invalid = usernameError(username); if (invalid) { setError(invalid); return; }
    action.current = true; setBusy("username");
    try {
      if (!uid) throw Error("Sign in first.");
      const client = await sharingClient(uid);
      const { error } = await client.rpc("claim_username", { p_username: normalizeUsername(username) }); if (error) throw error;
      await refresh(); setMessage("Your username is ready. You can now share and receive workouts.");
    } catch (cause) { setError(profileError(cause as { message?: string; code?: string })); }
    finally { action.current = false; setBusy(""); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !uid || action.current) return;
    action.current = true; setBusy("photo"); setError(""); setMessage("");
    let client: Awaited<ReturnType<typeof sharingClient>> | null = null; let uploaded: string | null = null; let committed = false;
    try {
      client = await sharingClient(uid);
      const blob = await photoBlob(file); const nextPath = `${uid}/${crypto.randomUUID()}.jpg`;
      const { error } = await client.storage.from("profile-photos").upload(nextPath, blob, { contentType: "image/jpeg", upsert: false }); if (error) throw error;
      uploaded = nextPath;
      const saved = await client.rpc("set_profile_avatar", { p_path: nextPath }); if (saved.error) throw saved.error;
      committed = true;
      await refresh(); if (path) await client.storage.from("profile-photos").remove([path]);
      setMessage("Profile photo updated.");
    } catch (cause) {
      if (uploaded && !committed) await client?.storage.from("profile-photos").remove([uploaded]);
      setError(profileError(cause as { message?: string; code?: string }));
    } finally { action.current = false; setBusy(""); }
  }
  async function logout() {
    if (action.current) return; action.current = true; setBusy("logout"); setError("");
    try { const client = browserSupabase(); if (!client) throw Error("Sign-in unavailable."); const { error } = await client.auth.signOut({ scope: "local" }); if (error) throw error; writeAuthCookie(null); router.replace("/"); }
    catch { setError("Could not log out. Please try again."); }
    finally { action.current = false; setBusy(""); }
  }
  function add(share: ReceivedWorkout) {
    setError(""); setMessage("");
    try { addReceivedWorkouts(share.id, share.sessions); setMessage("Added to your sessions. You can edit your own copy in My Training."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add these sessions."); }
  }
  if (!user) return null;
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Your profile");
  return <div className="page-shell py-8 sm:py-10"><div className="mx-auto max-w-2xl space-y-6">
    <div className="flex items-center justify-between gap-4"><h1 className="page-title">Profile</h1><button type="button" disabled={!!busy} onClick={() => void logout()} className={button}>{busy === "logout" ? "Logging out..." : "Log out"}</button></div>
    <section aria-label="Your profile" className="rounded-2xl border border-white/10 bg-ink-850 p-5 sm:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-2xl font-bold text-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatar ? <img src={avatar} alt="Your profile photo" width={80} height={80} className="h-full w-full object-cover" onError={() => setAvatar("")} /> : name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0"><h2 className="break-words text-lg font-semibold">{name}</h2>{handle && <p className="mt-1 break-all text-sm text-accent">@{handle}</p>}<button type="button" disabled={!!busy || loading || !!loadError} onClick={() => photoInput.current?.click()} className="mt-2 min-h-11 text-sm text-white/65 underline underline-offset-4 disabled:opacity-40">{busy === "photo" ? "Uploading..." : "Upload photo"}</button></div>
      </div>
      <input ref={photoInput} type="file" aria-label="Upload profile photo" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!busy} onChange={event => void upload(event)} />
      <p className="mt-3 text-xs text-white/40">JPG, PNG or WebP, up to 2 MB.</p>
      {loading && <p role="status" className="mt-4 text-sm text-white/60">Loading profile...</p>}
      {loadError && <div className="mt-4"><p role="alert" className="text-sm text-red-200">{loadError}</p><button type="button" className={`${button} mt-3`} onClick={() => void refresh()}>Retry profile</button></div>}
      {!loading && !loadError && !handle && <form onSubmit={claim} className="mt-5 space-y-3 border-t border-white/10 pt-5">
        <label className="block text-sm font-semibold">Choose your unique username<input required minLength={3} maxLength={24} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-white/15 bg-ink-950 px-3" placeholder="e.g. alex_fit" /></label>
        <p className="text-xs text-white/50">3-24 letters, numbers or underscores. Choose once to share and receive workouts.</p>
        <button disabled={!!busy} className={`${button} bg-accent text-ink-950`}>{busy === "username" ? "Saving..." : "Save username"}</button>
      </form>}
    </section>
    {error && <p role="alert" className="rounded-xl border border-red-300/20 p-4 text-sm text-red-200">{error}</p>}{message && <p role="status" className="text-sm text-accent">{message}</p>}
    <section aria-label="Received sessions" className="rounded-2xl border border-white/10 bg-ink-850 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Received sessions</h2>{handle && <button type="button" disabled={inboxLoading} onClick={() => void loadInbox()} className={button}>Refresh</button>}</div>
      {!handle ? <p className="mt-4 text-sm text-white/50">Choose your username to receive workouts from others.</p> : <>
        {inboxError && <p role="alert" className="mt-4 text-sm text-red-200">{inboxError}</p>}
        {inboxLoading && <p role="status" className="mt-4 text-sm text-white/50">Loading received sessions...</p>}
        {!inboxLoading && !inboxError && !inbox.length && <p className="mt-4 text-sm text-white/50">No workouts received yet. Friends can share to @{handle} from My Training.</p>}
        <div className="mt-4 space-y-4">{inbox.map(share => {
          const added = share.sessions.every((_, i) => workouts.some(w => w.id === sharedSessionId(share.id, i)));
          return <article key={share.id} className="min-w-0 rounded-xl border border-white/10 bg-ink-950/50 p-4">
            <p className="break-all text-sm text-accent">From @{share.sender_username}</p><p className="mt-1 text-xs text-white/40">{new Date(share.created_at).toLocaleDateString()}</p>
            {share.sessions.map((session, i) => <details key={i} className="mt-3"><summary className="min-h-11 cursor-pointer break-words py-2 text-sm font-semibold">{session.name} <span className="font-normal text-white/50">({session.exercises.length} {session.exercises.length === 1 ? "exercise" : "exercises"})</span></summary><ul className="space-y-1 pb-2 pl-4 text-sm text-white/60">{session.exercises.map(ex => <li key={ex.slug} className="break-words">{ex.name}</li>)}</ul></details>)}
            <button type="button" disabled={!hydrated || added} onClick={() => add(share)} className={`${button} mt-3 bg-accent text-ink-950`}>{added ? "Added to your sessions" : share.sessions.length === 1 ? "Add to my sessions" : "Add all to my sessions"}</button>
          </article>;
        })}</div>
        {hasMore && <button type="button" disabled={inboxLoading} onClick={() => void loadInbox(false)} className={`${button} mt-4`}>Load more</button>}
      </>}
    </section>
  </div></div>;
}
