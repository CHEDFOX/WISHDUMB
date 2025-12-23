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

/* ---------- CONSTANTS ---------- */

const CENTER_RADIUS = 170;
const EDGE_MARGIN = 120;
const MAX_SPEED = 0.45;
const DAMPING = 0.985;

const App: React.FC = () => {
  const [scene, setScene] = useState(Scene.LANDING);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const thoughtsRef = useRef<Thought[]>([]);
  const frameRef = useRef<number>();
  const recognitionRef = useRef<any>(null);

  /* ---------- SPEECH ---------- */

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang = "en-US";
    r.continuous = false;

    r.onresult = (e: any) => {
      handleInput(e.results[0][0].transcript, "voice");
    };

    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
    setIsListening(!isListening);
  };

  /* ---------- HELPERS ---------- */

  const center = () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2 - 40,
  });

  const randomUnit = () => {
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a), y: Math.sin(a) };
  };

  /* ---------- SPAWN ---------- */

  const spawnQuestion = (text: string): Thought => {
    const c = center();
    const d = randomUnit();

    return {
      id: crypto.randomUUID(),
      text,
      kind: "question",
      x: c.x,
      y: c.y,
      vx: d.x * 5,
      vy: d.y * 5,
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
      vx: 0,
      vy: 0,
      createdAt: Date.now(),
      opacity: 0.9,
      scale: 1,
      centered: true,
    };
  };

  /* ---------- INPUT ---------- */

  const handleInput = async (text: string, mode: "text" | "voice") => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    // Question exits
    thoughtsRef.current.unshift(spawnQuestion(text));

    // Old centered response → de-center
    thoughtsRef.current = thoughtsRef.current.map((t) => {
      if (t.kind === "response" && t.centered) {
        const d = randomUnit();
        return {
          ...t,
          centered: false,
          vx: d.x * 0.6,
          vy: d.y * 0.6,
        };
      }
      return t;
    });

    setThoughts([...thoughtsRef.current]);

    try {
      const response = await generateThought(text);
      thoughtsRef.current.unshift(
        spawnResponse(response || "…")
      );
      if (mode === "voice") await speakThought(response);
    } catch {
      thoughtsRef.current.unshift(
        spawnResponse("Silence sometimes answers more honestly than words.")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* ---------- ANIMATION ---------- */

  const animate = useCallback(() => {
    const now = Date.now();
    const c = center();

    thoughtsRef.current = thoughtsRef.current.filter((t) => {
      // Integrate motion
      t.x += t.vx;
      t.y += t.vy;

      // Velocity damping (prevents escape)
      t.vx *= DAMPING;
      t.vy *= DAMPING;

      // Cap speed
      const speed = Math.hypot(t.vx, t.vy);
      if (speed > MAX_SPEED) {
        t.vx = (t.vx / speed) * MAX_SPEED;
        t.vy = (t.vy / speed) * MAX_SPEED;
      }

      // QUESTIONS fade & leave
      if (t.kind === "question") {
        t.opacity -= 0.04;
        return t.opacity > 0;
      }

      /* ----- RESPONSE PHYSICS ----- */

      // Center exclusion (hard)
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (!t.centered && dist < CENTER_RADIUS) {
        t.vx += (dx / dist) * 0.2;
        t.vy += (dy / dist) * 0.2;
      }

      // Gentle wander
      if (!t.centered) {
        t.vx += (Math.random() - 0.5) * 0.01;
        t.vy += (Math.random() - 0.5) * 0.01;
      }

      // Edge containment (SOFT BOUNCE)
      if (t.x < EDGE_MARGIN || t.x > window.innerWidth - EDGE_MARGIN) {
        t.vx *= -0.8;
        t.x = Math.max(
          EDGE_MARGIN,
          Math.min(window.innerWidth - EDGE_MARGIN, t.x)
        );
      }

      if (t.y < EDGE_MARGIN || t.y > window.innerHeight - EDGE_MARGIN) {
        t.vy *= -0.8;
        t.y = Math.max(
          EDGE_MARGIN,
          Math.min(window.innerHeight - EDGE_MARGIN, t.y)
        );
      }

      // Aging fade
      const age = now - t.createdAt;
      t.opacity = Math.max(0.45, 0.85 - age / 180000);

      return true;
    });

    thoughtsRef.current = thoughtsRef.current.slice(0, MAX_THOUGHTS);
    setThoughts([...thoughtsRef.current]);
    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (scene === Scene.CHAT) {
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [scene, animate]);

  /* ---------- UI ---------- */

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
              handleInput(inputText, "text");
            }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8"
          >
            <div className="flex items-center gap-4 bg-black/20 border border-white/10 rounded-md px-4 py-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "listening…" : "enter a thought"}
                className="flex-1 bg-transparent text-xs tracking-[0.25em] text-center outline-none"
              />

              <button
                type="button"
                onClick={toggleListening}
                className={`text-sm ${
                  isListening ? "text-emerald-400" : "text-white/40"
                }`}
              >
                🎤
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="text-white/40 hover:text-white"
              >
                ➤
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default App;
