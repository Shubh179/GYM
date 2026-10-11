"use client";

import { motion } from "framer-motion";

const MUSCLE_LABELS: Record<string, string> = {
  abdominals: "Abs",
  hamstrings: "Hamstrings",
  calves: "Calves",
  shoulders: "Shoulders",
  adductors: "Adductors",
  "middle back": "Mid Back",
  lats: "Lats",
  glutes: "Glutes",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  abductors: "Abductors",
  quadriceps: "Quads",
  chest: "Chest",
  "lower back": "Lower Back",
  traps: "Traps",
  neck: "Neck",
};

function label(m: string): string {
  return MUSCLE_LABELS[m] ?? m.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MuscleMap({
  primary,
  secondary,
}: {
  primary: string[];
  secondary: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-850 p-5">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white/50">
        Muscles Worked
      </h3>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-lime">Primary</p>
          <div className="flex flex-wrap gap-2">
            {primary.length ? (
              primary.map((m, i) => (
                <motion.span
                  key={m}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-lime/40 bg-lime/10 px-3 py-1.5 text-sm font-medium text-lime-soft"
                >
                  {label(m)}
                </motion.span>
              ))
            ) : (
              <span className="text-sm text-white/40">—</span>
            )}
          </div>
        </div>
        {secondary.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-white/50">Secondary</p>
            <div className="flex flex-wrap gap-2">
              {secondary.map((m) => (
                <span
                  key={m}
                  className="rounded-lg border border-white/10 bg-ink-700 px-3 py-1.5 text-sm text-white/70"
                >
                  {label(m)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
