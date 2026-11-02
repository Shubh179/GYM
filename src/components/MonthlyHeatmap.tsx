"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLibrary, dateToKey, type CompletedSession } from "@/lib/library";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayCell {
  type: "empty" | "day";
  key: string;
  day?: number;
  dateKey?: string;
  isFuture?: boolean;
  isToday?: boolean;
  count?: number;
}

export default function MonthlyHeatmap() {
  const { hydrated, completions, getHistoryForDate } = useLibrary();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Calendar data for the viewed month.
  const { cells, workoutDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = dateToKey(today);

    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday-first layout: Mon=0 … Sun=6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const result: DayCell[] = [];
    let wDays = 0;

    // Empty cells before the 1st
    for (let i = 0; i < startOffset; i++) {
      result.push({ type: "empty", key: `e-${i}` });
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dk = dateToKey(date);
      const isFuture = date > today;
      const isToday = dk === todayStr;
      const count = !isFuture && hydrated ? (completions[dk] ?? 0) : 0;
      if (count > 0) wDays++;
      result.push({
        type: "day",
        key: dk,
        day: d,
        dateKey: dk,
        isFuture,
        isToday,
        count,
      });
    }

    return { cells: result, workoutDays: wDays };
  }, [viewYear, viewMonth, hydrated, completions]);

  const goToPrev = useCallback(() => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNext = useCallback(() => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(null);
  }, []);

  // Detail panel data.
  const selectedSessions: CompletedSession[] = selectedDay
    ? getHistoryForDate(selectedDay)
    : [];

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

  const isCurrentMonth =
    viewYear === new Date().getFullYear() &&
    viewMonth === new Date().getMonth();

  return (
    <section className="rounded-2xl border border-white/10 bg-ink-850 p-5">
      {/* Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${
          collapsed ? "" : "mb-5"
        }`}
      >
        <div
          onClick={() => setCollapsed((v) => !v)}
          className="cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-white">
              Training Activity
            </h2>
            <svg
              className={`h-4 w-4 text-white/50 transition-transform duration-200 sm:hidden ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <p className="mt-1 text-sm text-white/50">
            {hydrated ? workoutDays : 0} workout
            {workoutDays !== 1 ? " days" : " day"} in{" "}
            {MONTH_NAMES[viewMonth]} {viewYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!collapsed && (
            <>
              <button
                onClick={goToPrev}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-ink-900 text-white/60 transition hover:border-accent/40 hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={goToToday}
                className="rounded-xl border border-white/10 bg-ink-900 px-3 py-1.5 text-sm font-medium text-white/60 transition hover:border-accent/40 hover:text-white"
              >
                {MONTH_NAMES[viewMonth]} {viewYear}
              </button>

              <button
                onClick={goToNext}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-ink-900 text-white/60 transition hover:border-accent/40 hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {!isCurrentMonth && (
                <button
                  onClick={goToToday}
                  className="ml-1 text-xs font-medium text-accent hover:underline"
                >
                  Today
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand calendar heatmap" : "Collapse calendar heatmap"}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-accent/40 hover:text-white"
          >
            <span>{collapsed ? "Show" : "Hide"}</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                collapsed ? "-rotate-90" : "rotate-0"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((wd) => (
          <div
            key={wd}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/50"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.type === "empty") {
            return <div key={cell.key} className="aspect-square" />;
          }

          const isCompleted = (cell.count ?? 0) > 0;
          const isSelected = selectedDay === cell.dateKey;

          return (
            <button
              key={cell.key}
              onClick={() =>
                setSelectedDay((prev) =>
                  prev === cell.dateKey ? null : cell.dateKey ?? null
                )
              }
              disabled={cell.isFuture}
              className={`
                relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition
                ${cell.isFuture
                  ? "cursor-default text-white/15"
                  : isSelected
                    ? "bg-accent text-ink-950 shadow-sm"
                    : isCompleted
                      ? "bg-accent/25 text-accent hover:bg-accent/40"
                      : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
                }
                ${cell.isToday && !isSelected ? "ring-2 ring-accent/60 ring-offset-1 ring-offset-ink-850" : ""}
              `}
              aria-label={`${cell.day} ${MONTH_NAMES[viewMonth]} ${viewYear}${isCompleted ? " – workout completed" : ""}`}
            >
              {cell.day}
              {isCompleted && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-white/50">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-white/[0.04]" />
          Rest
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-accent/25" />
          Trained
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded ring-2 ring-accent/60 ring-offset-1 ring-offset-ink-850" />
          Today
        </span>
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
            <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/60 p-5">
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:text-white"
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
                <div className="space-y-4">
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
