"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AddExerciseForm from "@/components/AddExerciseForm";
import SearchBar from "@/components/SearchBar";
import ExerciseCard from "@/components/ExerciseCard";
import type { SearchResult } from "@/lib/types";

function Results() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const muscle = params.get("muscle") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = muscle
      ? `/api/exercises?muscle=${encodeURIComponent(muscle)}`
      : `/api/exercises?q=${encodeURIComponent(q)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .finally(() => setLoading(false));
  }, [q, muscle]);

  const heading = muscle
    ? `Exercises for ${muscle}`
    : q
    ? `Results for “${q}”`
    : "All exercises";

  return (
    <div className="page-shell py-10">
      <div className="mb-8 border-b border-white/10 pb-7">
        <p className="page-eyebrow">Exercise library</p>
        <h1 className="page-title">Find your next movement.</h1>
        <p className="mt-3 text-sm text-white/60">Demonstrations, technique, and your own exercises. All in one place.</p>
      </div>
      <div className="mb-8 max-w-2xl">
        <SearchBar size="md" initialQuery={q} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-white">
          {heading}
        </h2>
        {!loading && (
          <span className="text-sm text-white/50">{results.length} found</span>
        )}
      </div>

      <AddExerciseForm onCreated={exercise => setResults(previous => [exercise, ...previous.filter(item => item.slug !== exercise.slug)])} />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-ink-850"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {results.map((r, i) => (
            <ExerciseCard key={r.slug} result={r} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-ink-850 p-10 text-center">
          <p className="text-white/60">
            No exercises in the dataset match “{q}”.
          </p>
          {q && (
            <a
              href={`/exercise/${encodeURIComponent(
                q.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
              )}`}
              className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-accent-soft"
            >
              Generate it with AI →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-white/50">Loading…</div>}>
      <Results />
    </Suspense>
  );
}
