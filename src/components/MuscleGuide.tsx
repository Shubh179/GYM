"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { MUSCLE_GROUPS, groupForExercise, groupForSession, type BodyView } from "@/lib/muscle-guide";
import { exerciseTargets } from "@/lib/muscle-targets";
import type { SearchResult } from "@/lib/types";
const MuscleBody3D = dynamic(() => import("./MuscleBody3D"), { ssr: false, loading: () => <div role="status" className="flex h-[400px] items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-sm text-white/50 sm:h-[470px]">Loading 3D body...</div> });
interface Props {
    sessionName?: string;
    exercises: SearchResult[];
    exerciseMode?: boolean;
}
export default function MuscleGuide({ sessionName = "", exercises, exerciseMode = false }: Props) {
    const exercise = exerciseMode ? exercises[0] : undefined;
    const groupId = exercise ? groupForExercise(exercise) ?? "chest" : groupForSession(sessionName, exercises);
    const group = MUSCLE_GROUPS.find(group => group.id === groupId)!;
    const exerciseTargetIds = useMemo(() => exercise ? exerciseTargets(exercise) : [], [exercise]);
    const preferredView = group.regions.find(region => exerciseTargetIds.includes(region.id))?.view ?? group.view;
    const selectedSignature = exercise ? JSON.stringify([exercise.name, exercise.primaryMuscles, exercise.targetAreas]) : "";
    const [focusedTarget, setFocusedTarget] = useState<string | null>(null);
    const [view, setView] = useState<BodyView>(preferredView);
    const [viewRequest, setViewRequest] = useState(0);
    function chooseView(next: BodyView) { setView(next); setViewRequest(value => value + 1); }
    useEffect(() => {
        setFocusedTarget(null);
        setView(preferredView);
        setViewRequest(value => value + 1);
    }, [group.id, preferredView, selectedSignature]);
    const knownExercise = Boolean(exercise && exerciseTargetIds.length);
    const activeTargets = useMemo(() => focusedTarget ? [focusedTarget] : knownExercise ? group.regions.filter(region => exerciseTargetIds.includes(region.id)).map(region => region.id) : group.regions.map(region => region.id), [group, focusedTarget, knownExercise, exerciseTargetIds]);
    function chooseTarget(target: string) {
        if (focusedTarget === target) {
            setFocusedTarget(null);
            return;
        }
        setFocusedTarget(target);
        const region = group?.regions.find(region => region.id === target);
        if (region)
            chooseView(region.view);
    }
    return <section data-muscle-guide className="mb-6 min-w-0" aria-label="Interactive muscle guide">
      <div role="region" aria-label={`${group.label} muscles`} className="relative" data-active-muscle-group={group.id}>
        <MuscleBody3D group={group} activeTargets={activeTargets} focusedTarget={focusedTarget} view={view} viewRequest={viewRequest} pulsing={false} onSelect={chooseTarget}/>
        <div className="absolute right-3 top-3 z-20 flex gap-1.5" aria-label="Body view controls">
          {(["front", "back"] as const).map(side => <button key={side} aria-label={`${side === "front" ? "Front" : "Back"} view`} title={`${side === "front" ? "Front" : "Back"} view`} aria-pressed={view === side} onClick={() => chooseView(side)} className={`flex h-11 w-11 items-center justify-center rounded-lg border bg-ink-950/90 ${view === side ? "border-white/30 text-white" : "border-white/10 text-white/45"}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="5" r="2.5"/><path d="M8 21v-7l-2-3 2-3h8l2 3-2 3v7M12 14v7"/>{side === "front" ? <path d="M10 11h4"/> : <path d="M12 8v6"/>}</svg>
          </button>)}
          {focusedTarget && <button aria-label="Show all muscles" title="Show all muscles" onClick={() => setFocusedTarget(null)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-ink-950/90 text-white/65"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg></button>}
        </div>
      </div>
    </section>;
}
