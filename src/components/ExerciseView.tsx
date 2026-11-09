import { exerciseTargets, targetLabel } from "@/lib/muscle-targets";
import MuscleGuide from "./MuscleGuide";
import AddExerciseForm from "./AddExerciseForm";
import MovementViewer from "./MovementViewer";
import MuscleMap from "./MuscleMap";
import TechniqueSteps from "./TechniqueSteps";
import DeepDiveVideo from "./DeepDiveVideo";
import ExerciseActions from "./ExerciseActions";
import QuickNotes from "./QuickNotes";
import type { Exercise } from "@/lib/types";

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-0.5 font-medium capitalize text-white">{value}</p>
    </div>
  );
}

export default function ExerciseView({
  exercise,
  embedUrl = null,
}: {
  exercise: Exercise;
  embedUrl?: string | null;
}) {
  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            {exercise.name}
          </h1>
          {exercise.source === "custom" && <span className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">Custom exercise</span>}
        </div>
        <p className="mt-2 capitalize text-white/50">
          {exercise.category}
          {exercise.equipment ? ` · ${exercise.equipment}` : ""} · {exercise.level}
        </p>

        {exerciseTargets(exercise).length > 0 && <p className="mt-2 text-sm text-accent">
          Target emphasis: {exerciseTargets(exercise).map(targetLabel).join(", ")}
        </p>}

        <div className="mt-5">
          <ExerciseActions
            exercise={{
              slug: exercise.slug,
              name: exercise.name,
              level: exercise.level,
              equipment: exercise.equipment,
              category: exercise.category,
              primaryMuscles: exercise.primaryMuscles,
              targetAreas: exerciseTargets(exercise),
              thumbUrl: exercise.imageUrls[0] ?? null,
            }}
          />
        </div>
      </div>

      {exercise.source === "custom" && <AddExerciseForm editExercise={exercise} />}

      <MuscleGuide key={exercise.slug} exerciseMode exercises={[{
        slug: exercise.slug, name: exercise.name, level: exercise.level, category: exercise.category,
        equipment: exercise.equipment, primaryMuscles: exercise.primaryMuscles,
        targetAreas: exerciseTargets(exercise), thumbUrl: exercise.imageUrls[0] ?? null,
      }]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {exercise.source !== "custom" && <MovementViewer
            imageUrls={exercise.imageUrls}
            name={exercise.name}
          />}


          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Meta label="Mechanic" value={exercise.mechanic} />
            <Meta label="Force" value={exercise.force} />
            <Meta label="Level" value={exercise.level} />
          </div>

          <DeepDiveVideo
            name={exercise.name}
            embedUrl={embedUrl}
          />
        </div>

        <div className="space-y-6">
          {/* Personal Quick Notes */}
          <QuickNotes
            exerciseSlug={exercise.slug}
            exerciseName={exercise.name}
          />

          {exercise.primaryMuscles.length > 0 && <MuscleMap
            primary={exercise.primaryMuscles}
            secondary={exercise.secondaryMuscles}
          />}
          {exercise.instructions.length > 0 && <TechniqueSteps
            steps={exercise.instructions}
          />}
        </div>
      </div>
    </div>
  );
}
