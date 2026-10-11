import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { slugify } from "./exercises";
import type { GeneratedExercise, PoseFrame, SvgPose } from "./types";

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "MissingKeyError";
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const coord = z.array(z.number()).length(2);

const PoseFrameSchema = z.object({
  head: coord,
  neck: coord,
  hip: coord,
  leftHand: coord,
  rightHand: coord,
  leftElbow: coord,
  rightElbow: coord,
  leftFoot: coord,
  rightFoot: coord,
  leftKnee: coord,
  rightKnee: coord,
});

const GuideSchema = z.object({
  name: z.string(),
  level: z.enum(["beginner", "intermediate", "expert"]),
  category: z.string(),
  equipment: z.string(),
  mechanic: z.enum(["compound", "isolation"]),
  force: z.enum(["push", "pull", "static"]),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  tips: z.array(z.string()),
  startPositionCue: z.string(),
  finishPositionCue: z.string(),
  pose: z.object({
    start: PoseFrameSchema,
    finish: PoseFrameSchema,
  }),
});

type Guide = z.infer<typeof GuideSchema>;
type RawFrame = Guide["pose"]["start"];

function toFrame(f: RawFrame): PoseFrame {
  const p = (c: number[]): [number, number] => [c[0], c[1]];
  return {
    head: p(f.head),
    neck: p(f.neck),
    hip: p(f.hip),
    leftHand: p(f.leftHand),
    rightHand: p(f.rightHand),
    leftElbow: p(f.leftElbow),
    rightElbow: p(f.rightElbow),
    leftFoot: p(f.leftFoot),
    rightFoot: p(f.rightFoot),
    leftKnee: p(f.leftKnee),
    rightKnee: p(f.rightKnee),
  };
}

const SYSTEM = `You are a certified strength and conditioning coach and biomechanics expert.
You produce precise, safe, structured breakdowns of gym exercises.
For the animated pose diagram, output a simple 2D stick-figure for a side-on view.
Use a 0-100 coordinate space where x grows to the right and y grows downward
(0 = top of frame, 100 = bottom/floor). Keep joints anatomically plausible and
make the START and FINISH frames clearly different so the movement reads well
when the two frames alternate. Feet should sit near y=95 for standing moves.`;

function toGenerated(guide: Guide): GeneratedExercise {
  const slug = slugify(guide.name);
  const svgPose: SvgPose = {
    start: toFrame(guide.pose.start),
    finish: toFrame(guide.pose.finish),
  };
  return {
    id: `ai-${slug}`,
    slug,
    name: guide.name,
    level: guide.level,
    equipment: guide.equipment,
    mechanic: guide.mechanic,
    force: guide.force,
    category: guide.category,
    primaryMuscles: guide.primaryMuscles,
    secondaryMuscles: guide.secondaryMuscles,
    instructions: guide.instructions,
    imageUrls: [],
    tips: guide.tips,
    startPositionCue: guide.startPositionCue,
    finishPositionCue: guide.finishPositionCue,
    svgPose,
    source: "ai",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateGuide(name: string): Promise<GeneratedExercise> {
  if (!hasApiKey()) throw new MissingKeyError();

  const client = new Anthropic();

  const response = await client.beta.messages.parse({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    betas: ["structured-outputs-2025-11-13"],
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Create a complete gym exercise guide for: "${name}".
Return structured data including: difficulty level, category, equipment, mechanic,
force type, primary and secondary muscles, numbered step-by-step instructions,
3-6 concise technique tips, a one-sentence START position cue, a one-sentence FINISH
position cue, and a two-frame side-on stick-figure pose (start and finish) in the
0-100 coordinate space described in the system prompt.`,
      },
    ],
    output_format: betaZodOutputFormat(GuideSchema),
  });

  const guide = response.parsed_output;
  if (!guide) {
    throw new Error("AI did not return a valid guide.");
  }
  return toGenerated(guide);
}
