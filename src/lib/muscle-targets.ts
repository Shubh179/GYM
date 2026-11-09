import type { SearchResult } from "./types";

// Target/emphasis labels for planning; these do not imply muscle isolation.
export const MUSCLE_TARGETS = [
  { id: "upper-chest", label: "Upper chest", muscle: "chest" },
  { id: "middle-chest", label: "Middle chest", muscle: "chest" },
  { id: "lower-chest", label: "Lower chest", muscle: "chest" },
  { id: "lats", label: "Lats", muscle: "lats" },
  { id: "middle-back", label: "Middle back / rhomboids", muscle: "middle back" },
  { id: "upper-traps", label: "Upper traps", muscle: "traps" },
  { id: "lower-back", label: "Lower back / spinal erectors", muscle: "lower back" },
  { id: "front-delts", label: "Front delts", muscle: "shoulders" },
  { id: "side-delts", label: "Side delts", muscle: "shoulders" },
  { id: "rear-delts", label: "Rear delts", muscle: "shoulders" },
  { id: "biceps-long-head", label: "Biceps long head", muscle: "biceps" },
  { id: "biceps-short-head", label: "Biceps short head", muscle: "biceps" },
  { id: "brachialis", label: "Brachialis", muscle: "biceps" },
  { id: "triceps-long-head", label: "Triceps long head", muscle: "triceps" },
  { id: "triceps-lateral-head", label: "Triceps lateral head", muscle: "triceps" },
  { id: "triceps-medial-head", label: "Triceps medial head", muscle: "triceps" },
  { id: "forearm-flexors", label: "Forearm flexors", muscle: "forearms" },
  { id: "forearm-extensors", label: "Forearm extensors", muscle: "forearms" },
  { id: "quads", label: "Quadriceps", muscle: "quadriceps" },
  { id: "hamstrings", label: "Hamstrings", muscle: "hamstrings" },
  { id: "glute-max", label: "Gluteus maximus", muscle: "glutes" },
  { id: "hip-abductors", label: "Hip abductors / gluteus medius", muscle: "abductors" },
  { id: "hip-adductors", label: "Hip adductors", muscle: "adductors" },
  { id: "gastrocnemius", label: "Calves: gastrocnemius", muscle: "calves" },
  { id: "soleus", label: "Calves: soleus", muscle: "calves" },
  { id: "rectus-abdominis", label: "Abs: rectus abdominis", muscle: "abdominals" },
  { id: "obliques", label: "Obliques", muscle: "abdominals" },
  { id: "neck", label: "Neck", muscle: "neck" },
] as const;

export function validMuscleTargets(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MUSCLE_TARGETS.length
    && value.every(id => typeof id === "string" && MUSCLE_TARGETS.some(target => target.id === id))
    && new Set(value).size === value.length;
}
export function musclesForTargets(targets: string[]): string[] {
  return [...new Set(MUSCLE_TARGETS.filter(target => targets.includes(target.id)).map(target => target.muscle))];
}
export function targetLabel(id: string): string {
  return MUSCLE_TARGETS.find(target => target.id === id)?.label ?? id;
}

type TargetExercise = Pick<SearchResult, "name" | "primaryMuscles" | "targetAreas">;
export function exerciseTargets(exercise: TargetExercise): string[] {
  // Explicit metadata wins, including an explicit empty list for an unknown target.
  if (exercise.targetAreas !== undefined) {
    return [...new Set(exercise.targetAreas.filter(id => MUSCLE_TARGETS.some(target => target.id === id)))];
  }
  // Conservative fallback for dataset exercises and older saved workout snapshots.
  // Never treat the broad chest/shoulders/arms groups as equivalent target regions.
  const name = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const muscles = new Set((exercise.primaryMuscles ?? []).map(m => m.trim().toLowerCase()));
  const targets: string[] = [];
  if (muscles.has("chest") && /press|fly|flye/.test(name)) {
    if (/\bincline\b/.test(name)) targets.push("upper-chest");
    else if (/\bdecline\b/.test(name)) targets.push("lower-chest");
    else if (/bench press|dumbbell press|chest press|dumbbell fly|flat bench/.test(name)) targets.push("middle-chest");
  }
  if (muscles.has("shoulders")) {
    if (/rear delt|reverse fly|reverse pec/.test(name)) targets.push("rear-delts");
    else if (/lateral raise|side raise/.test(name)) targets.push("side-delts");
    else if (/front raise|shoulder press|military press/.test(name)) targets.push("front-delts");
  }
  for (const [muscle, target] of [
    ["lats", "lats"], ["middle back", "middle-back"], ["lower back", "lower-back"],
    ["quadriceps", "quads"], ["hamstrings", "hamstrings"], ["abductors", "hip-abductors"],
    ["adductors", "hip-adductors"], ["neck", "neck"],
  ]) if (muscles.has(muscle)) targets.push(target);
  return [...new Set(targets)];
}
