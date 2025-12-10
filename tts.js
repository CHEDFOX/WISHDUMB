const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const voices = {
  buddha: "sage",
  socrates: "thinker",
  nietzsche: "iron",
};

router.post("/", async (req, res) => {
  try {
    const { persona, text } = req.body;

    if (!persona || !text) {
      return res.status(400).json({ error: "Missing persona or text" });
    }

    const voice = voices[persona] || "sage";

    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
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
