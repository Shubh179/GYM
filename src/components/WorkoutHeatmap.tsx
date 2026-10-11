"use client";

import { useEffect, useMemo, useRef } from "react";
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
  if (count === 1) return "bg-lime/40";
  if (count === 2) return "bg-lime/60";
  if (count === 3) return "bg-lime/80";
  return "bg-lime";
}

interface Cell {
  key: string;
  label: string;
  count: number;
  future: boolean;
  isToday: boolean;
}

export default function WorkoutHeatmap() {
  const { hydrated, completions } = useLibrary();
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

  // The newest week (today) is at the far right; scroll there on mount and
  // whenever a session is logged so a freshly completed day is in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [hydrated, completions]);

  return (
    <section className="rounded-2xl border border-white/10 bg-ink-850 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Training activity
          </h2>
          <p className="mt-1 text-sm text-white/50">
            A day lights up when you finish every exercise in a session.
          </p>
        </div>
        <div className="flex gap-5 text-sm">
          <Stat value={hydrated ? totalSessions : 0} label="sessions" />
          <Stat value={hydrated ? activeDays : 0} label="active days" />
          <Stat value={hydrated ? streak : 0} label="day streak" />
        </div>
      </div>

      <div className="overflow-x-auto pb-1" ref={scrollRef}>
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="relative ml-8 h-4 text-[10px] text-white/40">
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
            <div className="mr-1 flex w-7 flex-col gap-[3px] text-[9px] leading-[11px] text-white/40">
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
                    <span
                      key={cell.key}
                      title={
                        cell.count > 0
                          ? `${cell.count} session${cell.count === 1 ? "" : "s"} on ${cell.label}`
                          : `No sessions on ${cell.label}`
                      }
                      className={`h-[11px] w-[11px] rounded-[2px] ${levelClass(
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
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-white/40">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-[11px] w-[11px] rounded-[2px] ${levelClass(n)}`}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-2xl font-black leading-none text-lime">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-white/40">
        {label}
      </div>
    </div>
  );
}
