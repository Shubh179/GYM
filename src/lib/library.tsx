"use client";

// Personal training store with an offline cache and authenticated cloud sync.
// Supabase Auth scopes the cache and remounts it when accounts change.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SearchResult } from "./types";
import { usePathname } from "next/navigation";
import { primaryMuscleOverlapWarning } from "./muscle-overlap";
import { useAuth } from "@/components/AuthProvider";
import { emptyTraining } from "./training-merge";
import { useTrainingSync, type SyncStatus } from "./use-training-sync";

// A saved exercise carries just enough to render a card without re-fetching.
export type SavedExercise = SearchResult;

export interface Workout {
  id: string;
  name: string;
  exercises: SavedExercise[];
}

// A snapshot of a completed workout session, stored in workoutHistory.
export interface CompletedSession {
  id: string;
  workoutId: string;
  workoutName: string;
  exercises: SavedExercise[];
  completedAt: string; // ISO timestamp
  notes?: string;
}

export interface LibraryState {
  weeklySchedule: string;
  favourites: SavedExercise[];
  workouts: Workout[];
  // Per-workout in-progress ticks: workout id -> checked exercise slugs.
  progress: Record<string, string[]>;
  // Heatmap data: date "YYYY-MM-DD" -> number of sessions completed that day.
  completions: Record<string, number>;
  // Which workout sessions were marked complete on a given day:
  // date "YYYY-MM-DD" -> list of workout ids. Lets a session checkbox toggle
  // on/off, and lets two sessions in one day (e.g. chest + triceps) both count.
  sessionLog: Record<string, string[]>;
  // Full workout history: date "YYYY-MM-DD" -> completed sessions with exercises.
  // This is the source of truth for what was actually performed each day.
  workoutHistory: Record<string, CompletedSession[]>;
  // Personal quick notes per exercise: exercise slug -> note text
  notes: Record<string, string>;
}

interface LibraryContextValue extends LibraryState {
  hydrated: boolean;
  syncStatus: SyncStatus;
  syncError: string;
  syncNow: () => Promise<void>;
  setWeeklySchedule: (value: string) => void;
  refreshSavedExercises: (exercises: SavedExercise[]) => void;
  // Favourites
  isFavourite: (slug: string) => boolean;
  toggleFavourite: (ex: SavedExercise) => void;
  // Workouts
  createWorkout: (name: string) => Workout | null;
  renameWorkout: (id: string, name: string) => void;
  deleteWorkout: (id: string) => void;
  addToWorkout: (id: string, ex: SavedExercise) => void;
  removeFromWorkout: (id: string, slug: string) => void;
  isInWorkout: (id: string, slug: string) => boolean;
  // Completion tracking (drives the heatmap)
  isExerciseDone: (workoutId: string, slug: string) => boolean;
  toggleExerciseDone: (workoutId: string, slug: string) => void;
  doneCount: (workoutId: string) => number;
  // Whole-session completion (toggle the session done/undone for today).
  isSessionCompletedToday: (workoutId: string) => boolean;
  toggleSessionComplete: (workoutId: string) => void;
  // Workout history
  getHistoryForDate: (dateKey: string) => CompletedSession[];
  // Personal quick notes for exercises
  getNote: (slug: string) => string;
  hasNote: (slug: string) => boolean;
  setNote: (slug: string, noteText: string) => boolean;
  clearNote: (slug: string) => boolean;
}

const EMPTY = emptyTraining();

const LibraryContext = createContext<LibraryContextValue | null>(null);

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Local calendar day as "YYYY-MM-DD" (not UTC — the heatmap is a personal log).
export function dateToKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Keep the old name as an alias for internal use.
const todayKey = dateToKey;

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  // Legal information must be readable without sign-in or client initialization.
  if (loading && pathname !== "/privacy-policy") return <div className="page-shell py-12 text-white/60" role="status">Loading your training...</div>;
  return <LibraryStore key={user?.id ?? "guest"}>{children}</LibraryStore>;
}

