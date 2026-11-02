"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "@/lib/library";

interface QuickNotesProps {
  exerciseSlug: string;
  exerciseName: string;
  className?: string;
  compact?: boolean;
  onClose?: () => void;
}

export default function QuickNotes({
  exerciseSlug,
  exerciseName,
  className = "",
  compact = false,
  onClose,
}: QuickNotesProps) {
  const { hydrated, getNote, setNote, clearNote, hasNote } = useLibrary();

  const savedNote = hydrated ? getNote(exerciseSlug) : "";
  const exists = hydrated && hasNote(exerciseSlug);

  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [confirmClear, setConfirmClear] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when saved note loads or exercise changes
  useEffect(() => {
    if (hydrated) {
      setDraft(savedNote);
      setIsEditing(!savedNote);
      setSaveStatus("idle");
      setConfirmClear(false);
    }
  }, [hydrated, savedNote, exerciseSlug]);

  function handleSave() {
    setSaveStatus("idle");
    const success = setNote(exerciseSlug, draft);
    if (success) {
      setSaveStatus("saved");
      if (draft.trim()) {
        setIsEditing(false);
      }
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
    }
  }

  function handleClear() {
    clearNote(exerciseSlug);
    setDraft("");
    setIsEditing(true);
    setConfirmClear(false);
    setSaveStatus("idle");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <section
      id="my-quick-notes"
      className={`rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-card transition ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-white">
                My Quick Notes
              </h3>
              {exists && !isEditing && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  Saved
                </span>
              )}
            </div>
            {!compact && (
              <p className="text-xs text-white/50">
                Your personal reminders, seat settings, and form cues for{" "}
                <span className="text-white/60">{exerciseName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close notes"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mt-4">
        {/* Saved confirmation feedback */}
        <AnimatePresence>
          {saveStatus === "saved" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Notes saved successfully to this device!
            </motion.div>
          )}

          {saveStatus === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-300"
            >
              Could not save note (storage full or unavailable). Your unsaved
              text is preserved below.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Mode: when note exists and user is not currently editing */}
        {!isEditing && exists ? (
          <div className="space-y-3">
            <div className="relative rounded-xl border border-white/10 bg-ink-900/90 p-4 transition">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-accent" />
              <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">
                {savedNote}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-white/50">
                Private notes • saved on this device
              </span>

              <div className="flex items-center gap-2">
                {confirmClear ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleClear}
                      className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition"
                    >
                      Confirm clear
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-xs text-white/50 hover:text-white px-1.5 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-red-400"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Clear
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsEditing(true);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Edit / Creation Mode */
          <div className="space-y-3">
            <div className="relative">
              <textarea
                id="my-quick-notes-textarea"
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={compact ? 4 : 5}
                placeholder="Add your personal reminders for this exercise (e.g. bench setting, seat height, form cues, preferred grip)..."
                className="w-full rounded-xl border border-white/15 bg-ink-900 p-3.5 font-sans text-sm leading-relaxed text-white placeholder:text-white/50 focus:border-accent/60 focus:bg-ink-800/90 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-white/50">
                Tip: Press <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-white/60">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-white/60">Enter</kbd> to save
              </span>

              <div className="flex items-center gap-2">
                {exists && (
                  <button
                    onClick={() => {
                      setDraft(savedNote);
                      setIsEditing(false);
                      setConfirmClear(false);
                    }}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-accent-soft"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
