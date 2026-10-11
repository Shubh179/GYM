"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { searchEmbedUrl } from "@/lib/youtube-embed";

export default function DeepDiveVideo({
  name,
  embedUrl = null,
}: {
  name: string;
  // A resolved youtube-nocookie embed URL; falls back to a keyless search embed.
  embedUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const youtubeEmbed = embedUrl ?? searchEmbedUrl(name);

  return (
    <div className="rounded-2xl border border-lime/25 bg-lime/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-lime">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Dive Deep · Watch the Movement
          </h3>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/70">
            A short video demonstration of {name} — watch the full range of
            motion and where to feel the tension through each rep. Plays right
            here on the page.
          </p>
        </div>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-lime-soft"
      >
        {open ? "Hide video" : "Watch demonstration"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
              <iframe
                src={youtubeEmbed}
                title={`${name} demonstration`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
