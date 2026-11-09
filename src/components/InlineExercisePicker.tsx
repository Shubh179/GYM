"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { exerciseTargets, targetLabel } from "@/lib/muscle-targets";
import AddExerciseForm from "./AddExerciseForm";
import type { SearchResult } from "@/lib/types";
import { useLibrary, type Workout } from "@/lib/library";

const QUICK_CHIPS = [
  "Suggested",
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Abs",
];

interface InlineExercisePickerProps {
  workout: Workout;
  onClose: () => void;
}

export default function InlineExercisePicker({
  workout,
  onClose,
}: InlineExercisePickerProps) {
  const { addToWorkout } = useLibrary();
  const [query, setQuery] = useState("");
  const [selectedChip, setSelectedChip] = useState("Suggested");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Set of exercise slugs already present in this workout
  const existingSlugs = useMemo(
    () => new Set(workout.exercises.map((e) => e.slug)),
    [workout.exercises]
  );

  // Initial suggested query derived from workout name
  const suggestedSearchTerm = useMemo(() => {
    const lower = workout.name.toLowerCase();
    if (lower.includes("chest")) return "chest";
    if (lower.includes("back")) return "back";
    if (lower.includes("shoulder")) return "shoulder";
    if (lower.includes("leg") || lower.includes("squat")) return "squat";
    if (lower.includes("arm") || lower.includes("bicep")) return "bicep";
    if (lower.includes("tricep")) return "tricep";
    if (lower.includes("ab") || lower.includes("core")) return "crunch";
    return workout.name.trim();
  }, [workout.name]);

  // Fetch exercises when query or chip changes
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let url = "";
        if (query.trim().length > 0) {
          url = `/api/exercises?q=${encodeURIComponent(query.trim())}`;
        } else if (selectedChip === "Suggested") {
          url = suggestedSearchTerm
            ? `/api/exercises?q=${encodeURIComponent(suggestedSearchTerm)}`
            : `/api/exercises?mode=popular`;
        } else {
          url = `/api/exercises?q=${encodeURIComponent(selectedChip.toLowerCase())}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (active) {
          setResults(data.results ?? []);
        }
      } catch (err) {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, selectedChip, suggestedSearchTerm]);

  function handleSelectChip(chip: string) {
    setSelectedChip(chip);
    setQuery("");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="mb-6 rounded-2xl border border-accent/30 bg-ink-900/95 p-4 shadow-xl backdrop-blur-md sm:p-5"
    >
      <AddExerciseForm onCreated={exercise => { addToWorkout(workout.id, exercise); setResults(previous => [exercise, ...previous.filter(item => item.slug !== exercise.slug)]); }} />
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div>
            <h4 className="text-sm font-bold text-white">
              Add Exercises to{" "}
              <span className="capitalize text-accent">{workout.name}</span>
            </h4>
            <p className="text-xs text-white/50">
              Pick from suggestions or search the exercise library
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close add exercise panel"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Input & Filter Chips */}
      <div className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedChip !== "") setSelectedChip("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search exercises by name, muscle, or equipment..."
            className="w-full rounded-xl border border-white/15 bg-ink-850 px-10 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-accent/60 focus:bg-ink-800 focus:outline-none"
          />
          <svg
            className="absolute left-3.5 top-3 h-4 w-4 text-white/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedChip("Suggested");
              }}
              className="absolute right-3.5 top-2.5 text-xs text-white/50 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Muscle Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-medium text-white/50">Quick filter:</span>
          {QUICK_CHIPS.map((chip) => {
            const isSelected = selectedChip === chip && !query;
            return (
              <button
                key={chip}
                onClick={() => handleSelectChip(chip)}
                className={`min-h-11 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-accent text-ink-950"
                    : "border border-white/10 bg-white/5 text-white/70 hover:border-accent/40 hover:text-white"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Section */}
      <div className="mt-4 max-h-80 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-white/50">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
            Searching exercises…
          </div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/50">
            No exercises found. Try searching a different term or muscle.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, 18).map((ex) => {
              const alreadyAdded = existingSlugs.has(ex.slug);
              return (
                <div
                  key={ex.slug}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition ${
                    alreadyAdded
                      ? "border-accent/30 bg-accent/[0.04]"
                      : "border-white/10 bg-ink-850 hover:border-white/20 hover:bg-ink-800"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {/* Thumbnail */}
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-700">
                      {ex.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ex.thumbUrl}
                          alt={ex.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-accent/40">
                          EX
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">
                        {ex.name}
                      </p>
                      <p className="truncate text-[11px] capitalize text-white/50">
                        {exerciseTargets(ex).map(targetLabel).join(", ") || ex.primaryMuscles.join(", ") || "Target unspecified"}
                        {ex.equipment ? ` · ${ex.equipment}` : ""}
                      </p>
                      <span className="inline-block rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase text-accent">
                        {ex.level}
                      </span>
                    </div>
                  </div>

                  {/* Add / Added Button */}
                  <div className="shrink-0">
                    {alreadyAdded ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-bold text-accent">
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => addToWorkout(workout.id, ex)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-bold text-ink-950 transition hover:bg-accent-soft"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/50">
        <span>
          {workout.exercises.length}{" "}
          {workout.exercises.length === 1 ? "exercise" : "exercises"} in this
          session
        </span>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/20"
        >
          Done adding
        </button>
      </div>
    </motion.div>
  );
}
