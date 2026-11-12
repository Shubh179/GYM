"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseCard from "@/components/ExerciseCard";
import WeeklySchedule from "@/components/SyncedWeeklySchedule";
import WorkoutHeatmap from "@/components/WorkoutHeatmap";
import MuscleGuide from "@/components/MuscleGuide";
import InlineExercisePicker from "@/components/InlineExercisePicker";
import QuickNotes from "@/components/QuickNotes";
import {
  useLibrary,
  dateToKey,
  type Workout,
  type SavedExercise,
} from "@/lib/library";

function WorkoutBlock({
  workout,
  isCollapsed,
  onToggleCollapse,
}: {
  workout: Workout;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const {
    renameWorkout,
    deleteWorkout,
    removeFromWorkout,
    isExerciseDone,
    toggleExerciseDone,
    doneCount,
    isSessionCompletedToday,
    toggleSessionComplete,
    getNote,
    hasNote,
    getHistoryForDate,
  } = useLibrary();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workout.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [activeNotesExercise, setActiveNotesExercise] =
    useState<SavedExercise | null>(null);

  const [localCollapsed, setLocalCollapsed] = useState(true);
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;
  const toggleCollapse =
    onToggleCollapse ?? (() => setLocalCollapsed((v) => !v));

  function saveName() {
    renameWorkout(workout.id, name);
    setEditing(false);
  }

  const total = workout.exercises.length;
  const done = doneCount(workout.id);
  const sessionDone = isSessionCompletedToday(workout.id);
  const recordedSession = getHistoryForDate(dateToKey()).find(
    (session) => session.workoutId === workout.id
  );
  const completedCount = sessionDone ? (recordedSession?.exercises.length ?? 0) : done;

  return (
    <div data-workout-id={workout.id} className="rounded-xl border border-white/10 bg-ink-850 p-4 transition sm:p-6">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          collapsed ? "" : "mb-4"
        }`}
      >
        <div className="flex min-w-0 max-w-full items-center gap-2.5">
          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${workout.name}` : `Collapse ${workout.name}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {editing ? (
            <div className="flex min-w-0 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
                className="min-w-0 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-lg font-bold text-white focus:border-accent/50 focus:outline-none"
              />
              <button
                onClick={saveName}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft"
              >
                Save
              </button>
            </div>
          ) : (
            <div
              onClick={toggleCollapse}
              className="flex min-w-0 flex-1 cursor-pointer select-none flex-wrap items-center gap-2"
            >
              <h3 className="min-w-0 max-w-full [overflow-wrap:anywhere] font-display text-lg font-semibold capitalize text-white">
                {workout.name}
              </h3>
              <span className="text-sm font-medium text-white/50">
                {workout.exercises.length}{" "}
                {workout.exercises.length === 1 ? "exercise" : "exercises"}
              </span>
              {collapsed && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    sessionDone
                      ? "border border-accent/40 bg-accent/10 text-accent"
                      : "border border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  {sessionDone ? `${completedCount}/${total} done today` : `${done}/${total} done`}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={`${collapsed ? "hidden" : "flex"} flex-wrap items-center gap-2 text-sm`}>
          {/* Direct Add Exercise Toggle Button */}
          <button
            onClick={() => setShowAddExercise((v) => !v)}
            aria-expanded={showAddExercise}
            className={`flex items-center gap-1.5 min-h-11 rounded-lg border px-3 py-2.5 font-semibold transition ${
              showAddExercise
                ? "border-accent bg-accent text-ink-950 shadow-sm"
                : "border-white/15 bg-white/5 text-white/90 hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
            }`}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${
                showAddExercise ? "rotate-45" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {showAddExercise ? "Close search" : "Add exercise"}
          </button>

          {total > 0 && (
            <button
              onClick={() => toggleSessionComplete(workout.id)}
              disabled={!sessionDone && done === 0}
              title={!sessionDone && done === 0 ? "Check the exercises you performed first" : undefined}
              aria-pressed={sessionDone}
              aria-label={
                sessionDone
                  ? `Mark ${workout.name} session as not complete`
                  : `Mark ${workout.name} session as complete`
              }
              className={`flex items-center gap-2 min-h-11 rounded-lg border px-3 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                sessionDone
                  ? "border-accent bg-accent text-ink-950"
                  : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  sessionDone
                    ? "border-ink-950/40 text-ink-950"
                    : "border-accent/60 text-transparent"
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
              className="min-h-11 px-2 text-white/50 transition hover:text-white"
            >
              Rename
            </button>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteWorkout(workout.id)}
                className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/30"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-white/50 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="min-h-11 px-2 text-white/50 transition hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {total > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${(completedCount / total) * 100}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium text-white/50">
                  {completedCount}/{total} done
                </span>
              </div>
            )}

            {/* Expandable Inline Exercise Search & Add Drawer */}
            <MuscleGuide sessionName={workout.name} sessionId={workout.id} exercises={workout.exercises} />

            <AnimatePresence>
              {showAddExercise && (
                <InlineExercisePicker
                  workout={workout}
                  onClose={() => setShowAddExercise(false)}
                />
              )}
            </AnimatePresence>

            {workout.exercises.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-8 text-center">
                <p className="text-sm text-white/60">
                  No exercises in this session yet.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setShowAddExercise(true)}
                    className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add exercise directly
                  </button>
                  <Link
                    href="/search"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    Browse exercise directory →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {workout.exercises.map((ex, i) => {
                  const checked = sessionDone
                    ? Boolean(recordedSession?.exercises.some((saved) => saved.slug === ex.slug))
                    : isExerciseDone(workout.id, ex.slug);
                  return (
                    <div key={ex.slug} data-workout-exercise data-exercise-slug={ex.slug} role="group" tabIndex={-1} aria-label={ex.name} className="flex h-full min-w-0 scroll-mt-36 flex-col gap-2 rounded-xl focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-accent">
                      <div className="relative">
                        <ExerciseCard result={ex} index={i} />
                        <button
                          onClick={() => removeFromWorkout(workout.id, ex.slug)}
                          aria-label={`Remove ${ex.name} from ${workout.name}`}
                          className="absolute right-[60px] top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ink-950/80 text-white/70 backdrop-blur transition hover:border-red-400/50 hover:text-red-400"
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

                      {/* Personal Quick Note Button & Snippet */}
                      <button
                        type="button"
                        onClick={() => setActiveNotesExercise(ex)}
                        aria-label={`View personal notes for ${ex.name}`}
                        className={`flex h-11 shrink-0 items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                          hasNote(ex.slug)
                            ? "border-accent/40 bg-accent/[0.08] text-accent hover:border-accent/60 hover:bg-accent/15"
                            : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <svg
                            className="h-3.5 w-3.5 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span className="truncate">
                            {hasNote(ex.slug)
                              ? getNote(ex.slug).split("\n")[0]
                              : "My Notes"}
                          </span>
                        </span>
                        <span className="shrink-0 pl-1 text-[10px] text-white/50">
                          {hasNote(ex.slug) ? "View →" : "+ Add"}
                        </span>
                      </button>

                      <button
                        onClick={() => toggleExerciseDone(workout.id, ex.slug)}
                        title={sessionDone ? "Undo session completion to edit recorded exercises" : undefined}
                        aria-label={
                          checked
                            ? `Mark ${ex.name} as not done`
                            : `Mark ${ex.name} as done`
                        }
                        aria-pressed={checked}
                        className={`flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          checked
                            ? "border-accent bg-accent text-ink-950"
                            : "border-white/15 bg-ink-900 text-white/70 hover:border-accent/60 hover:text-white"
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

                {/* Direct Add Exercise Card at end of grid */}
                <button
                  type="button"
                  onClick={() => setShowAddExercise(true)}
                  className="group flex h-full min-h-[220px] min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-ink-900/40 p-4 text-center transition hover:border-accent/60 hover:bg-accent/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/60 transition group-hover:scale-110 group-hover:bg-accent group-hover:text-ink-950">
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-white/80 group-hover:text-white">
                      Add exercise
                    </span>
                    <span className="mt-0.5 block text-xs text-white/50">
                      Directly to {workout.name}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout Active Exercise Quick Notes Modal */}
      <AnimatePresence>
        {activeNotesExercise && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
            onClick={() => setActiveNotesExercise(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Personal exercise notes"
              className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl"
            >
              <QuickNotes
                exerciseSlug={activeNotesExercise.slug}
                exerciseName={activeNotesExercise.name}
                compact={false}
                onClose={() => setActiveNotesExercise(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main library page ────────────────────────────────────────────────────

export default function LibraryPage() {
  const { hydrated, workouts, createWorkout } = useLibrary();
  const [newName, setNewName] = useState("");
  const [collapsedWorkouts, setCollapsedWorkouts] = useState<Record<string, boolean>>({});

  function toggleWorkoutCollapse(id: string) {
    setCollapsedWorkouts((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  }

  function handleCreate() {
    if (createWorkout(newName)) setNewName("");
  }

  if (!hydrated) {
    return (
      <div className="page-shell py-20 text-center text-white/50">
        Loading your library…
      </div>
    );
  }

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">My Training</h1>
        </div>
        <Link href="/search" className="hidden min-h-11 items-center justify-center gap-3 self-start sm:inline-flex rounded-lg border border-white/15 bg-ink-850 px-5 py-3 text-sm font-semibold text-white transition hover:border-accent/50 sm:self-auto">
          Browse exercises <span aria-hidden="true" className="text-accent">&#8599;</span>
        </Link>
      </div>

      {/* Compact daily activity heatmap */}
      <section className="mt-6 sm:mt-8">
        <WorkoutHeatmap />
      </section>

      <div className="mt-6 sm:mt-8">
        <WeeklySchedule />
      </div>

      {/* Workout sessions */}
      <section className="mt-6 sm:mt-8">
        <div className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">
              Your sessions
            </h2>
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 xl:flex xl:w-auto">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              aria-label="New workout session name"
              placeholder="Session name"
              className="min-w-0 flex-1 rounded-lg xl:w-60 xl:flex-none border border-white/10 bg-ink-850 px-3.5 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-accent/50 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              className="min-h-11 shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft"
            >
              New session
            </button>
          </div>
        </div>

        {workouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-ink-850/50 px-5 py-12 text-center">
            <p className="text-white/60">
              No sessions yet. Create your first session above.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {workouts.map((w) => (
              <WorkoutBlock
                key={w.id}
                workout={w}
                isCollapsed={collapsedWorkouts[w.id] ?? true}
                onToggleCollapse={() => toggleWorkoutCollapse(w.id)}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
