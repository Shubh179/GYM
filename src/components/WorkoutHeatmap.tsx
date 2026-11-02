"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLibrary } from "@/lib/library";

// A GitHub/LeetCode-style contribution grid of completed workout sessions.
// Each cell is one day; colour intensity reflects how many sessions were
// completed that day. Data comes from the library store's `completions` map,
// which only grows when every exercise in a workout session is checked off.

const WEEKS = 53;
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function levelClass(count: number): string {
  if (count <= 0) return "bg-white/[0.06]";
  if (count === 1) return "bg-accent/40";
  if (count === 2) return "bg-accent/60";
  if (count === 3) return "bg-accent/80";
  return "bg-accent";
}

interface Cell {
  key: string;
  label: string;
  count: number;
  future: boolean;
  isToday: boolean;
}

export default function WorkoutHeatmap() {
  const { hydrated, completions, getHistoryForDate } = useLibrary();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedSessions = selectedDay ? getHistoryForDate(selectedDay) : [];
  const scrollRef = useRef<HTMLDivElement>(null);

  const { columns, monthLabels, totalSessions, activeDays, streak } =
    useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Start on the Sunday that begins the earliest visible week.
      const start = new Date(today);
      start.setDate(start.getDate() - (WEEKS - 1) * 7 - today.getDay());

      const cursor = new Date(start);
      const cols: Cell[][] = [];
      const labels: { col: number; text: string }[] = [];
      let lastMonth = -1;

      for (let w = 0; w < WEEKS; w++) {
        const col: Cell[] = [];
        for (let d = 0; d < 7; d++) {
          const future = cursor > today;
          const key = dayKey(cursor);
          col.push({
            key,
            label: cursor.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            count: future ? 0 : (completions[key] ?? 0),
            future,
            isToday: cursor.getTime() === today.getTime(),
          });
          if (d === 0 && cursor.getMonth() !== lastMonth) {
            lastMonth = cursor.getMonth();
            labels.push({ col: w, text: MONTHS[lastMonth] });
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        cols.push(col);
      }

      let total = 0;
      let active = 0;
      for (const key of Object.keys(completions)) {
        const n = completions[key] ?? 0;
        if (n > 0) {
          total += n;
          active += 1;
        }
      }

      // Current streak: consecutive days up to today with a completion.
      let s = 0;
      const probe = new Date(today);
      while ((completions[dayKey(probe)] ?? 0) > 0) {
        s += 1;
        probe.setDate(probe.getDate() - 1);
      }

      return {
        columns: cols,
        monthLabels: labels,
        totalSessions: total,
        activeDays: active,
        streak: s,
      };
    }, [completions]);

  function formatDateLabel(dk: string): string {
    const [y, m, d] = dk.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // The newest week (today) is at the far right; scroll there on mount and
  // whenever a session is logged so a freshly completed day is in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [hydrated, completions]);

  return (
    <section className="rounded-xl border border-white/10 bg-ink-850 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            Training activity
          </h2>
        </div>
        <div className="flex w-full gap-6 border-t border-white/10 pt-4 text-sm sm:w-auto sm:border-0 sm:pt-0">
          <Stat value={hydrated ? totalSessions : 0} label="sessions" />
          <Stat value={hydrated ? activeDays : 0} label="active days" />
          <Stat value={hydrated ? streak : 0} label="day streak" />
        </div>
      </div>

      <div className="overflow-x-auto pb-1" ref={scrollRef}>
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="relative ml-8 h-4 text-[10px] text-white/50">
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.text}`}
                className="absolute"
                style={{ left: `${m.col * 14}px` }}
              >
                {m.text}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday labels */}
            <div className="mr-1 flex w-7 flex-col gap-[3px] text-[9px] leading-[11px] text-white/50">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="h-[11px]">
                  {d}
                </span>
              ))}
            </div>

            {/* Week columns */}
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell) =>
                  cell.future ? (
                    <span key={cell.key} className="h-[11px] w-[11px]" />
                  ) : (
                    <button
                      type="button"
                      key={cell.key}
                      onClick={() => setSelectedDay((day) => day === cell.key ? null : cell.key)}
                      aria-pressed={selectedDay === cell.key}
                      aria-label={`${cell.label}: ${cell.count} completed sessions`}
                      title={
                        cell.count > 0
                          ? `${cell.count} session${cell.count === 1 ? "" : "s"} on ${cell.label}`
                          : `No sessions on ${cell.label}`
                      }
                      className={`h-[11px] w-[11px] shrink-0 rounded-[2px] transition hover:ring-2 hover:ring-accent/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${selectedDay === cell.key ? "ring-2 ring-accent" : ""} ${levelClass(
                        hydrated ? cell.count : 0,
                      )} ${cell.isToday ? "ring-1 ring-white/70" : ""}`}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-white/50">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-[11px] w-[11px] rounded-[2px] ${levelClass(n)}`}
          />
        ))}
        <span>More</span>
      </div>
      {/* Detail panel */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Workout Details
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">
                    {formatDateLabel(selectedDay)}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:text-white"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {selectedSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-ink-850/50 p-6 text-center">
                  <p className="text-sm text-white/50">
                    No completed workout recorded for this day.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {selectedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-accent/20 bg-accent/[0.03] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="font-display font-semibold text-white">
                          {session.workoutName}
                        </h4>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          Completed
                        </span>
                      </div>

                      {session.exercises.length > 0 ? (
                        <ul className="space-y-1.5">
                          {session.exercises.map((ex, i) => (
                            <li
                              key={`${ex.slug}-${i}`}
                              className="flex items-center gap-3"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink-700">
                                {ex.thumbUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={ex.thumbUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[8px] font-bold text-accent">
                                    AI
                                  </span>
                                )}
                              </span>
                              <span className="text-sm text-white/80">
                                {ex.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-white/50">
                          No exercise details recorded.
                        </p>
                      )}

                      <p className="mt-3 text-xs text-white/50">
                        Completed at {formatTime(session.completedAt)}
                      </p>

                      {session.notes && (
                        <p className="mt-2 rounded-lg bg-ink-800 px-3 py-2 text-xs text-white/60">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-xl font-semibold tabular-nums leading-none text-white">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-white/50">
        {label}
      </div>
    </div>
  );
}
