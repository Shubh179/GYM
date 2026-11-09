import { validMuscleTargets, musclesForTargets } from "./muscle-targets";
import { youtubeVideoId } from "./custom-exercises";

export function parseCustomExerciseInput(body: unknown) {
  const input = body as { name?: unknown; youtubeUrl?: unknown; targetAreas?: unknown } | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const normalizedName = name.toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (name.length < 2 || name.length > 120 || !normalizedName || normalizedName.length > 120) {
    return { error: "Enter an exercise name between 2 and 120 characters, including a letter or number." } as const;
  }
  const videoId = typeof input?.youtubeUrl === "string" ? youtubeVideoId(input.youtubeUrl.trim()) : null;
  if (!videoId) return { error: "Enter a valid YouTube video link." } as const;
  if (!validMuscleTargets(input?.targetAreas)) return { error: "Select at least one valid specific muscle target." } as const;
  return { name, videoId, targetAreas: input.targetAreas, primaryMuscles: musclesForTargets(input.targetAreas) } as const;
}
