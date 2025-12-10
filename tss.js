const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const voices = {
  buddha: "sage",      // calm
  socrates: "thinker", // questioning
  nietzsche: "iron",   // intense
};

router.post("/", async (req, res) => {
  try {
    const { persona, text } = req.body;

    if (!text || !persona) {
      return res.status(400).json({ error: "Missing text/persona" });
    }

    const voice = voices[persona] || "sage";

    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    res.set("Content-Type", "audio/mpeg");
    res.send(audioBuffer);

  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

module.exports = router;
