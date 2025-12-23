import React from "react";
import { Thought } from "../types";

interface FloatingThoughtProps {
  thought: Thought;
  isLatest: boolean;
}

const FloatingThought: React.FC<FloatingThoughtProps> = ({ thought, isLatest }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: thought.x,
        top: thought.y,
        transform: `translate(-50%, -50%) scale(${thought.scale})`,
        opacity: thought.opacity,
        pointerEvents: "none",
        maxWidth: "480px",
        zIndex: isLatest ? 1000 : Math.floor(thought.opacity * 100),
      }}
      className="select-none"
    >
      <p
        className={`
          text-center italic tracking-wider leading-relaxed
          transition-opacity duration-1000
          ${
            isLatest
              ? "text-white text-xl md:text-2xl drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"
              : "text-white/70 text-lg drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]"
          }
        `}
      >
        {thought.text}
      </p>
    </div>
  );
};

export default FloatingThought;