function LibraryStore({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>(EMPTY);
  const { hydrated, syncStatus, syncError, syncNow, persistLocal } = useTrainingSync(state, setState);
  const metadataGeneration = useRef(0);
  const setWeeklySchedule = useCallback((weeklySchedule: string) => setState(previous => ({ ...previous, weeklySchedule })), []);

  const refreshSavedExercises = useCallback((exercises: SavedExercise[]) => {
    metadataGeneration.current += 1;
    const bySlug = new Map(exercises.map(exercise => [exercise.slug, exercise]));
    setState(previous => {
      let changed = false;
      const refresh = (exercise: SavedExercise) => {
        const updated = bySlug.get(exercise.slug);
        if (!updated || JSON.stringify(updated) === JSON.stringify(exercise)) return exercise;
        changed = true;
        return updated;
      };
      const favourites = previous.favourites.map(refresh);
      const workouts = previous.workouts.map(workout => ({ ...workout, exercises: workout.exercises.map(refresh) }));
      return changed ? { ...previous, favourites, workouts } : previous;
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      const generation = ++metadataGeneration.current;
      try {
        const response = await fetch("/api/exercises?mode=custom", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (active && generation === metadataGeneration.current && Array.isArray(data.results)) refreshSavedExercises(data.results);
      } catch { /* Keep browser-local data available during network outages. */ }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); window.removeEventListener("focus", refresh); };
  }, [hydrated, refreshSavedExercises]);

  const isFavourite = useCallback(
    (slug: string) => state.favourites.some((f) => f.slug === slug),
    [state.favourites]
  );

  const toggleFavourite = useCallback((ex: SavedExercise) => {
    setState((s) => {
      const exists = s.favourites.some((f) => f.slug === ex.slug);
      return {
        ...s,
        favourites: exists
          ? s.favourites.filter((f) => f.slug !== ex.slug)
          : [ex, ...s.favourites],
      };
    });
  }, []);

  const createWorkout = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const workout: Workout = { id: newId(), name: trimmed, exercises: [] };
    setState((s) => ({ ...s, workouts: [...s.workouts, workout] }));
    return workout;
  }, []);

  const renameWorkout = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) =>
        w.id === id ? { ...w, name: trimmed } : w
      ),
    }));
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setState((s) => {
      const progress = { ...s.progress };
      delete progress[id];
      return {
        ...s,
        workouts: s.workouts.filter((w) => w.id !== id),
        progress,
      };
    });
  }, []);

  const addToWorkout = useCallback((id: string, ex: SavedExercise) => {
    const workout = state.workouts.find((w) => w.id === id);
    if (workout?.exercises.some((e) => e.slug === ex.slug)) return;
    const warning = primaryMuscleOverlapWarning(ex, workout?.exercises ?? []);
    // Ask before updating state; React may run state updaters more than once.
    if (warning && !window.confirm(warning)) return;
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) =>
        w.id === id && !w.exercises.some((e) => e.slug === ex.slug)
          ? { ...w, exercises: [...w.exercises, ex] }
          : w
      ),
    }));
  }, [state.workouts]);

  const removeFromWorkout = useCallback((id: string, slug: string) => {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) =>
        w.id === id
          ? { ...w, exercises: w.exercises.filter((e) => e.slug !== slug) }
          : w
      ),
      // Drop any tick for the removed exercise so progress stays consistent.
      progress: {
        ...s.progress,
        [id]: (s.progress[id] ?? []).filter((x) => x !== slug),
      },
    }));
  }, []);

  const isInWorkout = useCallback(
    (id: string, slug: string) =>
      state.workouts.some(
        (w) => w.id === id && w.exercises.some((e) => e.slug === slug)
      ),
    [state.workouts]
  );

  const isExerciseDone = useCallback(
    (workoutId: string, slug: string) =>
      (state.progress[workoutId] ?? []).includes(slug),
    [state.progress]
  );

  const doneCount = useCallback(
    (workoutId: string) => (state.progress[workoutId] ?? []).length,
    [state.progress]
  );

  // Tick/untick an exercise. When every exercise in the session is ticked, the
  // session counts as done: log today on the heatmap, save to workoutHistory,
  // and reset the ticks so the same session can be completed again tomorrow.
  const toggleExerciseDone = useCallback(
    (workoutId: string, slug: string) => {
      setState((s) => {
        const workout = s.workouts.find((w) => w.id === workoutId);
        if (!workout) return s;

        const current = s.progress[workoutId] ?? [];
        const checked = current.includes(slug)
          ? current.filter((x) => x !== slug)
          : [...current, slug];

        const allSlugs = workout.exercises.map((e) => e.slug);
        const complete =
          allSlugs.length > 0 && allSlugs.every((sl) => checked.includes(sl));

        if (complete) {
          const key = todayKey();
          const todays = s.sessionLog[key] ?? [];
          // Already logged this session today — just clear the ticks, don't
          // double-count on the heatmap.
          if (todays.includes(workoutId)) {
            return { ...s, progress: { ...s.progress, [workoutId]: [] } };
          }
          // Save a snapshot of the completed session to workoutHistory.
          const session: CompletedSession = {
            id: newId(),
            workoutId,
            workoutName: workout.name,
            exercises: [...workout.exercises],
            completedAt: new Date().toISOString(),
          };
          const existingHistory = s.workoutHistory[key] ?? [];
          return {
            ...s,
            progress: { ...s.progress, [workoutId]: [] },
            sessionLog: { ...s.sessionLog, [key]: [...todays, workoutId] },
            completions: {
              ...s.completions,
              [key]: (s.completions[key] ?? 0) + 1,
            },
            workoutHistory: {
              ...s.workoutHistory,
              [key]: [...existingHistory, session],
            },
          };
        }

        return { ...s, progress: { ...s.progress, [workoutId]: checked } };
      });
    },
    []
  );

  const isSessionCompletedToday = useCallback(
    (workoutId: string) =>
      (state.sessionLog[todayKey()] ?? []).includes(workoutId),
    [state.sessionLog]
  );

  // Toggle a whole session's completion for today. Marking it done logs one
  // session on the heatmap, saves to workoutHistory, and clears any in-progress
  // ticks; unmarking removes today's log and history for that session. Two
  // different sessions in one day both count.
  const toggleSessionComplete = useCallback(
    (workoutId: string) => {
      setState((s) => {
        const key = todayKey();
        const todays = s.sessionLog[key] ?? [];
        const already = todays.includes(workoutId);
        const workout = s.workouts.find((w) => w.id === workoutId);

        if (already) {
          // --- Undo completion ---
          const nextList = todays.filter((id) => id !== workoutId);
          const sessionLog = { ...s.sessionLog };
          if (nextList.length) sessionLog[key] = nextList;
          else delete sessionLog[key];

          const completions = { ...s.completions };
          const next = (completions[key] ?? 0) - 1;
          if (next > 0) completions[key] = next;
          else delete completions[key];

          // Remove the most recent history entry for this workout on this day.
          const existingHistory = s.workoutHistory[key] ?? [];
          let removeIdx = -1;
          for (let i = existingHistory.length - 1; i >= 0; i--) {
            if (existingHistory[i].workoutId === workoutId) {
              removeIdx = i;
              break;
            }
          }
          const updatedHistory =
            removeIdx >= 0
              ? [
                  ...existingHistory.slice(0, removeIdx),
                  ...existingHistory.slice(removeIdx + 1),
                ]
              : existingHistory;
          const workoutHistory = { ...s.workoutHistory };
          if (updatedHistory.length) workoutHistory[key] = updatedHistory;
          else delete workoutHistory[key];

          const restored = removeIdx >= 0
            ? existingHistory[removeIdx].exercises.map((ex) => ex.slug)
            : [];
          return { ...s, sessionLog, completions, workoutHistory,
            progress: { ...s.progress, [workoutId]: restored } };
        }

        // --- Complete session ---
        if (!workout) return s;
        const checked = s.progress[workoutId] ?? [];
        const performed = workout.exercises.filter((ex) => checked.includes(ex.slug));
        if (performed.length === 0) return s;
        const session: CompletedSession = {
          id: newId(),
          workoutId,
          workoutName: workout?.name ?? "Workout",
          exercises: performed,
          completedAt: new Date().toISOString(),
        };
        const existingHistory = s.workoutHistory[key] ?? [];

        return {
          ...s,
          progress: { ...s.progress, [workoutId]: [] },
          sessionLog: { ...s.sessionLog, [key]: [...todays, workoutId] },
          completions: {
            ...s.completions,
            [key]: (s.completions[key] ?? 0) + 1,
          },
          workoutHistory: {
            ...s.workoutHistory,
            [key]: [...existingHistory, session],
          },
        };
      });
    },
    []
  );

  const getHistoryForDate = useCallback(
    (dateKey: string): CompletedSession[] =>
      state.workoutHistory[dateKey] ?? [],
    [state.workoutHistory]
  );

  // ─── Quick Notes for Exercises ──────────────────────────────────────────

  const getNote = useCallback(
    (slug: string): string => (state.notes && state.notes[slug]) || "",
    [state.notes]
  );

  const hasNote = useCallback(
    (slug: string): boolean =>
      Boolean(state.notes && state.notes[slug]?.trim()),
    [state.notes]
  );

  const setNote = useCallback(
    (slug: string, noteText: string): boolean => {
      try {
        const trimmed = noteText.trim();
        const updatedNotes = { ...(state.notes || {}) };
        if (!trimmed) {
          delete updatedNotes[slug];
        } else {
          updatedNotes[slug] = noteText;
        }

        // Test and persist immediately so any QuotaExceededError is caught
        if (typeof window !== "undefined") {
          const nextState = { ...state, notes: updatedNotes };
          persistLocal(nextState);
        }

        setState((s) => {
          const next = { ...(s.notes || {}) };
          if (!trimmed) {
            delete next[slug];
          } else {
            next[slug] = noteText;
          }
          return { ...s, notes: next };
        });
        return true;
      } catch (err) {
        console.error("Failed to save personal note:", err);
        return false;
      }
    },
    [state, persistLocal]
  );

  const clearNote = useCallback(
    (slug: string): boolean => {
      try {
        if (typeof window !== "undefined") {
          const updatedNotes = { ...(state.notes || {}) };
          delete updatedNotes[slug];
          const nextState = { ...state, notes: updatedNotes };
          persistLocal(nextState);
        }

        setState((s) => {
          if (!s.notes || !s.notes[slug]) return s;
          const next = { ...s.notes };
          delete next[slug];
          return { ...s, notes: next };
        });
        return true;
      } catch (err) {
        console.error("Failed to clear personal note:", err);
        return false;
      }
    },
    [state, persistLocal]
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      ...state,
      hydrated,
      syncStatus,
      syncError,
      syncNow,
      setWeeklySchedule,
      refreshSavedExercises,
      isFavourite,
      toggleFavourite,
      createWorkout,
      renameWorkout,
      deleteWorkout,
      addToWorkout,
      removeFromWorkout,
      isInWorkout,
      isExerciseDone,
      toggleExerciseDone,
      doneCount,
      isSessionCompletedToday,
      toggleSessionComplete,
      getHistoryForDate,
      getNote,
      hasNote,
      setNote,
      clearNote,
    }),
    [
      state,
      hydrated,
      syncStatus,
      syncError,
      syncNow,
      setWeeklySchedule,
      refreshSavedExercises,
      isFavourite,
      toggleFavourite,
      createWorkout,
      renameWorkout,
      deleteWorkout,
      addToWorkout,
      removeFromWorkout,
      isInWorkout,
      isExerciseDone,
      toggleExerciseDone,
      doneCount,
      isSessionCompletedToday,
      toggleSessionComplete,
      getHistoryForDate,
      getNote,
      hasNote,
      setNote,
      clearNote,
    ]
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within <LibraryProvider>");
  return ctx;
}
