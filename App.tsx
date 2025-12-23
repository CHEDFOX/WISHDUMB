import React, { useState, useEffect, useRef, useCallback } from "react";
import { Scene, Thought } from "./types";
import BackgroundEngine from "./components/BackgroundEngine";
import FloatingThought from "./components/FloatingThought";
import { generateThought } from "./services/llmService";
import { speakThought } from "./services/voiceService";
import { MAX_THOUGHTS } from "./constants";

const App: React.FC = () => {
  const [scene, setScene] = useState<Scene>(Scene.LANDING);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const thoughtsRef = useRef<Thought[]>([]);
  const frameRef = useRef<number>();

  // ---------- THOUGHT SPAWNING ----------

  const randomPosition = () => {
    const padding = 200;
    return {
      x: padding + Math.random() * (window.innerWidth - padding * 2),
      y: padding + Math.random() * (window.innerHeight - padding * 2),
    };
  };

  const addThought = (text: string, method: "voice" | "text") => {
    const pos = randomPosition();

    const thought: Thought = {
      id: crypto.randomUUID(),
      text,

      x: pos.x,
      y: pos.y,

      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,

      createdAt: Date.now(),
      anchorTime: Date.now(),
      phase: "emerging",

      opacity: 0,
      scale: 1.1,

      method,
    };

    thoughtsRef.current = [thought, ...thoughtsRef.current].slice(0, MAX_THOUGHTS);
    setThoughts([...thoughtsRef.current]);
  };

  // ---------- DRIFT ENGINE ----------

  const animateThoughts = useCallback(() => {
    const now = Date.now();

    thoughtsRef.current.forEach((t) => {
      const age = now - t.createdAt;

      // lifecycle
      if (t.phase === "emerging" && age > 700) {
        t.phase = "settling";
        t.anchorTime = now;
      }

      if (t.phase === "settling" && now - t.anchorTime > 2400) {
        t.phase = "drifting";
        t.scale = 1.0;
      }

      // motion
      if (t.phase === "drifting") {
        t.x += t.vx;
        t.y += t.vy;
      }

      // boundaries
      const margin = 140;
      if (t.x < margin || t.x > window.innerWidth - margin) t.vx *= -1;
      if (t.y < margin || t.y > window.innerHeight - 260) t.vy *= -1;

      // opacity
      if (t.phase === "emerging") {
        t.opacity = Math.min(1, t.opacity + 0.05);
      } else {
        t.opacity = Math.max(0.35, 0.9 - age / 120000);
      }
    });

    setThoughts([...thoughtsRef.current]);
    frameRef.current = requestAnimationFrame(animateThoughts);
  }, []);

  useEffect(() => {
    if (scene === Scene.CHAT) {
      frameRef.current = requestAnimationFrame(animateThoughts);
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [scene, animateThoughts]);

  // ---------- INPUT ----------

  const processInput = async (text: string, method: "voice" | "text") => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    try {
      const response = await generateThought(text);
      addThought(response, method);
      if (method === "voice") await speakThought(response);
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- UI ----------

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
      <BackgroundEngine scene={scene} />

      {scene === Scene.LANDING && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button
            onClick={() => {
              setScene(Scene.TRANSITIONING);
              setTimeout(() => setScene(Scene.CHAT), 2500);
            }}
            className="w-56 h-56 rounded-full bg-emerald-500/20 animate-pulse"
          />
        </div>
      )}

      {scene === Scene.CHAT && (
        <>
          {thoughts.map((t, i) => (
            <FloatingThought key={t.id} thought={t} isLatest={i === 0} />
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              processInput(inputText, "text");
            }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-xl px-6"
          >
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isProcessing ? "" : "Speak to the quiet"}
              className="w-full bg-black/30 border-b border-white/20 py-5 text-center tracking-[0.2em] outline-none"
            />
          </form>
        </>
      )}
    </div>
  );
};

export default App;
