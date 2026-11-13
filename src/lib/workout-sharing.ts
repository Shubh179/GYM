import type { Workout, LibraryState } from "./library";
import type { SearchResult } from "./types";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export function normalizeUsername(value: string): string { return value.trim().toLowerCase(); }
export function usernameError(value: string): string | null {
  return USERNAME_PATTERN.test(normalizeUsername(value)) ? null : "Use 3-24 letters, numbers or underscores.";
}
export interface SharedSession { name: string; exercises: SearchResult[]; }
export interface ReceivedWorkout { id: string; sender_username: string; sessions: SharedSession[]; created_at: string; }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.length > 0 && value.length <= max; }
export function parseSharedSessions(value: unknown): SharedSession[] {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw Error("Share between 1 and 50 sessions at a time.");
  return value.map(session => {
    if (!object(session) || !text(session.name, 120) || !session.name.trim() || !Array.isArray(session.exercises) || !session.exercises.length || session.exercises.length > 100) throw Error("Each shared session needs a name and 1-100 exercises.");
    const exercises = session.exercises.map((item: unknown) => {
      if (!object(item) || !text(item.slug, 160) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || !text(item.name, 200) || !text(item.level, 40) || !text(item.category, 80)
        || !(item.equipment === null || text(item.equipment, 100)) || !Array.isArray(item.primaryMuscles) || item.primaryMuscles.length > 30 || !item.primaryMuscles.every(v => text(v, 60))
        || !(item.targetAreas === undefined || (Array.isArray(item.targetAreas) && item.targetAreas.length <= 40 && item.targetAreas.every(v => text(v, 60))))
        || !(item.thumbUrl === null || (text(item.thumbUrl, 2048) && /^https:\/\//i.test(item.thumbUrl)))) throw Error("This shared workout contains invalid exercise data.");
      return { slug: item.slug, name: item.name, level: item.level, category: item.category, equipment: item.equipment, primaryMuscles: [...item.primaryMuscles], targetAreas: item.targetAreas ? [...item.targetAreas] : [], thumbUrl: item.thumbUrl } as SearchResult;
    });
    return { name: session.name.trim(), exercises: exercises.filter((e, i) => exercises.findIndex(other => other.slug === e.slug) === i) };
  });
}
export function shareSnapshot(workouts: Workout[]): SharedSession[] {
  // Never send progress, history, private notes or the weekly schedule.
  return parseSharedSessions(workouts.map(({ name, exercises }) => ({ name, exercises })));
}
export function sharedSessionId(shareId: string, index: number): string { return `shared-${shareId}-${index}`; }
export function importSharedSessions(state: LibraryState, shareId: string, value: unknown): LibraryState {
  if (!/^[a-z0-9-]{1,80}$/i.test(shareId)) throw Error("Invalid shared workout.");
  const sessions = parseSharedSessions(value);
  const existing = new Set(state.workouts.map(w => w.id));
  const additions = sessions.map((s, index) => ({ ...s, id: sharedSessionId(shareId, index) })).filter(s => !existing.has(s.id));
  return additions.length ? { ...state, workouts: [...state.workouts, ...additions] } : state;
}
