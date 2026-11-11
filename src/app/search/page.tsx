"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AddExerciseForm from "@/components/AddExerciseForm";
import SearchBar from "@/components/SearchBar";
import ExerciseCard from "@/components/ExerciseCard";
import type { SearchResult } from "@/lib/types";
import { exerciseTargets, sortByDifficulty, targetLabel, MUSCLE_TARGETS } from "@/lib/muscle-targets";

const difficultyGroups = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "unrated", label: "Unrated / custom" },
];
function difficulty(level: string): string {
  const value = level.toLowerCase();
  return ["expert", "advance", "advanced"].includes(value) ? "advanced"
    : ["beginner", "intermediate"].includes(value) ? value : "unrated";
}

function Results() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const muscle = params.get("muscle") ?? "";
  const target = params.get("target") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relatedMuscle, setRelatedMuscle] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    setError("");
    setRelatedMuscle("");
    setExpanded([]);
    const controller = new AbortController();
    const url = target
      ? `/api/exercises?target=${encodeURIComponent(target)}`
      : muscle
      ? `/api/exercises?muscle=${encodeURIComponent(muscle)}`
      : q ? `/api/exercises?q=${encodeURIComponent(q)}` : "/api/exercises?mode=browse";
    fetch(url, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "Could not load exercises.");
        return data;
      })
      .then(data => {
        if (!controller.signal.aborted) {
          setResults(data.results ?? []);
          setRelatedMuscle(data.relatedMuscle ?? "");
        }
      })
      .catch(cause => { if (!controller.signal.aborted) { setResults([]); setError(cause.message || "Could not load exercises."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [q, muscle, target]);

  const heading = target
    ? `Exercises for ${targetLabel(target)}`
    : muscle
    ? `Exercises for ${muscle}`
    : q
    ? `Results for “${q}”`
    : "All exercises";

  return (
    <div className="page-shell py-10">
      <div className="mb-5 border-b border-white/10 pb-5">

        <h1 className="page-title">Exercises</h1>

      </div>

      {target && <p className="mb-5 text-xs text-white/50">Beginner, intermediate, then advanced. Unrated exercises follow.</p>}
      {!loading && relatedMuscle && results.length > 0 && <p className="mb-5 text-sm text-white/60" role="status">No exact region tags are available for {targetLabel(target)}. Showing related {relatedMuscle} exercises; their emphasis on this specific region is unspecified.</p>}
      <div className="mb-8 max-w-2xl">
        <SearchBar size="md" initialQuery={q} />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <a href="/search" className="rounded-lg border border-white/20 px-3 py-2 text-sm">All muscles</a>
        <label className="flex items-center gap-2 text-sm text-white/70">Muscle region
          <select aria-label="Muscle region" value={target} onChange={event => router.push(event.target.value ? `/search?target=${encodeURIComponent(event.target.value)}` : "/search")} className="min-h-11 rounded-lg bg-ink-850 px-3 text-white">
            <option value="">Choose a region</option>
            {MUSCLE_TARGETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-white">
          {heading}
        </h2>
        {!loading && (
          <span className="text-sm text-white/50">{results.length} found</span>
        )}
      </div>

      <AddExerciseForm onCreated={exercise => {
        if (target && !exerciseTargets(exercise).includes(target)) return;
        if (muscle && !exercise.primaryMuscles.includes(muscle)) return;
        setResults(previous => {
          const next = [exercise, ...previous.filter(item => item.slug !== exercise.slug)];
          return target ? sortByDifficulty(next) : next;
        });
      }} />

      {error ? <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-200">{error}</div> : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-ink-850"
            />
          ))}
        </div>
      ) : results.length > 0 ? (
        q && !target && !muscle ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {results.map((r, i) => (
            <ExerciseCard key={r.slug} result={r} index={i} />
          ))}
        </div>
        ) : <div className="space-y-10">{difficultyGroups.map(group => {
          const exercises = results.filter(item => difficulty(item.level) === group.id);
          if (!exercises.length) return null;
          const isExpanded = expanded.includes(group.id);
          return <section key={group.id} aria-label={`${group.label} exercises`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{group.label} <span className="text-sm text-white/50">({exercises.length})</span></h3>
              {exercises.length > 3 && <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(current => isExpanded ? current.filter(id => id !== group.id) : [...current, group.id])} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm">{isExpanded ? "Show fewer" : `View all ${group.label.toLowerCase()}`}</button>}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {(isExpanded ? exercises : exercises.slice(0, 3)).map((result, index) => <ExerciseCard key={result.slug} result={result} index={index} />)}
            </div>
          </section>;
        })}</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-ink-850 p-10 text-center">
          <p className="text-white/60">
            {target ? `No exercises currently have ${targetLabel(target)} as a recorded target.` : `No exercises in the dataset match “${q}”.`}
          </p>
          {(q || target) && (
            <a
              href="/search"
              className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-accent-soft"
            >
              Browse all exercises
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
