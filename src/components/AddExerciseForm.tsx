"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { SearchResult } from "@/lib/types";

export default function AddExerciseForm({ onCreated }: { onCreated?: (exercise: SearchResult) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<SearchResult | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setCreated(null);
    try {
      const response = await fetch("/api/exercises", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
      className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
      {open ? "Close new exercise" : "+ Create exercise"}
    </button>
    {open && <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-ink-900 p-4">
      <h2 className="font-semibold text-white">Add to exercise dataset</h2>
      <label className="block text-sm text-white/70">Exercise name
        <input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} disabled={saving}
          placeholder="e.g. Cable chest press" className="mt-1 block w-full rounded-lg border border-white/15 bg-ink-850 px-3 py-2 text-white" />
      </label>
      <label className="block text-sm text-white/70">YouTube link
        <input required type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} disabled={saving}
          placeholder="https://www.youtube.com/watch?v=..." className="mt-1 block w-full rounded-lg border border-white/15 bg-ink-850 px-3 py-2 text-white" />
      </label>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {created && <p role="status" className="text-sm text-accent">Saved {created.name}. <Link className="underline" href={`/exercise/${created.slug}`}>View exercise</Link></p>}
      <button disabled={saving} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-50">{saving ? "Saving..." : "Save exercise"}</button>
    </form>}
  </div>;
}
