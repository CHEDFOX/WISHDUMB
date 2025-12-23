import React from "react";
import { Thought } from "../types";

interface Props {
  thought: Thought;
}

const FloatingThought: React.FC<Props> = ({ thought }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: thought.x,
        top: thought.y,
        transform: `translate(-50%, -50%) scale(${thought.scale})`,
        opacity: thought.opacity,
        pointerEvents: "none",
        maxWidth: thought.kind === "question" ? "420px" : "560px",
        zIndex: thought.centered ? 200 : 50,
      }}
      className="select-none"
    >
      <p
        className={
          thought.kind === "question"
            ? "text-xs text-white/40 italic text-center tracking-wide"
            : "text-sm md:text-base text-white/80 italic text-center tracking-wide leading-relaxed"
        }
      >
        {thought.text}
      </p>
    </div>
  );
};

export default FloatingThought;
