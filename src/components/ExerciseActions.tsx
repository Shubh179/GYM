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
    hasNote,
  } = useLibrary();

  const [menuOpen, setMenuOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const faved = hydrated && isFavourite(exercise.slug);
  const noteSaved = hydrated && hasNote(exercise.slug);

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

  function handleScrollToNotes() {
    const section = document.getElementById("my-quick-notes");
    section?.scrollIntoView({ behavior: "smooth" });
    const ta = document.getElementById("my-quick-notes-textarea");
    ta?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => toggleFavourite(exercise)}
        aria-pressed={faved}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          faved
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-white/15 bg-ink-850 text-white/80 hover:border-accent/40 hover:text-accent"
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

      {/* Quick Notes jump button */}
      <button
        onClick={handleScrollToNotes}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          noteSaved
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-white/15 bg-ink-850 text-white/80 hover:border-accent/40 hover:text-accent"
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        {noteSaved ? "Notes (saved)" : "Quick Notes"}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-ink-850 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-accent/40 hover:text-accent"
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
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Add to a workout
            </p>
            <div className="max-h-48 overflow-y-auto">
              {workouts.length === 0 && (
                <p className="px-2 py-2 text-xs text-white/50">
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
                        ? "cursor-default text-accent"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{w.name}</span>
                    {added ? (
                      <span className="text-xs">Added ✓</span>
                    ) : (
                      <span className="text-xs text-white/50">Add</span>
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
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:border-accent/50 focus:outline-none"
              />
              <button
                onClick={handleCreate}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft"
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
