import MovementViewer from "./MovementViewer";
import MuscleMap from "./MuscleMap";
import TechniqueSteps from "./TechniqueSteps";
import DeepDiveVideo from "./DeepDiveVideo";
import ExerciseActions from "./ExerciseActions";
import QuickNotes from "./QuickNotes";
import type { AnyExercise, GeneratedExercise } from "@/lib/types";

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
  exercise: AnyExercise;
  embedUrl?: string | null;
}) {
  const isAI = exercise.source === "ai";
  const gen = isAI ? (exercise as GeneratedExercise) : null;
  const pose = gen?.svgPose ?? null;

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            {exercise.name}
          </h1>
          {exercise.source === "custom" && <span className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">Custom exercise</span>}
          {isAI && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              AI generated
            </span>
          )}
        </div>
        <p className="mt-2 capitalize text-white/50">
          {exercise.category}
          {exercise.equipment ? ` · ${exercise.equipment}` : ""} · {exercise.level}
        </p>

        <div className="mt-5">
          <ExerciseActions
            exercise={{
              slug: exercise.slug,
              name: exercise.name,
              level: exercise.level,
              equipment: exercise.equipment,
              category: exercise.category,
              primaryMuscles: exercise.primaryMuscles,
              thumbUrl: exercise.imageUrls[0] ?? null,
            }}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {exercise.source !== "custom" && <MovementViewer
            imageUrls={exercise.imageUrls}
            pose={pose}
            name={exercise.name}
          />}

          {gen && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-ink-850 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  Start position
                </p>
                <p className="text-sm leading-relaxed text-white/75">
                  {gen.startPositionCue}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-850 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  Finish position
                </p>
                <p className="text-sm leading-relaxed text-white/75">
                  {gen.finishPositionCue}
                </p>
              </div>
            </div>
          )}

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
            tips={gen?.tips}
          />}
        </div>
      </div>
    </div>
  );
}
