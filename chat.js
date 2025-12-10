app.post("/chat", async (req, res) => {
  try {
    const { persona = "buddha", message = "", history = [] } = req.body;

    const systemPrompt = personas[persona] || personas.buddha;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://wishdumb.chadox.xyz", // or your domain
      },
      body: JSON.stringify({
        model: "gpt-4.1", // or your chosen model via OpenRouter
        messages,
        max_tokens: 220,
        temperature:
          persona === "nietzsche" ? 0.95 :
          persona === "socrates"  ? 0.55 :
                                    0.50,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "…";

    res.json({
      reply,
      persona: { id: persona },
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat API failed" });
  }
});

// === ElevenLabs TTS: generate voice for a reply ===
app.post("/voice", async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    const usedVoiceId = voiceId || "EXAVITQu4vr4xnSDxMaL"; // default voice ID, replace with your own

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${usedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2", // common TTS model
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", errText);
      return res.status(500).json({ error: "TTS failed" });
    }

    const audioBuffer = await response.arrayBuffer();

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength,
    });

    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("TTS route error:", err);
    res.status(500).json({ error: "TTS route crashed" });
  }
});
