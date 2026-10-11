import { GoogleGenAI } from "@google/genai";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// On-demand "Dive Deep · Rep Tension" video generation via Google's Veo model
// (Gemini API). This is the ONLY path that can produce real video — Claude
// generates the text guide + SVG pose, but cannot generate video.
//
// Generated clips are cached to public/demos/<slug>.mp4 so the next visitor
// gets it instantly (same caching philosophy as the AI text guides).

const DEFAULT_MODEL = "veo-3.1-fast-generate-preview";

export class MissingVideoKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
    this.name = "MissingVideoKeyError";
  }
}

export function hasVideoKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function videoModel(): string {
  return process.env.GEMINI_VIDEO_MODEL || DEFAULT_MODEL;
}

// Build a prompt that asks Veo for a clear slow-motion rep-tension breakdown.
function buildPrompt(name: string, primaryMuscles: string[]): string {
  const muscles =
    primaryMuscles.length > 0
      ? primaryMuscles.join(", ")
      : "the primary working muscles";
  return [
    `Educational slow-motion fitness demonstration of a single clean repetition of the "${name}" exercise.`,
    `Show one person with correct form performing the full range of motion from the start position to the finish position and back.`,
    `Emphasize where muscular tension builds: highlight the ${muscles} contracting during the lifting (concentric) phase and lengthening under load during the lowering (eccentric) phase.`,
    `Clean, well-lit gym studio, side profile camera angle so the joint angles and movement path are clearly visible.`,
    `Smooth, controlled tempo. No text overlays, no captions, no logos.`,
  ].join(" ");
}

export interface GenerateVideoInput {
  slug: string;
  name: string;
  primaryMuscles: string[];
}

// Generates a deep-dive video, saves it to public/demos/<slug>.mp4 and returns
// the public URL. Throws MissingVideoKeyError if no key is configured.
export async function generateDeepDiveVideo({
  slug,
  name,
  primaryMuscles,
}: GenerateVideoInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingVideoKeyError();

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(name, primaryMuscles);

  let operation = await ai.models.generateVideos({
    model: videoModel(),
    prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: "16:9",
      negativePrompt: "text, captions, subtitles, watermark, logo, blurry, distorted anatomy",
    },
  });

  // Veo is a long-running operation — poll until it completes.
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    const message =
      (operation.error as { message?: string })?.message ??
      "Video generation failed.";
    throw new Error(message);
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) {
    throw new Error("Veo returned no video (it may have been filtered).");
  }

  const demosDir = path.join(process.cwd(), "public", "demos");
  if (!existsSync(demosDir)) {
    await mkdir(demosDir, { recursive: true });
  }
  const outPath = path.join(demosDir, `${slug}.mp4`);

  // The SDK appends the API key and streams the file to disk.
  await ai.files.download({ file: video, downloadPath: outPath });

  return `/demos/${slug}.mp4`;
}
