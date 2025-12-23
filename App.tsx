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

const CENTER_RADIUS = 160;

const App: React.FC = () => {
  const [scene, setScene] = useState(Scene.LANDING);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const thoughtsRef = useRef<Thought[]>([]);
  const frameRef = useRef<number>();
  const recognitionRef = useRef<any>(null);

  // ---------- SPEECH ----------

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

  // ---------- HELPERS ----------

  const center = () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2 - 40,
  });

  const randomDirection = (speed: number) => {
    const a = Math.random() * Math.PI * 2;
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  };

  const outsideCenter = (x: number, y: number) => {
    const c = center();
    const dx = x - c.x;
    const dy = y - c.y;
    return Math.sqrt(dx * dx + dy * dy) > CENTER_RADIUS;
  };

  // ---------- SPAWN ----------

  const spawnQuestion = (text: string): Thought => {
    const c = center();
    const v = randomDirection(4.8);

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
      vx: 0,
      vy: 0,
      createdAt: Date.now(),
      opacity: 0.9,
      scale: 1,
      centered: true,
    };
  };

  // ---------- INPUT ----------

  const handleInput = async (
    text: string,
    mode: "text" | "voice"
  ) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    // QUESTION exits screen
    thoughtsRef.current.unshift(spawnQuestion(text));

    // OLD CENTERED RESPONSE → PUSH TO PERIPHERY
    thoughtsRef.current = thoughtsRef.current.map((t) => {
      if (t.kind === "response" && t.centered) {
        const v = randomDirection(1.2);
        return { ...t, centered: false, vx: v.vx, vy: v.vy };
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

  // ---------- ANIMATION ----------

  const animate = useCallback(() => {
    const now = Date.now();
    const c = center();

    thoughtsRef.current = thoughtsRef.current.filter((t) => {
      t.x += t.vx;
      t.y += t.vy;

      if (t.kind === "question") {
        t.opacity -= 0.035;
      }

      if (t.kind === "response" && !t.centered) {
        // repel from center
        const dx = t.x - c.x;
        const dy = t.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < CENTER_RADIUS) {
          t.vx += (dx / dist) * 0.15;
          t.vy += (dy / dist) * 0.15;
        }

        // gentle wandering
        t.vx += (Math.random() - 0.5) * 0.01;
        t.vy += (Math.random() - 0.5) * 0.01;

        // age fade
        const age = now - t.createdAt;
        t.opacity = Math.max(0.4, 0.85 - age / 160000);
      }

      const off =
        t.x < -300 ||
        t.x > window.innerWidth + 300 ||
        t.y < -300 ||
        t.y > window.innerHeight + 300;

      return t.kind === "question" ? t.opacity > 0 && !off : true;
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
