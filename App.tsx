import React, { useState, useEffect, useRef, useCallback } from "react";
import { Scene, Thought } from "./types";
import BackgroundEngine from "./components/BackgroundEngine";
import FloatingThought from "./components/FloatingThought";
import { generateThought } from "./services/llmService";
import { speakThought } from "./services/voiceService";
import { MAX_THOUGHTS } from "./constants";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [scene, setScene] = useState(Scene.LANDING);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const thoughtsRef = useRef<Thought[]>([]);
  const frameRef = useRef<number>();

  // ---------- HELPERS ----------

  const center = () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2 - 40,
  });

  const randomExitVector = () => {
    const angle = Math.random() * Math.PI * 2;
    return {
      vx: Math.cos(angle) * 4.5, // HIGH SPEED
      vy: Math.sin(angle) * 4.5,
    };
  };

  // ---------- THOUGHT CREATION ----------

  const spawnQuestion = (text: string): Thought => {
    const c = center();
    const v = randomExitVector();

    return {
      id: crypto.randomUUID(),
      text,
      kind: "question",

      x: c.x,
      y: c.y,

      vx: v.vx,
      vy: v.vy,

      createdAt: Date.now(),
      opacity: 0.6,
      scale: 0.9,
    };
  };

  const spawnResponse = (text: string): Thought => {
    const c = center();

    return {
      id: crypto.randomUUID(),
      text,
      kind: "response",

      x: c.x,
      y: c.y,

      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,

      createdAt: Date.now(),
      opacity: 0.85,
      scale: 1,
    };
  };

  const addThought = (t: Thought) => {
    thoughtsRef.current = [t, ...thoughtsRef.current].slice(0, MAX_THOUGHTS);
    setThoughts([...thoughtsRef.current]);
  };

  // ---------- INPUT ----------

  const handleInput = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    // QUESTION — fast exit
    addThought(spawnQuestion(text));

    try {
      const response = await generateThought(text);

      // RESPONSE — slow drift
      addThought(
        spawnResponse(
          response && response.trim().length
            ? response
            : "…"
        )
      );

      await speakThought(response);
    } catch {
      addThought(
        spawnResponse("Silence sometimes answers more honestly than words.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- ANIMATION LOOP ----------

  const animate = useCallback(() => {
    const now = Date.now();

    thoughtsRef.current = thoughtsRef.current.filter((t) => {
      t.x += t.vx;
      t.y += t.vy;

      if (t.kind === "question") {
        // fade quickly and leave screen
        t.opacity -= 0.02;

        const offScreen =
          t.x < -300 ||
          t.x > window.innerWidth + 300 ||
          t.y < -300 ||
          t.y > window.innerHeight + 300;

        return t.opacity > 0 && !offScreen;
      }

      // response behavior
      const age = now - t.createdAt;
      t.opacity = Math.max(0.35, 0.85 - age / 140000);

      const margin = 160;
      if (t.x < margin || t.x > window.innerWidth - margin) t.vx *= -1;
      if (t.y < margin || t.y > window.innerHeight - 260) t.vy *= -1;

      return true;
    });

    setThoughts([...thoughtsRef.current]);
    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (scene === Scene.CHAT) {
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [scene, animate]);

  // ---------- UI ----------

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden text-white">
      <BackgroundEngine scene={scene} />

      {scene === Scene.LANDING && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => {
              setScene(Scene.TRANSITIONING);
              setTimeout(() => setScene(Scene.CHAT), 2200);
            }}
            className="w-52 h-52 rounded-full bg-emerald-500/20 animate-pulse"
          />
        </div>
      )}

      {scene === Scene.CHAT && (
        <>
          {thoughts.map((t) => (
            <FloatingThought key={t.id} thought={t} />
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInput(inputText);
            }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8"
          >
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="enter a thought"
              className="
                w-full
                bg-black/20
                border border-white/10
                rounded-md
                px-6
                py-2
                text-xs
                tracking-[0.25em]
                text-center
                outline-none
              "
            />
          </form>
        </>
      )}
    </div>
  );
};

export default App;
