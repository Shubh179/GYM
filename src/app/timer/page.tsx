"use client";

import { useTimer, formatStopwatch } from "@/lib/timer";

export default function TimerPage() {
  const {
    hydrated, stopwatch, stopwatchElapsedMs,
    startStopwatch, pauseStopwatch, resetStopwatch,
  } = useTimer();

  if (!hydrated) {
    return <div className="px-5 py-24 text-center text-white/50">Loading timer...</div>;
  }
  const sw = formatStopwatch(stopwatchElapsedMs);

  return (
    <div className="page-shell py-10">
      <h1 className="page-title mb-6">Timer</h1>
          <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-850 p-5 transition sm:p-8">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <h2 className="font-display text-lg font-bold text-white">
                    Workout Timer
                  </h2>
                </div>
                <span className="text-xs font-medium text-white/50">
                  Elapsed Time
                </span>
              </div>

              {/* Big Stopwatch Display */}
              <div className="relative my-4 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-ink-900/90 py-10 px-4 text-center">
                <div className="font-display text-5xl font-semibold tabular-nums tracking-tight text-white sm:text-7xl">
                  {sw.formatted}
                  <span className="ml-1 text-2xl font-semibold text-white/50">
                    .{sw.centiseconds}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {stopwatch.isRunning ? (
                    <span className="flex items-center gap-1.5 text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                      Workout in progress
                    </span>
                  ) : stopwatchElapsedMs > 0 ? (
                    <span className="text-amber-400">Paused</span>
                  ) : (
                    <span>Ready</span>
                  )}
                </div>
              </div>


            </div>

            {/* Stopwatch Action Controls */}
            <div className="mt-8 space-y-3">
              <div className="flex gap-3">
                {stopwatch.isRunning ? (
                  <button
                    onClick={pauseStopwatch}
                    className="flex-1 rounded-2xl border border-amber-400/50 bg-amber-400/10 py-3.5 text-center text-sm font-bold text-amber-300 transition hover:bg-amber-400/20"
                  >
                    Pause
                  </button>
                ) : stopwatchElapsedMs > 0 ? (
                  <button
                    onClick={startStopwatch}
                    className="flex-1 rounded-2xl bg-accent py-3.5 text-center text-sm font-black text-ink-950 transition hover:bg-accent-soft shadow-sm"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={startStopwatch}
                    className="flex-1 rounded-2xl bg-accent py-3.5 text-center text-sm font-black text-ink-950 transition hover:bg-accent-soft shadow-sm"
                  >
                    Start
                  </button>
                )}

                {/* Reset Button */}
                <button
                  onClick={resetStopwatch}
                  disabled={stopwatchElapsedMs === 0}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-bold text-white/60 transition hover:border-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
    </div>
  );
}
