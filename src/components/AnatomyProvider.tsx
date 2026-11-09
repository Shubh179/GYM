"use client";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { BodyView, MuscleGroupId } from "@/lib/muscle-guide";

export interface AnatomyRequest { groupId: MuscleGroupId; targets: string[]; view: BodyView; title: string; }
const Explorer = dynamic(() => import("./AnatomyExplorer"), { ssr: false });
const AnatomyContext = createContext<((request: AnatomyRequest) => void) | null>(null);
export function useAnatomyExplorer() {
  const open = useContext(AnatomyContext);
  if (!open) throw Error("AnatomyProvider is missing");
  return open;
}
export default function AnatomyProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<(AnatomyRequest & { revision: number }) | null>(null);
  const [opened, setOpened] = useState(false);
  const sequence = useRef(0);
  const open = useCallback((next: AnatomyRequest) => {
    setRequest({ ...next, revision: ++sequence.current }); setOpened(true);
  }, []);
  const close = useCallback(() => setOpened(false), []);
  const value = useMemo(() => open, [open]);
  return <AnatomyContext.Provider value={value}>
    {children}
    {request && <Explorer request={request} opened={opened} onClose={close} />}
  </AnatomyContext.Provider>;
}
