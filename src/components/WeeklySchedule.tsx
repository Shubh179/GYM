"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "repvisual:weekly-schedule:v1";
const TEMPLATE = "Monday:\nTuesday:\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:";

export default function WeeklySchedule() {
  const [schedule, setSchedule] = useState(TEMPLATE);
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) { setSchedule(stored); setSaved(true); }
    } catch {
      setError("Saved schedule could not be loaded on this device.");
    }
    setHydrated(true);
  }, []);

  function update(value: string) {
    setSchedule(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
      setSaved(true);
      setError("");
    } catch {
      setSaved(false);
      setError("Your changes could not be saved. Keep this page open and copy your schedule before leaving.");
    }
  }

  return (
    <section aria-labelledby="weekly-schedule-heading" className="rounded-xl border border-white/10 bg-ink-850 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="weekly-schedule-heading" className="font-display text-base font-semibold text-white">Weekly schedule</h2>
        {saved && !error && <span role="status" className="text-xs text-white/50">Saved</span>}
      </div>
      <textarea
        aria-label="Monday to Sunday schedule"
        aria-describedby={error ? "weekly-schedule-error" : undefined}
        rows={7}
        value={schedule}
        disabled={!hydrated}
        onChange={event => update(event.target.value)}
        spellCheck={false}
        className="block w-full min-w-0 resize-y rounded-lg border border-white/10 bg-ink-900 px-3 py-3 text-base leading-6 text-white/80 focus:border-accent/50 focus:outline-none disabled:opacity-50"
      />
      {error && <p id="weekly-schedule-error" role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
