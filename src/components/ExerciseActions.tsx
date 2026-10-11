"use client";

import { useEffect, useRef, useState } from "react";
import { useLibrary, type SavedExercise } from "@/lib/library";

// Save-to-favourites + add-to-workout controls shown on an exercise page.
export default function ExerciseActions({
  exercise,
}: {
  exercise: SavedExercise;
}) {
  const {
    hydrated,
    isFavourite,
    toggleFavourite,
    workouts,
    addToWorkout,
    isInWorkout,
    createWorkout,
  } = useLibrary();

  const [menuOpen, setMenuOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const faved = hydrated && isFavourite(exercise.slug);

  // Close the workout menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function handleCreate() {
    const w = createWorkout(newName);
    if (w) {
      addToWorkout(w.id, exercise);
      setNewName("");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => toggleFavourite(exercise)}
        aria-pressed={faved}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          faved
            ? "border-lime/50 bg-lime/15 text-lime"
            : "border-white/15 bg-ink-850 text-white/80 hover:border-lime/40 hover:text-lime"
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={faved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 21s-7.5-4.9-10-9.3C.6 9 1.4 5.6 4.3 4.5 6.3 3.7 8.6 4.4 10 6c.4.5.7 1 1 1.5.3-.5.6-1 1-1.5 1.4-1.6 3.7-2.3 5.7-1.5 2.9 1.1 3.7 4.5 2.3 7.2C19.5 16.1 12 21 12 21z" />
        </svg>
        {faved ? "Saved" : "Save to favourites"}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-ink-850 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-lime/40 hover:text-lime"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add to workout
        </button>

        {menuOpen && (
          <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-ink-850 p-2 shadow-card">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Add to a workout
            </p>
            <div className="max-h-48 overflow-y-auto">
              {workouts.length === 0 && (
                <p className="px-2 py-2 text-xs text-white/40">
                  No workouts yet. Create one below.
                </p>
              )}
              {workouts.map((w) => {
                const added = isInWorkout(w.id, exercise.slug);
                return (
                  <button
                    key={w.id}
                    onClick={() => addToWorkout(w.id, exercise)}
                    disabled={added}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition ${
                      added
                        ? "cursor-default text-lime"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{w.name}</span>
                    {added ? (
                      <span className="text-xs">Added ✓</span>
                    ) : (
                      <span className="text-xs text-white/30">Add</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex gap-2 border-t border-white/10 pt-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="New workout…"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-lime/50 focus:outline-none"
              />
              <button
                onClick={handleCreate}
                className="rounded-lg bg-lime px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-lime-soft"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
