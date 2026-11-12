import type { LibraryState } from "./library";

export function undoRecordedSession(state: LibraryState, workoutId: string, date: string): LibraryState {
  if (!(state.sessionLog[date] ?? []).includes(workoutId)) return state;
  const sessionLog = { ...state.sessionLog };
  const remaining = sessionLog[date].filter(id => id !== workoutId);
  if (remaining.length) sessionLog[date] = remaining;
  else delete sessionLog[date];
  const completions = { ...state.completions };
  const count = Math.max(remaining.length, (completions[date] ?? 0) - 1);
  if (count > 0) completions[date] = count;
  else delete completions[date];
  const history = state.workoutHistory[date] ?? [];
  let index = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].workoutId === workoutId) { index = i; break; }
  }
  const workoutHistory = { ...state.workoutHistory };
  const sessions = index < 0 ? history : history.filter((_, i) => i !== index);
  if (sessions.length) workoutHistory[date] = sessions;
  else delete workoutHistory[date];
  const valid = new Set(state.workouts.find(workout => workout.id === workoutId)?.exercises.map(exercise => exercise.slug) ?? []);
  const restored = index >= 0 ? history[index].exercises.map(exercise => exercise.slug) : state.progress[workoutId] ?? [];
  return { ...state, sessionLog, completions, workoutHistory,
    progress: { ...state.progress, [workoutId]: restored.filter(slug => valid.has(slug)) } };
}

export function toggleWorkoutExercise(state: LibraryState, workoutId: string, slug: string, date: string, id: string, completedAt: string): LibraryState {
  const workout = state.workouts.find(item => item.id === workoutId);
  if (!workout?.exercises.some(exercise => exercise.slug === slug)) return state;
  // Editing a recorded session first restores its exact checked selection.
  const currentState = undoRecordedSession(state, workoutId, date);
  const current = currentState.progress[workoutId] ?? [];
  const checked = current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug];
  if (!workout.exercises.every(exercise => checked.includes(exercise.slug))) {
    return { ...currentState, progress: { ...currentState.progress, [workoutId]: checked } };
  }
  return {
    ...currentState,
    progress: { ...currentState.progress, [workoutId]: [] },
    sessionLog: { ...currentState.sessionLog, [date]: [...(currentState.sessionLog[date] ?? []), workoutId] },
    completions: { ...currentState.completions, [date]: (currentState.completions[date] ?? 0) + 1 },
    workoutHistory: { ...currentState.workoutHistory, [date]: [...(currentState.workoutHistory[date] ?? []), {
      id, workoutId, workoutName: workout.name, exercises: [...workout.exercises], completedAt,
    }] },
  };
}
