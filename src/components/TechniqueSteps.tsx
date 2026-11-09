"use client";

import { motion } from "framer-motion";

export default function TechniqueSteps({
  steps,
}: {
  steps: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-5 sm:p-6">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white/50">
          How To Perform
        </h3>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
                {i + 1}
              </span>
              <p className="pt-1 leading-relaxed text-white/80">{step}</p>
            </motion.li>
          ))}
        </ol>
      </div>

    </div>
  );
}
