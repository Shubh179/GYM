"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mx-auto mb-8 max-w-2xl">
        <SearchBar size="md" initialQuery={q} />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold capitalize text-white">
          {heading}
        </h1>
        {!loading && (
          <span className="text-sm text-white/40">{results.length} found</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-ink-850"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
              className="mt-4 inline-block rounded-xl bg-lime px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-lime-soft"
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
    <Suspense fallback={<div className="py-20 text-center text-white/40">Loading…</div>}>
      <Results />
    </Suspense>
  );
}
