"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLibrary } from "@/lib/library";
import { exerciseTargets, targetLabel } from "@/lib/muscle-targets";
import { MUSCLE_GROUPS, type BodyView } from "@/lib/muscle-guide";
import type { AnatomyRequest } from "./AnatomyProvider";
import MuscleBody3D from "./MuscleBody3D";

export default function AnatomyExplorer({ request, opened, onClose }: {
  request: AnatomyRequest; opened: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { workouts } = useLibrary();
  const previousPath = useRef(pathname);
  const [focused, setFocused] = useState<string | null>(null);
  const [view, setView] = useState<BodyView>(request.view);
  const [viewRequest, setViewRequest] = useState(0);
  const group = MUSCLE_GROUPS.find(item => item.id === request.groupId)!;
  useEffect(() => {
    setFocused(null); setView(request.view); setViewRequest(value => value + 1);
  }, [request]);
  useEffect(() => {
    const element = dialog.current;
    if (opened && element && !element.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
    } else if (!opened && element?.open) {
      element.close(); opener.current?.focus();
    }
    if (!opened) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [opened]);
  useEffect(() => {
    if (previousPath.current !== pathname) onClose();
    previousPath.current = pathname;
  }, [pathname, onClose]);
  function chooseView(next: BodyView) { setView(next); setViewRequest(value => value + 1); }
  function select(target: string) {
    setFocused(current => current === target ? null : target);
    const region = group.regions.find(item => item.id === target);
    if (region && region.view !== view) chooseView(region.view);
  }
  function showExercises(target: string) {
    const session = request.sessionId ? workouts.find(workout => workout.id === request.sessionId) : undefined;
    const match = session?.exercises.find(exercise => exerciseTargets(exercise).includes(target));
    const card = match && session ? document.querySelector<HTMLElement>(`[data-workout-id="${CSS.escape(session.id)}"] [data-exercise-slug="${CSS.escape(match.slug)}"]`) : null;
    onClose();
    if (card) {
      // Wait for the modal to release focus/scroll locking before revealing the
      // session card. This intentionally does not navigate to its detail page.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        card.focus({ preventScroll: true });
      }));
    } else {
      router.push(`/search?target=${encodeURIComponent(target)}`);
    }
  }
  return <dialog ref={dialog} aria-labelledby="anatomy-explorer-title" onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={onClose} className="m-auto max-h-[95dvh] w-[calc(100%_-_1rem)] max-w-5xl overflow-auto rounded-2xl border border-white/15 bg-ink-950 p-0 text-white backdrop:bg-black/75">
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <h2 id="anatomy-explorer-title" className="text-sm font-semibold">{request.title}</h2>
      <button type="button" onClick={onClose} autoFocus aria-label="Close 3D viewer" className="min-h-11 rounded-lg border border-white/15 px-3 text-sm hover:bg-white/10">Close</button>
    </div>
    <div className="relative" data-anatomy-explorer>
      <MuscleBody3D group={group} activeTargets={focused ? [focused] : request.targets} focusedTarget={focused}
        view={view} viewRequest={viewRequest} enabled={opened} onSelect={select} onActivate={showExercises} />
      <div className="absolute right-3 top-3 z-20 flex gap-1.5" aria-label="Body view controls">
        {(["front", "back"] as const).map(side => <button type="button" key={side} aria-label={`${side === "front" ? "Front" : "Back"} view`} aria-pressed={view === side}
          onClick={() => chooseView(side)} className="min-h-11 rounded-lg border border-white/15 bg-ink-950/90 px-3 text-xs hover:bg-white/10">{side === "front" ? "Front" : "Back"}</button>)}
        {focused && <button type="button" aria-label="Show all muscles" onClick={() => setFocused(null)} className="min-h-11 rounded-lg border border-white/15 bg-ink-950/90 px-3 text-xs">Reset</button>}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <p className="text-xs text-white/50">Double-tap a muscle or its label to find exercises.</p>
      <button type="button" disabled={!focused} onClick={() => focused && showExercises(focused)} className="min-h-11 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-40">{focused ? `Show exercises for ${targetLabel(focused)}` : "Select a muscle"}</button>
    </div>
  </dialog>;
}
