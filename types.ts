export enum Scene {
  LANDING = "LANDING",
  TRANSITIONING = "TRANSITIONING",
  CHAT = "CHAT",
}

export interface Thought {
  id: string;
  text: string;

  // position (mutated via animation loop, not React)
  x: number;
  y: number;

  // velocity
  vx: number;
  vy: number;

  // lifecycle
  createdAt: number;
  anchorTime: number;
  phase: "emerging" | "settling" | "drifting";

  // visual
  opacity: number;
  scale: number;

  // input method
  method: "voice" | "text";
}
