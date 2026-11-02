"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

interface Props {
  autoFocus?: boolean;
  size?: "lg" | "md";
  initialQuery?: string;
}

export default function SearchBar({ autoFocus, size = "lg", initialQuery = "" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exercises?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setResults((data.results ?? []).slice(0, 8));
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted */
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(slug: string) {
    setOpen(false);
    router.push(`/exercise/${slug}`);
  }

  function submit() {
    const term = q.trim();
    if (!term) return;
    if (active >= 0 && results[active]) {
      go(results[active].slug);
    } else {
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const pad = size === "lg" ? "py-4 pl-14 pr-5 text-lg" : "py-3 pl-12 pr-4 text-base";

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <svg
          className={`pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/50 ${
            size === "lg" ? "h-6 w-6" : "h-5 w-5"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search any exercise — e.g. incline dumbbell press"
          className={`w-full rounded-xl border border-white/10 bg-ink-850/80 ${pad} text-white placeholder-white/35 outline-none backdrop-blur transition focus:border-accent/60 focus:ring-1 focus:ring-accent/30`}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-850/95 shadow-card backdrop-blur">
          {results.map((r, i) => (
            <button
              key={r.slug}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.slug)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                i === active ? "bg-accent/10" : "hover:bg-white/5"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-700">
                {r.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-accent">AI</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">{r.name}</span>
                <span className="block truncate text-xs capitalize text-white/50">
                  {r.primaryMuscles.join(", ") || r.category}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
