"use client";
import { useLibrary } from "@/lib/library";

export default function SyncedWeeklySchedule() {
  const { weeklySchedule, setWeeklySchedule, hydrated, syncStatus, syncError } = useLibrary();
  return <section aria-labelledby="weekly-schedule-heading" className="rounded-xl border border-white/10 bg-ink-850 p-4 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id="weekly-schedule-heading" className="font-display text-base font-semibold text-white">Weekly schedule</h2>
      {hydrated && !syncError && <span role="status" className="text-xs text-white/50">{syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing..." : "Saved on device"}</span>}
    </div>
    <textarea aria-label="Monday to Sunday schedule" rows={7} value={weeklySchedule} disabled={!hydrated}
      onChange={event => setWeeklySchedule(event.target.value)} spellCheck={false}
      className="block w-full min-w-0 resize-y rounded-lg border border-white/10 bg-ink-900 px-3 py-3 text-base leading-6 text-white/80 focus:border-accent/50 focus:outline-none disabled:opacity-50" />
    {syncError && <p role="alert" className="mt-3 text-sm text-red-400">{syncError}</p>}
  </section>;
}
