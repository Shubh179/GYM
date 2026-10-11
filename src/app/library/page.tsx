"use client";

import { useState } from "react";
import Link from "next/link";
import ExerciseCard from "@/components/ExerciseCard";
import WorkoutHeatmap from "@/components/WorkoutHeatmap";
import { useLibrary, type Workout } from "@/lib/library";

function WorkoutBlock({ workout }: { workout: Workout }) {
  const {
    renameWorkout,
    deleteWorkout,
    removeFromWorkout,
    isExerciseDone,
    toggleExerciseDone,
    doneCount,
    isSessionCompletedToday,
    toggleSessionComplete,
  } = useLibrary();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workout.name);

  function saveName() {
    renameWorkout(workout.id, name);
    setEditing(false);
  }

  const total = workout.exercises.length;
  const done = doneCount(workout.id);
  const sessionDone = isSessionCompletedToday(workout.id);

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-850 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {editing ? (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              className="rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-lg font-bold text-white focus:border-lime/50 focus:outline-none"
            />
            <button
              onClick={saveName}
              className="rounded-lg bg-lime px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-lime-soft"
            >
              Save
            </button>
          </div>
        ) : (
          <h3 className="font-display text-xl font-bold capitalize text-white">
            {workout.name}
            <span className="ml-2 text-sm font-medium text-white/40">
              {workout.exercises.length}{" "}
              {workout.exercises.length === 1 ? "exercise" : "exercises"}
            </span>
          </h3>
        )}
        <div className="flex items-center gap-2 text-sm">
          {total > 0 && (
            <button
              onClick={() => toggleSessionComplete(workout.id)}
              aria-pressed={sessionDone}
              aria-label={
                sessionDone
                  ? `Mark ${workout.name} session as not complete`
                  : `Mark ${workout.name} session as complete`
              }
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-semibold transition ${
                sessionDone
                  ? "border-lime bg-lime text-ink-950"
                  : "border-lime/40 bg-lime/10 text-lime hover:bg-lime/20"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  sessionDone
                    ? "border-ink-950/40 text-ink-950"
                    : "border-lime/60 text-transparent"
                }`}
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {sessionDone ? "Completed today" : "Complete session"}
            </button>
          )}
          {!editing && (
            <button
              onClick={() => {
                setName(workout.name);
                setEditing(true);
              }}
              className="text-white/50 transition hover:text-white"
            >
              Rename
            </button>
          )}
          <button
            onClick={() => deleteWorkout(workout.id)}
            className="text-white/50 transition hover:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-lime transition-all"
              style={{ width: `${sessionDone ? 100 : (done / total) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-white/50">
            {sessionDone ? `${total}/${total}` : `${done}/${total}`} done
          </span>
        </div>
      )}

      {workout.exercises.length === 0 ? (
        <p className="text-sm text-white/40">
          Empty. Open an exercise and use “Add to workout” to add it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {workout.exercises.map((ex, i) => {
            const checked = isExerciseDone(workout.id, ex.slug) || sessionDone;
            return (
              <div key={ex.slug} className="flex flex-col gap-2">
                <div className="relative">
                  <ExerciseCard result={ex} index={i} />
                  <button
                    onClick={() => removeFromWorkout(workout.id, ex.slug)}
                    aria-label={`Remove ${ex.name} from ${workout.name}`}
                    className="absolute right-12 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-950/80 text-white/70 backdrop-blur transition hover:border-red-400/50 hover:text-red-400"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => toggleExerciseDone(workout.id, ex.slug)}
                  aria-label={
                    checked
                      ? `Mark ${ex.name} as not done`
                      : `Mark ${ex.name} as done`
                  }
                  aria-pressed={checked}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    checked
                      ? "border-lime bg-lime text-ink-950"
                      : "border-white/15 bg-ink-900 text-white/70 hover:border-lime/60 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      checked
                        ? "border-ink-950/40 bg-ink-950/20 text-ink-950"
                        : "border-white/30 text-transparent"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {checked ? "Completed" : "Mark done"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const { hydrated, favourites, workouts, createWorkout } = useLibrary();
  const [newName, setNewName] = useState("");

  function handleCreate() {
    if (createWorkout(newName)) setNewName("");
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-20 text-center text-white/40">
        Loading your library…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
        My Training
      </h1>
      <p className="mt-2 text-white/50">
        Your saved exercises and custom workout sessions. Everything is stored on
        this device.
      </p>

      {/* Activity heatmap */}
      <section className="mt-8">
        <WorkoutHeatmap />
      </section>

      {/* Workouts */}
      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Workout sessions
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Tick off each exercise as you go — finish them all and the day
              lights up on your heatmap.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Chest day"
              className="w-44 rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-lime/50 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              className="rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-lime-soft"
            >
              New session
            </button>
          </div>
        </div>

        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-ink-850/50 p-10 text-center">
            <p className="text-white/60">
              No sessions yet. Create one above (like “Chest” or “Leg day”), then
              add exercises to it from any exercise page.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {workouts.map((w) => (
              <WorkoutBlock key={w.id} workout={w} />
            ))}
          </div>
        )}
      </section>

      {/* Favourites */}
      <section className="mt-16">
        <h2 className="mb-5 font-display text-2xl font-bold text-white">
          Favourites
        </h2>
        {favourites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-ink-850/50 p-10 text-center">
            <p className="text-white/60">
              No favourites yet. Tap the heart on any exercise to save it here.
            </p>
            <Link
              href="/search"
              className="mt-4 inline-block rounded-xl bg-lime px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-lime-soft"
            >
              Browse exercises →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {favourites.map((r, i) => (
              <ExerciseCard key={r.slug} result={r} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
