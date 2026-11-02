"use client";

import { searchEmbedUrl } from "@/lib/youtube-embed";

export default function DeepDiveVideo({
  name,
  embedUrl = null,
}: {
  name: string;
  embedUrl?: string | null;
}) {
  const youtubeEmbed = embedUrl ?? searchEmbedUrl(name);
  return (
    <section aria-label="Exercise video demonstration" className="overflow-hidden rounded-xl border border-white/10 bg-ink-900">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <h2 className="font-display text-base font-semibold text-white">Video demonstration</h2>
      </div>
      <div className="aspect-video w-full bg-black">
        <iframe
          src={youtubeEmbed}
          title={`${name} demonstration`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="block h-full w-full border-0"
        />
      </div>
    </section>
  );
}
