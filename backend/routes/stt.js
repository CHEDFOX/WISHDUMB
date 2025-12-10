const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });

    const transcript = await client.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
      file: {
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
      }
    });

    res.json({ text: transcript.text });

  } catch (err) {
    console.error("STT error:", err);
    res.status(500).json({ error: "STT failed" });
  }
});

module.exports = router;
