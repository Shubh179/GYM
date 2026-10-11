"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ExerciseView from "@/components/ExerciseView";
import GeneratingState from "@/components/GeneratingState";
import ExerciseCard from "@/components/ExerciseCard";
import type { AnyExercise, SearchResult } from "@/lib/types";

type Status = "loading" | "ready" | "no-key" | "error";

export default function GenerateFlow({
  slug,
  readableName,
}: {
  slug: string;
  readableName: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [exercise, setExercise] = useState<AnyExercise | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: readableName }),
        });
        const data = await res.json();

        if (data.exercise) {
          setExercise(data.exercise);
          setStatus("ready");
        } else if (data.status === "no-key") {
          setSuggestions(data.suggestions ?? []);
          setStatus("no-key");
        } else {
          setSuggestions(data.suggestions ?? []);
          setErrorMsg(data.error ?? "Something went wrong.");
          setStatus("error");
        }
      } catch {
        setErrorMsg("Network error while generating.");
        setStatus("error");
      }
    })();
  }, [slug, readableName]);

  if (status === "loading") return <GeneratingState name={readableName} />;
  if (status === "ready" && exercise) return <ExerciseView exercise={exercise} />;

  // no-key or error — both show a friendly notice + nearest dataset matches.
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <div className="rounded-3xl border border-white/10 bg-ink-850 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime/10 text-2xl font-black text-lime">
          AI
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          {status === "no-key"
            ? "AI generation isn't configured"
            : "Couldn't generate this exercise"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-white/55">
          {status === "no-key" ? (
            <>
              “{readableName}” isn&apos;t in the dataset. Add an{" "}
              <code className="rounded bg-ink-700 px-1.5 py-0.5 text-lime">
                ANTHROPIC_API_KEY
              </code>{" "}
              to enable on-demand AI breakdowns. Meanwhile, here are the closest
              matches we already have.
            </>
          ) : (
            <>
              {errorMsg} Here are the closest matches from our 873 visual
              demonstrations.
            </>
          )}
        </p>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Closest matches
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {suggestions.map((r, i) => (
              <ExerciseCard key={r.slug} result={r} index={i} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/" className="text-sm text-lime hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
