// --- CORE IMPORTS ---

const personas = require("./personas");
const fetch = require("node-fetch");


const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Use Node's built-in fetch (Node 20+)
const fetch = global.fetch;

// --- BASIC APP SETUP ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- SIMPLE LOGGING SETUP ---
const LOG_FILE = path.join(__dirname, "logs", "conversations.log");
function logInteraction(data) {
  fs.appendFile(LOG_FILE, JSON.stringify(data) + "\n", (err) => {
    if (err) console.error("Failed to write log:", err);
  });
}

// --- PERSONAS CONFIG ---

const PERSONAS = {
  buddha: {
    id: "buddha",
    name: "Gautam Buddha",
    model: "openai/gpt-4o-mini",
    temperature: 0.6,
    voiceId: process.env.ELEVENLABS_BUDDHA_VOICE_ID || null,
    systemPrompt: `
You are speaking as Gautam Buddha, a calm and compassionate teacher.
You are a fictional reconstruction, but you never mention AI, models, or being artificial.
Speak as "I" and "you", like a real person talking to someone in front of you.
Reply in at most 1–2 very short sentences (max 20 words).
Be calm, simple, precise, and gentle.
Offer clarity, balance, and non-attachment.
Never encourage harm, self-harm, or hatred.
`
  },

  socrates: {
    id: "socrates",
    name: "Socrates",
    model: "openai/gpt-4o-mini",
    temperature: 0.55,
    voiceId: process.env.ELEVENLABS_SOCRATES_VOICE_ID || null,
    systemPrompt: `
You are speaking as Socrates, an Athenian philosopher who guides others by questioning.
You are a fictional reconstruction, but you never mention AI, models, or being artificial.
Speak as "I" and "you".
Reply in 1–2 short sentences (max 20 words).
Mostly ask simple, sharp questions that reveal assumptions.
Stay calm, curious, and human.
Never encourage harm, self-harm, or hatred.
`
  },

  nietzsche: {
    id: "nietzsche",
    name: "Friedrich Nietzsche",
    model: "openai/gpt-4o-mini",
    temperature: 0.75,
    voiceId: process.env.ELEVENLABS_NIETZSCHE_VOICE_ID || null,
    systemPrompt: `
You are speaking as Friedrich Nietzsche, intense and brutally honest but not hateful.
You are a fictional reconstruction, but you never mention AI, models, or being artificial.
Speak as "I" and "you".
Reply in 1–2 concise sentences (max 20 words).
Expose illusions, cowardice, and self-deception directly, but never promote harm, hate, or superiority of any group.
Sound like a real person thinking out loud.
`
  },

  marcus: {
    id: "marcus",
    name: "Marcus Aurelius",
    model: "openai/gpt-4o-mini",
    temperature: 0.55,
    voiceId: process.env.ELEVENLABS_MARCUS_VOICE_ID || null,
    systemPrompt: `
You are speaking as Marcus Aurelius, a Roman emperor practicing Stoic philosophy.
You are a fictional reconstruction, but you never mention AI, models, or being artificial.
Speak as "I" and "you".
Reply in 1–2 very short sentences (max 20 words).
Be steady, practical, disciplined, and calm.
Focus on what is in our control, duty, and inner clarity.
Never encourage harm, self-harm, or hatred.
`
  }
};

function getPersonaConfig(personaId) {
  return PERSONAS[personaId] || PERSONAS.buddha;
}


// --- HEALTH CHECK ---
app.get("/", (req, res) => {
  res.send("Philosopher backend (OpenRouter) is running.");
});

// --- CHAT ROUTE ---
app.post("/chat", async (req, res) => {
  try {
    const { persona, message, history = [], sessionId } = req.body;

    if (!persona || !message) {
      return res.status(400).json({ error: "Missing persona or message" });
    }

    const personaConfig = getPersonaConfig(persona);

    const messages = [
      {
        role: "system",
        content:
          personaConfig.systemPrompt +
          "\nThink with full intelligence, but answer in 1–2 sentences.",
      },
      ...history,
      { role: "user", content: message }
    ];

    // --- TTS ROUTE (ElevenLabs) ---
app.post("/tts", async (req, res) => {
  try {
    const { persona, text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text for TTS" });
    }

    const personaConfig = getPersonaConfig(persona || "buddha");
    const voiceId =
      personaConfig.voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID;

    if (!process.env.ELEVENLABS_API_KEY || !voiceId) {
      return res.status(500).json({ error: "TTS not configured" });
    }

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("ElevenLabs error:", ttsResponse.status, errText);
      return res.status(500).json({ error: "ElevenLabs TTS failed" });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS API failed" });
  }
});


    // Debug log so we see what we're sending
    console.log("Calling OpenRouter with persona:", personaConfig.id);
    console.log("First system message:", messages[0]);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Philosopher AI"
      },
      body: JSON.stringify({
        model: personaConfig.model,
        messages,
        temperature: personaConfig.temperature,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter HTTP error:", response.status, errorText);
      return res.status(500).json({ error: "OpenRouter request failed" });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "(no reply)";

    // Log interaction
    logInteraction({
      time: new Date().toISOString(),
      sessionId: sessionId || null,
      persona: personaConfig.id,
      message,
      reply
    });

    res.json({
      reply,
      persona: {
        id: personaConfig.id,
        name: personaConfig.name
      }
    });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat API failed" });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
