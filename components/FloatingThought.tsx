
import React from 'react';
import { Thought } from '../types';

interface FloatingThoughtProps {
  thought: Thought;
  isLatest: boolean;
}

const FloatingThought: React.FC<FloatingThoughtProps> = ({ thought, isLatest }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${thought.x}px`,
        top: `${thought.y}px`,
        transform: `translate(-50%, -50%) scale(${thought.scale * (isLatest ? 1.1 : 1)})`,
        opacity: isLatest ? 1 : Math.max(0.4, thought.opacity),
        transition: 'all 2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        pointerEvents: 'none', // Raw text doesn't need interaction now that speaker is gone
        maxWidth: '450px',
        zIndex: isLatest ? 2000 : Math.floor(thought.opacity * 100)
      }}
      className={`select-none ${isLatest ? 'animate-breathe' : ''}`}
    >
      <div className="relative flex flex-col items-center text-center">
        <p className={`text-lg md:text-xl leading-relaxed tracking-wider italic antialiased transition-all duration-1000 ${
          isLatest 
            ? 'text-white font-normal drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]' 
            : 'text-white/70 font-light drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]'
        }`}>
          {thought.text}
        </p>
      </div>
    </div>
  );
};

export default FloatingThought;
