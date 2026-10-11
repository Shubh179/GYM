import { getBySlug } from "@/lib/exercises";
import { readCached } from "@/lib/cache";
import { resolveExerciseVideo } from "@/lib/youtube";
import { searchEmbedUrl } from "@/lib/youtube-embed";
import ExerciseView from "@/components/ExerciseView";
import GenerateFlow from "@/components/GenerateFlow";

export default async function ExercisePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  // 1. Dataset hit — render instantly on the server.
  const dataset = await getBySlug(slug);
  if (dataset) {
    const context = dataset.primaryMuscles[0] ?? dataset.category;
    const embedUrl =
      (await resolveExerciseVideo({ slug, name: dataset.name, context })) ??
      searchEmbedUrl(dataset.name, context);
    return <ExerciseView exercise={dataset} embedUrl={embedUrl} />;
  }

  // 2. Previously generated and cached — render instantly on the server.
  const cached = await readCached(slug);
  if (cached) {
    const context = cached.primaryMuscles[0] ?? cached.category;
    const embedUrl =
      (await resolveExerciseVideo({ slug, name: cached.name, context })) ??
      searchEmbedUrl(cached.name, context);
    return <ExerciseView exercise={cached} embedUrl={embedUrl} />;
  }

  // 3. Not found anywhere — hand off to the client AI generation flow.
  const readableName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return <GenerateFlow slug={slug} readableName={readableName} />;
}
