"use client";

import { motion } from "framer-motion";

export default function TechniqueSteps({
  steps,
  tips,
}: {
  steps: string[];
  tips?: string[];
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

      {tips && tips.length > 0 && (
        <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5 sm:p-6">
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-accent">
            Technique Tips
          </h3>
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-white/80">
                <svg className="mt-1 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m5 13 4 4L19 7" />
                </svg>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
