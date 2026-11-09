import { exerciseTargets } from "./muscle-targets";
import type { SearchResult } from "./types";
export type MuscleGroupId = "chest" | "back" | "biceps" | "triceps" | "shoulders" | "forearms" | "abs" | "legs";
export type BodyView = "front" | "back";
export interface MuscleRegion {
    id: string;
    label: string;
    color: string;
    view: BodyView;
    anchor: [
        number,
        number,
        number
    ];
}
export interface MuscleGroup {
    id: MuscleGroupId;
    label: string;
    muscles: string[];
    view: BodyView;
    regions: MuscleRegion[];
}
const region = (id: string, label: string, color: string, view: BodyView, anchor: [
    number,
    number,
    number
]): MuscleRegion => ({ id, label, color, view, anchor });
export const MUSCLE_GROUPS: MuscleGroup[] = [
    { id: "chest", label: "Chest", muscles: ["chest"], view: "front", regions: [
            region("upper-chest", "Upper chest", "#ff8b75", "front", [.28, 1.43, .35]),
            region("middle-chest", "Middle chest", "#edc66b", "front", [.30, 1.23, .36]),
            region("lower-chest", "Lower chest", "#66d9c5", "front", [.27, 1.03, .35]),
        ] },
    { id: "back", label: "Back", muscles: ["lats", "traps", "middle back", "lower back"], view: "back", regions: [
            region("lats", "Lats", "#72b6fa", "back", [.36, .84, -.32]),
            region("upper-traps", "Upper traps", "#edc66b", "back", [.25, 1.58, -.28]),
            region("middle-back", "Middle back", "#bc9bf7", "back", [.23, 1.25, -.34]),
            region("lower-back", "Lower back", "#66d9c5", "back", [.12, .53, -.30]),
        ] },
    { id: "biceps", label: "Biceps", muscles: ["biceps"], view: "front", regions: [
            region("biceps-long-head", "Long head", "#ff8b75", "front", [.86, 1.10, .22]),
            region("biceps-short-head", "Short head", "#72b6fa", "front", [.75, 1.08, .24]),
            region("brachialis", "Brachialis", "#edc66b", "front", [.91, .76, .16]),
        ] },
    { id: "triceps", label: "Triceps", muscles: ["triceps"], view: "back",  regions: [
            region("triceps-long-head", "Long head", "#bc9bf7", "back", [.77, 1.09, -.22]),
            region("triceps-lateral-head", "Lateral head", "#66d9c5", "back", [.89, 1.07, -.20]),
            region("triceps-medial-head", "Medial head", "#edc66b", "back", [.90, .72, -.19]),
        ] },
    { id: "shoulders", label: "Shoulders", muscles: ["shoulders"], view: "front", regions: [
            region("front-delts", "Front delts", "#ff8b75", "front", [.64, 1.49, .24]),
            region("side-delts", "Side delts", "#edc66b", "front", [.78, 1.47, .03]),
            region("rear-delts", "Rear delts", "#72b6fa", "back", [.64, 1.49, -.24]),
        ] },
    { id: "forearms", label: "Forearms", muscles: ["forearms"], view: "front", regions: [
            region("forearm-flexors", "Flexors", "#66d9c5", "front", [1.04, .17, .17]),
            region("forearm-extensors", "Extensors", "#bc9bf7", "back", [1.04, .17, -.17]),
        ] },
    { id: "abs", label: "Abs", muscles: ["abdominals"], view: "front", regions: [
            region("rectus-abdominis", "Abs", "#edc66b", "front", [.12, .71, .30]),
            region("obliques", "Obliques", "#66d9c5", "front", [.31, .54, .25]),
        ] },
    { id: "legs", label: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "abductors", "adductors", "calves"], view: "front", regions: [
            region("quads", "Quads", "#ff8b75", "front", [.28, -.64, .24]),
            region("hamstrings", "Hamstrings", "#72b6fa", "back", [.29, -.65, -.25]),
            region("glute-max", "Glutes", "#bc9bf7", "back", [.23, -.16, -.37]),
            region("hip-abductors", "Hip abductors", "#e9a1ca", "front", [.43, -.14, .02]),
            region("hip-adductors", "Adductors", "#edc66b", "front", [.12, -.56, .23]),
            region("gastrocnemius", "Upper calf", "#66d9c5", "back", [.28, -1.54, -.23]),
            region("soleus", "Lower / deeper calf", "#a6c97b", "back", [.28, -1.91, -.17]),
        ] },
];
export function groupForExercise(exercise: Pick<SearchResult, "name" | "primaryMuscles" | "targetAreas">): MuscleGroupId | undefined {
    const targets = exerciseTargets(exercise);
    return MUSCLE_GROUPS.find(group => group.regions.some(region => targets.includes(region.id)))?.id
        ?? MUSCLE_GROUPS.find(group => group.muscles.some(muscle => exercise.primaryMuscles?.includes(muscle)))?.id;
}
export function groupForSession(name: string, exercises: SearchResult[]): MuscleGroupId {
    const text = name.toLowerCase();
    const aliases: [
        RegExp,
        MuscleGroupId
    ][] = [[/forearm/, "forearms"], [/tricep/, "triceps"], [/bicep/, "biceps"], [/chest|\bpecs?\b|push/, "chest"], [/back|\blats?\b|pull/, "back"], [/shoulder|delt/, "shoulders"], [/\babs?\b|core/, "abs"], [/leg|quad|hamstring|glute|calf|calves|lower body/, "legs"]];
    return aliases.find(([pattern]) => pattern.test(text))?.[1] ?? exercises.map(groupForExercise).find(Boolean) ?? "chest";
}
