"use client";
import { MUSCLE_GROUPS, groupForExercise, groupForSession } from "@/lib/muscle-guide";
import { exerciseTargets, targetLabel } from "@/lib/muscle-targets";
import type { SearchResult } from "@/lib/types";
import { useAnatomyExplorer } from "./AnatomyProvider";

interface Props { sessionName?: string; sessionId?: string; exercises: SearchResult[]; exerciseMode?: boolean; }
export default function MuscleGuide({ sessionName = "", sessionId, exercises, exerciseMode = false }: Props) {
  const open = useAnatomyExplorer();
  const exercise = exerciseMode ? exercises[0] : undefined;
  const groupId = exercise ? groupForExercise(exercise) ?? "chest" : groupForSession(sessionName, exercises);
  const group = MUSCLE_GROUPS.find(item => item.id === groupId)!;
  const savedTargets = exercise ? exerciseTargets(exercise) : [];
  const view = group.regions.find(region => savedTargets.includes(region.id))?.view ?? group.view;
  const targets = savedTargets.length ? group.regions.filter(region => savedTargets.includes(region.id)).map(region => region.id) : group.regions.map(region => region.id);
  const description = savedTargets.length ? savedTargets.map(targetLabel).join(", ") : group.regions.map(region => region.label).join(", ");
  return <section data-muscle-guide data-active-muscle-group={group.id} className="mb-6 flex min-w-0 items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-ink-950/60 p-3 sm:gap-6 sm:p-4" aria-label="Muscle anatomy preview">
    {/* Rendered from the same licensed anatomy asset; no WebGL or model request. */}
    <div className="h-36 w-20 shrink-0 overflow-hidden rounded-lg bg-[#171722] sm:h-40 sm:w-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/models/anatomy/preview-${view}.webp`} alt={`${view === "front" ? "Front" : "Back"} anatomy preview`} width={290} height={540} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-white">{group.label} anatomy</h3>
      <p title={description} className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{description}</p>
      <button type="button" onClick={() => open({ groupId: group.id, targets, view, sessionId, title: exercise ? `${exercise.name} · Anatomy` : `${group.label} anatomy` })}
        className="mt-3 min-h-11 rounded-lg border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200">Explore in 3D</button>
      <a href="/models/anatomy/README.md" target="_blank" rel="noreferrer" className="mt-2 block w-fit text-[9px] text-white/35 underline underline-offset-2">Z-Anatomy / BodyParts3D · CC BY-SA 4.0</a>
    </div>
  </section>;
}
