"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SearchResult } from "@/lib/types";
import { useLibrary } from "@/lib/library";
import { exerciseTargets, targetLabel } from "@/lib/muscle-targets";

export default function ExerciseCard({
  result,
  index = 0,
}: {
  result: SearchResult;
  index?: number;
}) {
  const { hydrated, isFavourite, toggleFavourite, hasNote } = useLibrary();
  const faved = hydrated && isFavourite(result.slug);
  const noteSaved = hydrated && hasNote(result.slug);
  const [resolvedCover, setResolvedCover] = useState<string | null>(null);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  useEffect(() => {
    if (result.category !== "custom" || result.thumbUrl) return;
    let active = true;
    fetch(`/api/exercise/${encodeURIComponent(result.slug)}`)
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setResolvedCover(data?.exercise?.imageUrls?.[0] ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, [result.slug, result.category, result.thumbUrl]);
  const cover = result.thumbUrl ?? resolvedCover;
  const targetText = exerciseTargets(result).map(targetLabel).join(", ") || "Target unspecified";


  return (
    <motion.div
      data-exercise-card
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/exercise/${result.slug}`}
        className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-850 transition hover:border-accent/50 hover:shadow-none"
      >
        <div data-exercise-cover className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
          {cover && cover !== failedCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              onError={() => setFailedCover(cover)}
              alt={result.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-accent/50 sm:text-lg">
              {result.category === "custom" ? "Video" : "Exercise"}
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="rounded-md border border-white/10 bg-ink-950/80 px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-white/80 backdrop-blur">
              {result.level === "expert" ? "advanced" : result.level}
            </span>
            {noteSaved && (
              <span
                title="Personal note saved"
                className="flex items-center gap-1 rounded-full border border-white/20 bg-ink-950/90 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur"
              >
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="sr-only">Note</span>
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={faved ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={faved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavourite({ ...result, thumbUrl: cover });
            }}
            className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition ${
              faved
                ? "border-white/30 bg-ink-950/90 text-white"
                : "border-white/10 bg-ink-950/70 text-white/60 hover:text-white"
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
        <div className="flex-1 p-3 sm:p-4">
          <h3 data-exercise-title title={result.name} className="line-clamp-2 h-10 break-words font-display text-sm font-semibold leading-5 text-white sm:text-base sm:leading-5">
            {result.name}
          </h3>
          <p data-exercise-targets title={targetText} className="mt-1 h-4 truncate text-xs leading-4 text-white/50">
            {targetText}
            {result.equipment ? ` · ${result.equipment}` : ""}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
