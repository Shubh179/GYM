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
