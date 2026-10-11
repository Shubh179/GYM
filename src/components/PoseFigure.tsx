"use client";

import type { PoseFrame, SvgPose } from "@/lib/types";

type Joint = keyof PoseFrame;

const BONES: [Joint, Joint][] = [
  ["head", "neck"],
  ["neck", "hip"],
  ["neck", "leftElbow"],
  ["leftElbow", "leftHand"],
  ["neck", "rightElbow"],
  ["rightElbow", "rightHand"],
  ["hip", "leftKnee"],
  ["leftKnee", "leftFoot"],
  ["hip", "rightKnee"],
  ["rightKnee", "rightFoot"],
];

const JOINTS: Joint[] = [
  "neck",
  "hip",
  "leftElbow",
  "rightElbow",
  "leftHand",
  "rightHand",
  "leftKnee",
  "rightKnee",
  "leftFoot",
  "rightFoot",
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(
  a: [number, number],
  b: [number, number],
  t: number
): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export default function PoseFigure({ pose, t }: { pose: SvgPose; t: number }) {
  const frame = {} as Record<Joint, [number, number]>;
  (Object.keys(pose.start) as Joint[]).forEach((j) => {
    frame[j] = lerpPoint(pose.start[j], pose.finish[j], t);
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full p-6"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* floor line */}
      <line x1="8" y1="97" x2="92" y2="97" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />

      {/* bones */}
      {BONES.map(([a, b], i) => (
        <line
          key={i}
          x1={frame[a][0]}
          y1={frame[a][1]}
          x2={frame[b][0]}
          y2={frame[b][1]}
          stroke="#c6ff2e"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ))}

      {/* head */}
      <circle cx={frame.head[0]} cy={frame.head[1]} r="5" fill="#c6ff2e" />

      {/* joints */}
      {JOINTS.map((j) => (
        <circle key={j} cx={frame[j][0]} cy={frame[j][1]} r="1.6" fill="#07070a" stroke="#c6ff2e" strokeWidth="0.8" />
      ))}
    </svg>
  );
}
