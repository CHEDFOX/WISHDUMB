import { KEYS } from "../config/keys";

export async function speakThought(text: string) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${KEYS.ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": KEYS.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.7,
        },
      }),
    }
  );

  const audioBlob = await res.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.play();
}
