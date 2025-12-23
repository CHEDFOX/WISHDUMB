export enum Scene {
  LANDING = "LANDING",
  TRANSITIONING = "TRANSITIONING",
  CHAT = "CHAT",
}

export type ThoughtKind = "question" | "response";

export interface Thought {
  id: string;
  text: string;
  kind: ThoughtKind;

  x: number;
  y: number;

  vx: number;
  vy: number;

  createdAt: number;
  opacity: number;
  scale: number;

  // response state
  centered?: boolean;
}
