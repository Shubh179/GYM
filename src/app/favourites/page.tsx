"use client";

import Link from "next/link";
import ExerciseCard from "@/components/ExerciseCard";
import { useLibrary } from "@/lib/library";

export default function FavouritesPage() {
  const { hydrated, favourites } = useLibrary();
  return (
    <div className="page-shell py-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="page-title">Favourites</h1>
        {hydrated && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          {favourites.length} {favourites.length === 1 ? "exercise" : "exercises"}
        </span>}
      </div>
      {!hydrated ? (
        <p role="status" className="py-10 text-center text-white/50">Loading your favourites...</p>
      ) : favourites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-850/50 p-10 text-center">
          <p className="text-white/60">No favourites yet. Tap the heart on any exercise to save it here.</p>
          <Link href="/search" className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-accent-soft">Browse exercises</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {favourites.map((exercise, index) => <ExerciseCard key={exercise.slug} result={exercise} index={index} />)}
        </div>
      )}
    </div>
  );
}
