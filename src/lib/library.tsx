"use client";

// Client-side "personal training" store: favourites + custom workout sessions.
// Persisted to localStorage so the user's library survives reloads with no
// backend or account. All components under <LibraryProvider> can use useLibrary().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SearchResult } from "./types";

// A saved exercise carries just enough to render a card without re-fetching.
export type SavedExercise = SearchResult;

export interface Workout {
  id: string;
  name: string;
  exercises: SavedExercise[];
}

interface LibraryState {
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
}

interface LibraryContextValue extends LibraryState {
  hydrated: boolean;
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
}

const STORAGE_KEY = "repvisual:library:v1";
const EMPTY: LibraryState = {
  favourites: [],
  workouts: [],
  progress: {},
  completions: {},
  sessionLog: {},
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function loadState(): LibraryState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LibraryState>;
    return {
      favourites: Array.isArray(parsed.favourites) ? parsed.favourites : [],
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      progress:
        parsed.progress && typeof parsed.progress === "object"
          ? parsed.progress
          : {},
      completions:
        parsed.completions && typeof parsed.completions === "object"
          ? parsed.completions
          : {},
      sessionLog:
        parsed.sessionLog && typeof parsed.sessionLog === "object"
          ? parsed.sessionLog
          : {},
    };
  } catch {
    return EMPTY;
  }
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Local calendar day as "YYYY-MM-DD" (not UTC — the heatmap is a personal log).
function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (client only), then mark hydrated.
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — fail silently; feature is best-effort.
    }
  }, [state, hydrated]);

  const isFavourite = useCallback(
    (slug: string) => state.favourites.some((f) => f.slug === slug),
    [state.favourites],
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
        w.id === id ? { ...w, name: trimmed } : w,
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
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) =>
        w.id === id && !w.exercises.some((e) => e.slug === ex.slug)
          ? { ...w, exercises: [...w.exercises, ex] }
          : w,
      ),
    }));
  }, []);

  const removeFromWorkout = useCallback((id: string, slug: string) => {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) =>
        w.id === id
          ? { ...w, exercises: w.exercises.filter((e) => e.slug !== slug) }
          : w,
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
        (w) => w.id === id && w.exercises.some((e) => e.slug === slug),
      ),
    [state.workouts],
  );

  const isExerciseDone = useCallback(
    (workoutId: string, slug: string) =>
      (state.progress[workoutId] ?? []).includes(slug),
    [state.progress],
  );

  const doneCount = useCallback(
    (workoutId: string) => (state.progress[workoutId] ?? []).length,
    [state.progress],
  );

  // Tick/untick an exercise. When every exercise in the session is ticked, the
  // session counts as done: log today on the heatmap and reset the ticks so the
  // same session can be completed again tomorrow.
  const toggleExerciseDone = useCallback((workoutId: string, slug: string) => {
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
        return {
          ...s,
          progress: { ...s.progress, [workoutId]: [] },
          sessionLog: { ...s.sessionLog, [key]: [...todays, workoutId] },
          completions: {
            ...s.completions,
            [key]: (s.completions[key] ?? 0) + 1,
          },
        };
      }

      return { ...s, progress: { ...s.progress, [workoutId]: checked } };
    });
  }, []);

  const isSessionCompletedToday = useCallback(
    (workoutId: string) =>
      (state.sessionLog[todayKey()] ?? []).includes(workoutId),
    [state.sessionLog],
  );

  // Toggle a whole session's completion for today. Marking it done logs one
  // session on the heatmap and clears any in-progress ticks; unmarking removes
  // today's log for that session. Two different sessions in one day both count.
  const toggleSessionComplete = useCallback((workoutId: string) => {
    setState((s) => {
      const key = todayKey();
      const todays = s.sessionLog[key] ?? [];
      const already = todays.includes(workoutId);

      if (already) {
        const nextList = todays.filter((id) => id !== workoutId);
        const sessionLog = { ...s.sessionLog };
        if (nextList.length) sessionLog[key] = nextList;
        else delete sessionLog[key];

        const completions = { ...s.completions };
        const next = (completions[key] ?? 0) - 1;
        if (next > 0) completions[key] = next;
        else delete completions[key];

        return { ...s, sessionLog, completions };
      }

      return {
        ...s,
        progress: { ...s.progress, [workoutId]: [] },
        sessionLog: { ...s.sessionLog, [key]: [...todays, workoutId] },
        completions: {
          ...s.completions,
          [key]: (s.completions[key] ?? 0) + 1,
        },
      };
    });
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      ...state,
      hydrated,
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
    }),
    [
      state,
      hydrated,
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
    ],
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
