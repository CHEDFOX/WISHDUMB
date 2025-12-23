import { KEYS } from "../config/keys";
import { PERSONALITY } from "../config/personality";

export async function generateThought(userInput: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEYS.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Aether",
    },
    body: JSON.stringify({
      model: KEYS.OPENROUTER_MODEL,
      messages: [
        { role: "system", content: PERSONALITY.systemPrompt },
        { role: "user", content: userInput }
      ],
      temperature: PERSONALITY.generation.temperature,
      max_tokens: PERSONALITY.generation.maxTokens,
      top_p: PERSONALITY.generation.topP,
    }),
  });

  if (!res.ok) {
    throw new Error("OpenRouter request failed");
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
