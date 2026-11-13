"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTimer,
  formatRestCountdown,
  formatStopwatch,
} from "@/lib/timer";

export default function FloatingTimer() {
  const pathname = usePathname();
  const {
    hydrated,
    restTimer,
    restTimerRemainingMs,
    pauseRestTimer,
    addRestTime,
    dismissRestFinished,
    stopwatch,
    stopwatchElapsedMs,
  } = useTimer();

  // Do not show the floating widget on the full timer page itself
  if (!hydrated || pathname === "/timer") return null;

  const isRestRunning = restTimer.isRunning;
  const isRestFinished = restTimer.isFinished;
  const isStopwatchRunning = stopwatch.isRunning;

  // Show floating timer only if rest timer is running/finished or stopwatch is running
  const shouldShow = isRestRunning || isRestFinished || isStopwatchRunning;

  if (!shouldShow) return null;

  const rt = formatRestCountdown(restTimerRemainingMs);
  const sw = formatStopwatch(stopwatchElapsedMs);

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Active workout timer"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="floating-workout-timer fixed bottom-5 right-4 z-40 max-w-[calc(100vw-2rem)] sm:bottom-5 sm:right-5 sm:max-w-sm rounded-2xl border border-white/15 bg-ink-900/95 p-3.5 shadow-2xl backdrop-blur-lg sm:p-4"
      >
        {isRestFinished ? (
          /* Finished Rest Alert Banner */
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent font-black text-ink-950 animate-bounce">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-accent">Rest Finished!</p>
              <p className="text-[11px] text-white/70">Time for your next set.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={dismissRestFinished}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/20 transition"
              >
                Dismiss
              </button>
              <Link
                href="/timer"
                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-ink-950 hover:bg-accent-soft transition"
              >
                Timer →
              </Link>
            </div>
          </div>
        ) : isRestRunning ? (
          /* Active Rest Countdown Pill */
          <div className="flex items-center gap-3">
            <Link
              href="/timer"
              className="flex items-center gap-2.5 group"
              title="Open full timer screen"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent transition group-hover:bg-accent group-hover:text-ink-950">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Rest Timer
                </span>
                <span className="font-display text-xl font-black text-white">
                  {rt.formatted}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
              <button
                onClick={pauseRestTimer}
                aria-label="Pause rest timer"
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/70 hover:border-white/30 hover:text-white transition"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </button>
              <button
                onClick={() => addRestTime(30)}
                aria-label="Add 30 seconds"
                className="rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent hover:bg-accent/20 transition"
              >
                +30s
              </button>
              <Link
                href="/timer"
                aria-label="Expand timer"
                className="rounded-lg bg-white/5 p-2 text-white/50 hover:text-white transition"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Stopwatch Pill */
          <div className="flex items-center gap-3">
            <Link
              href="/timer"
              className="flex items-center gap-2.5 group"
              title="Open full stopwatch screen"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent transition group-hover:bg-accent group-hover:text-ink-950">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12" />
                </svg>
              </span>
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Stopwatch
                </span>
                <span className="font-display text-xl font-black text-white">
                  {sw.formatted}
                </span>
              </div>
            </Link>

            <div className="border-l border-white/10 pl-3">
              <Link
                href="/timer"
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/20 transition"
              >
                View →
              </Link>
            </div>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
