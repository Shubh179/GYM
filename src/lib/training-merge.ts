import type { LibraryState } from "./library";

export const LIBRARY_KEY = "repvisual:library:v1";
export const SCHEDULE_KEY = "repvisual:weekly-schedule:v1";
export const CLAIM_KEY = "repvisual:legacy-owner:v1";
export const SCHEDULE_TEMPLATE = "Monday:\nTuesday:\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:";
export function emptyTraining(): LibraryState {
  return { favourites: [], workouts: [], progress: {}, completions: {}, sessionLog: {}, workoutHistory: {}, notes: {}, weeklySchedule: SCHEDULE_TEMPLATE };
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export const sameTraining = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function parseTraining(value: unknown): LibraryState {
  if (!object(value)) throw Error("Invalid training data. Your local backup has been retained.");
  const state = { ...emptyTraining(), ...value } as unknown as LibraryState;
  const exercise = (item: unknown): boolean => object(item) && typeof item.slug === "string" && typeof item.name === "string" && typeof item.level === "string" && Array.isArray(item.primaryMuscles);
  if (!Array.isArray(state.favourites) || !state.favourites.every(exercise)
    || !Array.isArray(state.workouts) || !state.workouts.every(w => object(w) && typeof w.id === "string" && typeof w.name === "string" && Array.isArray(w.exercises) && w.exercises.every(exercise))
    || !object(state.progress) || !object(state.completions) || !object(state.sessionLog) || !object(state.workoutHistory) || !object(state.notes)
    || !Object.values(state.progress).every(v => Array.isArray(v) && v.every(x => typeof x === "string"))
    || !Object.values(state.sessionLog).every(v => Array.isArray(v) && v.every(x => typeof x === "string"))
    || !Object.values(state.completions).every(v => typeof v === "number" && Number.isFinite(v) && v >= 0)
    || !Object.values(state.notes).every(v => typeof v === "string")
    || !Object.values(state.workoutHistory).every(v => Array.isArray(v) && v.every(s => object(s) && typeof s.id === "string" && typeof s.workoutId === "string" && typeof s.workoutName === "string" && typeof s.completedAt === "string" && Array.isArray(s.exercises) && s.exercises.every(exercise)))
    || typeof state.weeklySchedule !== "string") throw Error("Invalid training data. Your local backup has been retained.");
  return state;
}
function identity(value: unknown): string {
  if (object(value)) return String(value.id ?? value.slug ?? JSON.stringify(value));
  return JSON.stringify(value);
}
function merge(base: unknown, local: unknown, remote: unknown, field: string): unknown {
  if (sameTraining(local, remote)) return local;
  if (sameTraining(local, base)) return remote;
  if (sameTraining(remote, base)) return local;
  if (Array.isArray(local) && Array.isArray(remote)) {
    const b = new Map((Array.isArray(base) ? base : []).map(v => [identity(v), v]));
    const l = new Map(local.map(v => [identity(v), v]));
    const r = new Map(remote.map(v => [identity(v), v]));
    return [...new Set([...l.keys(), ...r.keys()])].flatMap(key => {
      if (b.has(key) && (!l.has(key) || !r.has(key))) return [];
      const value = merge(b.get(key), l.get(key), r.get(key), field);
      return value === undefined ? [] : [value];
    });
  }
  if (object(local) && object(remote)) {
    const original = object(base) ? base : {};
    return Object.fromEntries([...new Set([...Object.keys(local), ...Object.keys(remote)])]
      .filter(key => !["__proto__", "constructor", "prototype"].includes(key))
      .flatMap(key => {
        const value = merge(original[key], local[key], remote[key], field === "notes" ? "noteText" : key);
        return value === undefined ? [] : [[key, value]];
      }));
  }
  if (local === undefined) return remote;
  if (remote === undefined) return local;
  if (typeof local === "number" && typeof remote === "number") return Math.max(local, remote);
  if ((field === "noteText" || field === "weeklySchedule") && typeof local === "string" && typeof remote === "string") {
    if (local.includes(remote)) return local;
    if (remote.includes(local)) return remote;
    if (field === "weeklySchedule" && local === SCHEDULE_TEMPLATE) return remote;
    if (field === "weeklySchedule" && remote === SCHEDULE_TEMPLATE) return local;
    return `${local}\n\n[From another device]\n${remote}`;
  }
  return local;
}
export function mergeTraining(base: LibraryState, local: LibraryState, remote: LibraryState): LibraryState {
  const result = parseTraining(merge(base, local, remote, ""));
  const completions = { ...result.completions };
  for (const [date, sessions] of Object.entries(result.sessionLog)) completions[date] = Math.max(completions[date] ?? 0, sessions.length);
  return { ...result, completions };
}

export interface DeviceCache { key: string; state: LibraryState; base: LibraryState; imported: boolean; }
export function readDeviceTraining(storage: Pick<Storage, "getItem" | "setItem">, uid?: string): DeviceCache {
  const owner = storage.getItem(CLAIM_KEY);
  const key = uid ? `repvisual:library:user:${uid}:v2` : owner ? "repvisual:library:guest:v2" : LIBRARY_KEY;
  const raw = storage.getItem(key);
  let state = emptyTraining();
  let base = emptyTraining();
  let imported = false;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (key === LIBRARY_KEY) state = parseTraining(parsed);
    else { state = parseTraining(parsed.state); base = parseTraining(parsed.base); imported = parsed.imported === true; }
  }
  if (!uid && !owner) {
    const schedule = storage.getItem(SCHEDULE_KEY);
    if (schedule !== null) state.weeklySchedule = schedule;
  }
  if (uid && (!owner || owner === uid) && !imported) {
    const legacyRaw = storage.getItem(LIBRARY_KEY);
    const schedule = storage.getItem(SCHEDULE_KEY);
    if (legacyRaw || schedule !== null) {
      const legacy = legacyRaw ? parseTraining(JSON.parse(legacyRaw)) : emptyTraining();
      if (schedule !== null) legacy.weeklySchedule = schedule;
      storage.setItem(CLAIM_KEY, uid);
      state = mergeTraining(emptyTraining(), state, legacy);
    }
  }
  return { key, state, base, imported };
}
