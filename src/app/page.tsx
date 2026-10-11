import Link from "next/link";
import Hero from "@/components/Hero";
import ExerciseCard from "@/components/ExerciseCard";
import { popularExercises, listMuscles } from "@/lib/exercises";

export const dynamic = "force-static";

const MUSCLE_ORDER = [
  "chest",
  "lats",
  "biceps",
  "triceps",
  "shoulders",
  "quadriceps",
  "hamstrings",
  "glutes",
  "abdominals",
  "calves",
];

export default async function HomePage() {
  const [popular, muscles] = await Promise.all([
    popularExercises(8),
    listMuscles(),
  ]);
  const ordered = MUSCLE_ORDER.filter((m) => muscles.includes(m));

  return (
    <div className="pb-10">
      <Hero />

      <section className="mx-auto mt-6 max-w-6xl px-5">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Browse by muscle
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {ordered.map((m) => (
            <Link
              key={m}
              href={`/search?muscle=${encodeURIComponent(m)}`}
              className="rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm font-medium capitalize text-white/80 transition hover:border-lime/50 hover:text-lime"
            >
              {m}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Popular exercises
          </h2>
          <Link href="/search" className="text-sm text-lime hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {popular.map((r, i) => (
            <ExerciseCard key={r.slug} result={r} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
