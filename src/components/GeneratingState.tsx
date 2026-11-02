"use client";

import { motion } from "framer-motion";

export default function GeneratingState({ name }: { name: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 h-24 w-24">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-accent/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          className="absolute inset-0 rounded-full border-t-2 border-accent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-display text-2xl font-black text-accent">
          AI
        </div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-2xl font-bold text-white sm:text-3xl"
      >
        Generating visualization…
      </motion.h2>
      <p className="mt-3 max-w-md text-white/50">
        Building a movement breakdown and animated pose diagram for{" "}
        <span className="font-medium text-accent-soft">{name}</span>. This runs once —
        the next search for it will be instant.
      </p>

      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-accent"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
