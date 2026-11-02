"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StopwatchState {
  isRunning: boolean;
  startTime: number | null; // Date.now() when started/resumed
  elapsedBeforePause: number; // Elapsed ms prior to current run
}

export interface RestTimerState {
  isRunning: boolean;
  targetDeadline: number | null; // Date.now() + remainingMs
  totalDurationMs: number; // e.g. 90000 ms
  remainingBeforePause: number; // ms left when paused
  isFinished: boolean;
}

export interface TimerContextValue {
  hydrated: boolean;
  // Stopwatch
  stopwatch: StopwatchState;
  stopwatchElapsedMs: number;
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  resetStopwatch: () => void;
  // Rest Timer
  restTimer: RestTimerState;
  restTimerRemainingMs: number;
  startRestTimer: (seconds: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  resetRestTimer: () => void;
  addRestTime: (seconds: number) => void;
  dismissRestFinished: () => void;
  // Settings & Helpers
  soundEnabled: boolean;
  toggleSound: () => void;
  hasActiveTimer: boolean;
}

const STORAGE_KEY = "repvisual:timer:v1";

const DEFAULT_STOPWATCH: StopwatchState = {
  isRunning: false,
  startTime: null,
  elapsedBeforePause: 0,
};

const DEFAULT_REST_TIMER: RestTimerState = {
  isRunning: false,
  targetDeadline: null,
  totalDurationMs: 90 * 1000,
  remainingBeforePause: 90 * 1000,
  isFinished: false,
};

const TimerContext = createContext<TimerContextValue | null>(null);

// ─── Web Audio Synthesizer (Zero asset dependencies, 100% offline) ──────────

function playTimerChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      // @ts-expect-error webkitAudioContext support
      window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Dual-tone chime: A5 (880Hz) followed by D6 (1174.66Hz)
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(880, now, 0.25);
    playTone(1174.66, now + 0.18, 0.5);
  } catch {
    // Audio context may be restricted by browser autoplay policy; fail gracefully
  }
}

function triggerVibration() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Ignore vibration error if not supported
    }
  }
}

function triggerNotification() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification("Rest Time Complete!", {
          body: "Time for your next set! Keep up the momentum.",
          icon: "/favicon.ico",
        });
      } catch {
        // Ignore notification construction error
      }
    }
  }
}

