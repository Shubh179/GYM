import { exerciseTargets } from "./muscle-targets";
import type { SearchResult } from "./types";
export type MuscleGroupId = "chest" | "back" | "biceps" | "triceps" | "shoulders" | "forearms" | "abs" | "legs";
export type BodyView = "front" | "back";
export interface MuscleRegion {
    id: string;
    label: string;
    anatomicalName: string;
    location: string;
    action: string;
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
    note?: string;
}
const region = (id: string, label: string, anatomicalName: string, location: string, action: string, color: string, view: BodyView, anchor: [
    number,
    number,
    number
]): MuscleRegion => ({ id, label, anatomicalName, location, action, color, view, anchor });
export const MUSCLE_GROUPS: MuscleGroup[] = [
    { id: "chest", label: "Chest", muscles: ["chest"], view: "front", note: "Upper, middle and lower chest describe areas of emphasis within your pectoral muscles. Presses still involve more than one area.", regions: [
            region("upper-chest", "Upper chest", "Clavicular fibers", "Below the collarbone.", "Incline pressing emphasizes this area.", "#ff8b75", "front", [.28, 1.43, .35]),
            region("middle-chest", "Middle chest", "Sternocostal fibers", "Across the center of the chest.", "Flat pressing trains this area.", "#edc66b", "front", [.30, 1.23, .36]),
            region("lower-chest", "Lower chest", "Lower pectoral fibers", "Along the lower edge of the chest.", "Decline pressing emphasizes this area.", "#66d9c5", "front", [.27, 1.03, .35]),
        ] },
    { id: "back", label: "Back", muscles: ["lats", "traps", "middle back", "lower back"], view: "back", regions: [
            region("lats", "Lats", "Latissimus dorsi", "Broad sides of your back.", "Draw your upper arms toward your body.", "#72b6fa", "back", [.36, .84, -.32]),
            region("upper-traps", "Upper traps", "Upper trapezius", "Between your neck and shoulders.", "Help elevate the shoulder blades.", "#edc66b", "back", [.25, 1.58, -.28]),
            region("middle-back", "Middle back", "Rhomboids / middle trapezius", "Between the shoulder blades.", "Help draw the shoulder blades together.", "#bc9bf7", "back", [.23, 1.25, -.34]),
            region("lower-back", "Lower back", "Spinal erectors", "Either side of your lower spine.", "Help keep your trunk upright.", "#66d9c5", "back", [.12, .53, -.30]),
        ] },
    { id: "biceps", label: "Biceps", muscles: ["biceps"], view: "front", regions: [
            region("biceps-long-head", "Long head", "Biceps brachii: long head", "Outer side of the front upper arm.", "Works with the short head to bend your elbow.", "#ff8b75", "front", [.86, 1.10, .22]),
            region("biceps-short-head", "Short head", "Biceps brachii: short head", "Inner side of the front upper arm.", "Helps bend the elbow and turn your palm up.", "#72b6fa", "front", [.75, 1.08, .24]),
            region("brachialis", "Brachialis", "Brachialis", "Under the biceps, visible near the elbow.", "Bends the elbow regardless of hand position.", "#edc66b", "front", [.91, .76, .16]),
        ] },
    { id: "triceps", label: "Triceps", muscles: ["triceps"], view: "back", note: "The medial head lies partly beneath the other heads; its lower portion is shown here.", regions: [
            region("triceps-long-head", "Long head", "Triceps brachii: long head", "Inner side of the back upper arm.", "Straightens the elbow; also crosses the shoulder.", "#bc9bf7", "back", [.77, 1.09, -.22]),
            region("triceps-lateral-head", "Lateral head", "Triceps brachii: lateral head", "Outer side of the back upper arm.", "Helps straighten your elbow.", "#66d9c5", "back", [.89, 1.07, -.20]),
            region("triceps-medial-head", "Medial head", "Triceps brachii: medial head", "Deeper back upper arm, near the elbow.", "Contributes to elbow extension.", "#edc66b", "back", [.90, .72, -.19]),
        ] },
    { id: "shoulders", label: "Shoulders", muscles: ["shoulders"], view: "front", regions: [
            region("front-delts", "Front delts", "Anterior deltoid", "Front of each shoulder.", "Help lift your arms in front of you.", "#ff8b75", "front", [.64, 1.49, .24]),
            region("side-delts", "Side delts", "Lateral deltoid", "Outside of each shoulder.", "Help lift your arms out to the side.", "#edc66b", "front", [.78, 1.47, .03]),
            region("rear-delts", "Rear delts", "Posterior deltoid", "Back of each shoulder.", "Help move your arms backward.", "#72b6fa", "back", [.64, 1.49, -.24]),
        ] },
    { id: "forearms", label: "Forearms", muscles: ["forearms"], view: "front", regions: [
            region("forearm-flexors", "Flexors", "Wrist / finger flexors", "Palm side of the forearm.", "Help bend your wrist and grip.", "#66d9c5", "front", [1.04, .17, .17]),
            region("forearm-extensors", "Extensors", "Wrist / finger extensors", "Back of the forearm.", "Help extend your wrist and fingers.", "#bc9bf7", "back", [1.04, .17, -.17]),
        ] },
    { id: "abs", label: "Abs", muscles: ["abdominals"], view: "front", regions: [
            region("rectus-abdominis", "Abs", "Rectus abdominis", "Paired muscles down the front of your trunk.", "Help bend your trunk and brace your midsection.", "#edc66b", "front", [.12, .71, .30]),
            region("obliques", "Obliques", "External / internal obliques", "Sides of the waist; deeper layers are simplified.", "Help rotate and stabilize your trunk.", "#66d9c5", "front", [.31, .54, .25]),
        ] },
    { id: "legs", label: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "abductors", "adductors", "calves"], view: "front", regions: [
            region("quads", "Quads", "Quadriceps", "Front of the thighs.", "Straighten your knees.", "#ff8b75", "front", [.28, -.64, .24]),
            region("hamstrings", "Hamstrings", "Hamstring muscle group", "Back of the thighs.", "Bend your knees and help extend your hips.", "#72b6fa", "back", [.29, -.65, -.25]),
            region("glute-max", "Glutes", "Gluteus maximus", "Back of the hips.", "Help extend your hips.", "#bc9bf7", "back", [.23, -.16, -.37]),
            region("hip-abductors", "Hip abductors", "Gluteus medius and other abductors", "Outer sides of the hips.", "Move the thigh outward and stabilize your pelvis.", "#e9a1ca", "front", [.43, -.14, .02]),
            region("hip-adductors", "Adductors", "Hip adductor group", "Inner thighs.", "Draw your legs toward the midline.", "#edc66b", "front", [.12, -.56, .23]),
            region("gastrocnemius", "Upper calf", "Gastrocnemius", "Larger upper part of the back calf.", "Helps point your toes and bend the knee.", "#66d9c5", "back", [.28, -1.54, -.23]),
            region("soleus", "Lower / deeper calf", "Soleus", "Below and beneath the gastrocnemius.", "Helps point your toes and support standing.", "#a6c97b", "back", [.28, -1.91, -.17]),
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
