
export enum Scene {
  LANDING = 'LANDING',
  TRANSITIONING = 'TRANSITIONING',
  CHAT = 'CHAT'
}

export interface Thought {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  scale: number;
  createdAt: number;
  method: 'voice' | 'text';
}

export interface PersonalityConfig {
  name: string;
  traits: string[];
  systemPrompt: string;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
}
