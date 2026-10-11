"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { SearchResult } from "@/lib/types";
import { useLibrary } from "@/lib/library";

export default function ExerciseCard({
  result,
  index = 0,
}: {
  result: SearchResult;
  index?: number;
}) {
  const { hydrated, isFavourite, toggleFavourite } = useLibrary();
  const faved = hydrated && isFavourite(result.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/exercise/${result.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-card transition hover:border-lime/50 hover:shadow-glow"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-700">
          {result.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.thumbUrl}
              alt={result.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl font-black text-lime/30">
              AI
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-lime backdrop-blur">
            {result.level}
          </span>
          <button
            type="button"
            aria-label={faved ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={faved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavourite(result);
            }}
            className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition ${
              faved
                ? "border-lime/50 bg-lime/20 text-lime"
                : "border-white/10 bg-ink-950/70 text-white/60 hover:text-lime"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill={faved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21s-7.5-4.9-10-9.3C.6 9 1.4 5.6 4.3 4.5 6.3 3.7 8.6 4.4 10 6c.4.5.7 1 1 1.5.3-.5.6-1 1-1.5 1.4-1.6 3.7-2.3 5.7-1.5 2.9 1.1 3.7 4.5 2.3 7.2C19.5 16.1 12 21 12 21z" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-tight text-white">
            {result.name}
          </h3>
          <p className="mt-1 truncate text-xs capitalize text-white/45">
            {result.primaryMuscles.join(", ") || result.category}
            {result.equipment ? ` · ${result.equipment}` : ""}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
