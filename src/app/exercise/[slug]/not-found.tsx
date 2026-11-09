import Link from "next/link";

export default function ExerciseNotFound() {
  return <div className="page-shell py-16">
    <div className="rounded-2xl border border-white/10 bg-ink-850 p-8 text-center">
      <h1 className="font-display text-2xl font-bold text-white">Exercise not found</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/60">This exercise is not in the catalog. Browse existing exercises or create a custom exercise with a YouTube demonstration.</p>
      <Link href="/search" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink-950 hover:bg-accent-soft">Browse exercises</Link>
    </div>
  </div>;
}
