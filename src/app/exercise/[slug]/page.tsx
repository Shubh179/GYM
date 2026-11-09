import { getBySlug } from "@/lib/exercises";
import { notFound } from "next/navigation";
import { resolveExerciseVideo } from "@/lib/youtube";
import { watchEmbedUrl, searchEmbedUrl } from "@/lib/youtube-embed";
import ExerciseView from "@/components/ExerciseView";

export const dynamic = "force-dynamic";

export default async function ExercisePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  const exercise = await getBySlug(slug);
  if (!exercise) notFound();
  if (exercise.source === "custom" && exercise.youtubeVideoId) {
    return <ExerciseView exercise={exercise} embedUrl={watchEmbedUrl(exercise.youtubeVideoId)} />;
  }
  const context = exercise.primaryMuscles[0] ?? exercise.category;
  const embedUrl = (await resolveExerciseVideo({ slug, name: exercise.name, context })) ?? searchEmbedUrl(exercise.name, context);
  return <ExerciseView exercise={exercise} embedUrl={embedUrl} />;
}
