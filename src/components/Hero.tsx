"use client";

import { motion } from "framer-motion";
import SearchBar from "./SearchBar";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-20 sm:pt-28">
      {/* animated gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(198,255,46,0.16),transparent_60%)] blur-2xl" />
        <div className="absolute inset-0 bg-[length:200%_200%] bg-[linear-gradient(120deg,transparent,rgba(198,255,46,0.04),transparent)] animate-gradient-pan" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5 text-xs font-medium text-lime-soft"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          873 exercises · animated demonstrations · AI fallback
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-6 font-display text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl"
        >
          See <span className="text-lime">exactly</span> how
          <br className="hidden sm:block" /> to perform any exercise
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mx-auto mt-5 max-w-xl text-base text-white/55 sm:text-lg"
        >
          Search any movement and watch the full rep — start position, motion, and
          finish — looped as a clear visual demo, with targeted muscles and technique.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mx-auto mt-9 max-w-xl"
        >
          <SearchBar autoFocus />
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-white/40">
            <span>Try:</span>
            {["Incline Dumbbell Press", "Barbell Squat", "Pullups", "Plank"].map(
              (ex) => (
                <a
                  key={ex}
                  href={`/search?q=${encodeURIComponent(ex)}`}
                  className="rounded-full border border-white/10 px-3 py-1 text-white/60 transition hover:border-lime/40 hover:text-lime"
                >
                  {ex}
                </a>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
