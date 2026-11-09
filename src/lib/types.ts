// Shared types for the gym visualizer.

// Raw record shape from free-exercise-db.
export interface RawExercise {
  id: string;
  name: string;
  force?: string | null;
  level?: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  targetAreas?: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[]; // e.g. "Bench_Press/0.jpg", "Bench_Press/1.jpg"
}

// Normalized exercise used across the app.
export interface Exercise {
  id: string;
  slug: string;
  name: string;
  level: string;
  equipment: string | null;
  mechanic: string | null;
  force: string | null;
  category: string;
  primaryMuscles: string[];
  targetAreas?: string[];
  secondaryMuscles: string[];
  instructions: string[];
  // Full CDN image URLs. [0] = start position, [1] = finish position.
  imageUrls: string[];
  source: "dataset" | "custom";
  youtubeVideoId?: string;
}

// AI-generated guide for exercises not in the dataset.
export interface GeneratedExercise {
  id: string;
  slug: string;
  name: string;
  level: string;
  equipment: string | null;
  mechanic: string | null;
  force: string | null;
  category: string;
  primaryMuscles: string[];
  targetAreas?: string[];
  secondaryMuscles: string[];
  instructions: string[];
  imageUrls: string[]; // empty for AI; viewer falls back to SVG pose
  tips: string[];
  startPositionCue: string;
  finishPositionCue: string;
  svgPose?: SvgPose | null;
  source: "ai";
  generatedAt: string;
}

// A minimal two-frame stick-figure pose for the animated SVG diagram.
// Coordinates are in a 0-100 viewbox space.
export interface PoseFrame {
  // Named joints; each is [x, y] in 0..100.
  head: [number, number];
  neck: [number, number];
  hip: [number, number];
  leftHand: [number, number];
  rightHand: [number, number];
  leftElbow: [number, number];
  rightElbow: [number, number];
  leftFoot: [number, number];
  rightFoot: [number, number];
  leftKnee: [number, number];
  rightKnee: [number, number];
}

export interface SvgPose {
  start: PoseFrame;
  finish: PoseFrame;
}

export type AnyExercise = Exercise | GeneratedExercise;

export interface SearchResult {
  slug: string;
  name: string;
  level: string;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  targetAreas?: string[];
  thumbUrl: string | null;
}
