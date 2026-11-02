"use client";

import { useState, type FormEvent } from "react";
import { useSpotify } from "@/components/SpotifyProvider";

export default function SpotifyPage() {
  const { items, hydrated, add, play, remove, activeKey, error: storageError } = useSpotify();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = add(url, name);
    setError(problem || "");
    if (!problem) { setUrl(""); setName(""); }
  }
  return <div className="page-shell pb-64 pt-10">
    <h1 className="page-title">Spotify</h1>
    <section aria-label="Example Spotify playlist" className="mt-8 rounded-2xl border border-accent/20 bg-ink-850 p-4 sm:p-5">
      <h2 className="font-display text-xl font-bold text-white">Try it: Beast Mode</h2>
      <p className="mb-4 mt-2 text-sm text-white/50">Play music without leaving your workout.</p>
      {!activeKey ? <iframe
        title="Spotify Beast Mode workout playlist"
        src="https://open.spotify.com/embed/playlist/37i9dQZF1DX76Wlfdnj7AP?utm_source=generator&theme=0"
        width="100%" height="352" className="block rounded-xl border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen
      /> : <p className="rounded-xl bg-ink-900 p-4 text-sm text-accent">Your selected playlist is open in the floating player. Expand it to browse its tracks.</p>}
      <p className="mt-3 text-xs text-white/50">Spotify may offer previews or ask you to sign in for full playback.</p>
      <button type="button" disabled={!hydrated} onClick={() => {
        const key = "playlist/37i9dQZF1DX76Wlfdnj7AP";
        if (items.some(item => item.key === key)) play(key);
        else setError(add("https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP", "Beast Mode") || "");
      }} className="mt-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50">Keep this playlist while I train</button>
    </section>
    <form onSubmit={submit} className="my-8 space-y-4 rounded-2xl border border-white/10 bg-ink-850 p-5">
      <h2 className="font-display text-lg font-bold text-white">Add Spotify music</h2>
      <p className="text-sm text-white/50">Paste a Spotify share link.</p>
      <label className="block text-sm text-white/70">Spotify link
        <input required type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://open.spotify.com/playlist/..." className="mt-1 block w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2.5 text-white focus:border-accent/50 focus:outline-none" />
      </label>
      <label className="block text-sm text-white/70">Name (optional)
        <input maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Heavy lifting" className="mt-1 block w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2.5 text-white focus:border-accent/50 focus:outline-none" />
      </label>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button disabled={!hydrated} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50">Save and open player</button>
    </form>
    {storageError && <p role="alert" className="mb-4 text-sm text-amber-300">{storageError}</p>}
    <h2 className="mb-4 font-display text-xl font-bold text-white">Saved for the gym</h2>
    {!hydrated ? <p role="status" className="text-white/50">Loading saved music...</p> : !items.length ?
      <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50">Your soundtrack starts here. Add your first Spotify link above.</p> :
      <div className="space-y-3">{items.map(item => <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-850 p-4">
        <div className="min-w-0"><h3 className="break-words font-semibold text-white">{item.name}</h3><p className="text-xs capitalize text-white/50">{item.type === "show" ? "Podcast" : item.type}{activeKey === item.key ? " - Player open" : ""}</p></div>
        <div className="flex items-center gap-4 text-sm">
          <button type="button" onClick={() => play(item.key)} className="font-semibold text-accent">{activeKey === item.key ? "Selected" : "Play"}</button>
          <a href={item.url} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white">Open Spotify</a>
          <button type="button" onClick={() => remove(item.key)} aria-label={`Remove ${item.name}`} className="text-white/50 hover:text-red-400">Remove</button>
        </div>
      </div>)}</div>}
  </div>;
}