// ─── Provider Component ─────────────────────────────────────────────────────

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [stopwatch, setStopwatch] = useState<StopwatchState>(DEFAULT_STOPWATCH);
  const [restTimer, setRestTimer] = useState<RestTimerState>(DEFAULT_REST_TIMER);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Live calculated values for smooth UI updates
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [restTimerRemainingMs, setRestTimerRemainingMs] = useState(90 * 1000);

  const prevFinishedRef = useRef(false);

  // 1. Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.stopwatch) setStopwatch(parsed.stopwatch);
        if (parsed.restTimer) {
          // If the rest timer was running, verify if deadline has passed while page was closed
          if (parsed.restTimer.isRunning && parsed.restTimer.targetDeadline) {
            const now = Date.now();
            if (now >= parsed.restTimer.targetDeadline) {
              parsed.restTimer.isRunning = false;
              parsed.restTimer.remainingBeforePause = 0;
              parsed.restTimer.isFinished = true;
            }
          }
          setRestTimer(parsed.restTimer);
        }
        if (typeof parsed.soundEnabled === "boolean") {
          setSoundEnabled(parsed.soundEnabled);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setHydrated(true);
  }, []);

  // 2. Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stopwatch, restTimer, soundEnabled })
      );
    } catch {
      // Storage full or unavailable
    }
  }, [stopwatch, restTimer, soundEnabled, hydrated]);

  // 3. Heartbeat animation tick & timestamp recalculation
  useEffect(() => {
    if (!hydrated) return;

    function updateTimes() {
      const now = Date.now();

      // Recalculate stopwatch
      if (stopwatch.isRunning && stopwatch.startTime !== null) {
        const elapsed = stopwatch.elapsedBeforePause + Math.max(0, now - stopwatch.startTime);
        setStopwatchElapsedMs(elapsed);
      } else {
        setStopwatchElapsedMs(stopwatch.elapsedBeforePause);
      }

      // Recalculate rest timer
      if (restTimer.isRunning && restTimer.targetDeadline !== null) {
        const diff = restTimer.targetDeadline - now;
        if (diff <= 0) {
          // Timer finished!
          setRestTimerRemainingMs(0);
          setRestTimer((prev) => ({
            ...prev,
            isRunning: false,
            remainingBeforePause: 0,
            isFinished: true,
          }));
        } else {
          setRestTimerRemainingMs(diff);
        }
      } else {
        setRestTimerRemainingMs(restTimer.remainingBeforePause);
      }
    }

    // Run immediately
    updateTimes();

    // High frequency interval (100ms) for responsive UI while active
    const timer = setInterval(updateTimes, 100);

    // Also update instantly when page becomes visible after sleep / tab switch
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        updateTimes();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [stopwatch, restTimer, hydrated]);

  // 4. Alert user on finish
  useEffect(() => {
    if (restTimer.isFinished && !prevFinishedRef.current) {
      if (soundEnabled) playTimerChime();
      triggerVibration();
      triggerNotification();
    }
    prevFinishedRef.current = restTimer.isFinished;
  }, [restTimer.isFinished, soundEnabled]);

  // ─── Stopwatch Actions ──────────────────────────────────────────────────

  const startStopwatch = useCallback(() => {
    setStopwatch((prev) => {
      if (prev.isRunning) return prev;
      return {
        ...prev,
        isRunning: true,
        startTime: Date.now(),
      };
    });
  }, []);

  const pauseStopwatch = useCallback(() => {
    setStopwatch((prev) => {
      if (!prev.isRunning || prev.startTime === null) return prev;
      const now = Date.now();
      const additional = Math.max(0, now - prev.startTime);
      return {
        isRunning: false,
        startTime: null,
        elapsedBeforePause: prev.elapsedBeforePause + additional,
      };
    });
  }, []);

  const resetStopwatch = useCallback(() => {
    setStopwatch({
      isRunning: false,
      startTime: null,
      elapsedBeforePause: 0,
    });
    setStopwatchElapsedMs(0);
  }, []);

  // ─── Rest Timer Actions ─────────────────────────────────────────────────

  const startRestTimer = useCallback((seconds: number) => {
    const ms = Math.max(1, Math.round(seconds)) * 1000;
    const now = Date.now();

    // Optionally request notification permission on first interaction
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }

    setRestTimer({
      isRunning: true,
      targetDeadline: now + ms,
      totalDurationMs: ms,
      remainingBeforePause: ms,
      isFinished: false,
    });
    setRestTimerRemainingMs(ms);
  }, []);

  const pauseRestTimer = useCallback(() => {
    setRestTimer((prev) => {
      if (!prev.isRunning || prev.targetDeadline === null) return prev;
      const now = Date.now();
      const remaining = Math.max(0, prev.targetDeadline - now);
      return {
        ...prev,
        isRunning: false,
        targetDeadline: null,
        remainingBeforePause: remaining,
      };
    });
  }, []);

  const resumeRestTimer = useCallback(() => {
    setRestTimer((prev) => {
      if (prev.isRunning || prev.remainingBeforePause <= 0) return prev;
      const now = Date.now();
      return {
        ...prev,
        isRunning: true,
        targetDeadline: now + prev.remainingBeforePause,
        isFinished: false,
      };
    });
  }, []);

  const resetRestTimer = useCallback(() => {
    setRestTimer((prev) => ({
      ...prev,
      isRunning: false,
      targetDeadline: null,
      remainingBeforePause: prev.totalDurationMs,
      isFinished: false,
    }));
    setRestTimerRemainingMs(restTimer.totalDurationMs);
  }, [restTimer.totalDurationMs]);

  const addRestTime = useCallback((seconds: number) => {
    const addMs = seconds * 1000;
    setRestTimer((prev) => {
      const now = Date.now();
      if (prev.isRunning && prev.targetDeadline !== null) {
        const nextDeadline = Math.max(now, prev.targetDeadline) + addMs;
        return {
          ...prev,
          targetDeadline: nextDeadline,
          totalDurationMs: prev.totalDurationMs + addMs,
          isFinished: false,
        };
      }
      const nextRemaining = prev.remainingBeforePause + addMs;
      return {
        ...prev,
        remainingBeforePause: nextRemaining,
        totalDurationMs: prev.totalDurationMs + addMs,
        isFinished: false,
      };
    });
  }, []);

  const dismissRestFinished = useCallback(() => {
    setRestTimer((prev) => ({
      ...prev,
      isFinished: false,
    }));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((v) => !v);
  }, []);

  const hasActiveTimer =
    stopwatch.isRunning || restTimer.isRunning || restTimer.isFinished;

  const value: TimerContextValue = {
    hydrated,
    stopwatch,
    stopwatchElapsedMs,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    restTimer,
    restTimerRemainingMs,
    startRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    resetRestTimer,
    addRestTime,
    dismissRestFinished,
    soundEnabled,
    toggleSound,
    hasActiveTimer,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within <TimerProvider>");
  return ctx;
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

export function formatStopwatch(ms: number): {
  hours: string;
  minutes: string;
  seconds: string;
  centiseconds: string;
  formatted: string;
} {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const cs = Math.floor((ms % 1000) / 10);

  const hours = String(h).padStart(2, "0");
  const minutes = String(m).padStart(2, "0");
  const seconds = String(s).padStart(2, "0");
  const centiseconds = String(cs).padStart(2, "0");

  let formatted = `${minutes}:${seconds}`;
  if (h > 0) {
    formatted = `${hours}:${minutes}:${seconds}`;
  }

  return { hours, minutes, seconds, centiseconds, formatted };
}

export function formatRestCountdown(ms: number): {
  minutes: string;
  seconds: string;
  formatted: string;
} {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  const minutes = String(m).padStart(2, "0");
  const seconds = String(s).padStart(2, "0");

  return { minutes, seconds, formatted: `${minutes}:${seconds}` };
}
