import type { SearchResult } from "./types";
import { exerciseTargets, targetLabel } from "./muscle-targets";

type ExerciseTargets = Pick<SearchResult, "slug" | "name" | "primaryMuscles" | "targetAreas">;

export function primaryMuscleOverlapWarning(
  exercise: ExerciseTargets,
  existing: ExerciseTargets[]
): string | null {
  const targets = new Set(exerciseTargets(exercise));
  if (!targets.size) return null;
  const matches = existing.filter(item => item.slug !== exercise.slug)
    .map(item => ({ name: item.name, targets: exerciseTargets(item).filter(target => targets.has(target)) }))
    .filter(item => item.targets.length > 0);
  if (!matches.length) return null;
  const shared = [...new Set(matches.flatMap(item => item.targets))];
  return [
    "Muscle target overlap",
    `${exercise.name} has the same target emphasis (${shared.map(targetLabel).join(", ")}) as exercises already in this session:`,
    ...matches.map(item => `- ${item.name} (${item.targets.map(targetLabel).join(", ")})`),
    "Add this exercise anyway?",
  ].join("\n\n");
}
