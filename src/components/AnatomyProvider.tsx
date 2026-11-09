"use client";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useState } from "react";
import type { BodyView, MuscleGroupId } from "@/lib/muscle-guide";

export interface AnatomyRequest { groupId: MuscleGroupId; targets: string[]; view: BodyView; title: string; sessionId?: string; }
const Explorer = dynamic(() => import("./AnatomyExplorer"), { ssr: false });
const AnatomyContext = createContext<((request: AnatomyRequest) => void) | null>(null);
export function useAnatomyExplorer() {
  const open = useContext(AnatomyContext);
  if (!open) throw Error("AnatomyProvider is missing");
  return open;
}
export default function AnatomyProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<AnatomyRequest | null>(null);
  const [opened, setOpened] = useState(false);
  const open = useCallback((next: AnatomyRequest) => {
    setRequest({ ...next }); setOpened(true);
  }, []);
  const close = useCallback(() => setOpened(false), []);
  return <AnatomyContext.Provider value={open}>
    {children}
    {request && <Explorer request={request} opened={opened} onClose={close} />}
  </AnatomyContext.Provider>;
}
