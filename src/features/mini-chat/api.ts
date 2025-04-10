import type { MiniChatMessage } from "./model";

// Placeholder API call to assistant model
export async function fetchMiniChatResponse(
  messages: MiniChatMessage[],
  model: string,
  apiKey: string
): Promise<MiniChatMessage> {
  if (!apiKey) {
    throw new Error("Missing OpenRouter API key");
  }

  const payload = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Mini chat API error: ${response.status}`);
  }

  const data = await response.json();

  const reply = data.choices?.[0]?.message?.content ?? "No response";

  return {
    role: "assistant",
    content: reply,
    id: crypto.randomUUID(),
  };
}
