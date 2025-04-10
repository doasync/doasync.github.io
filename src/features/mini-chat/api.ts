export interface AssistantRequest {
  message: string;
  model?: string;
  apiKey: string;
}

export async function sendAssistantMessage({
  message,
  model,
  apiKey,
}: AssistantRequest): Promise<string> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model ?? "mistralai/mixtral-8x7b-instruct",
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply === "string") {
      return reply.trim();
    } else {
      throw new Error("Malformed OpenRouter response");
    }
  } catch (error) {
    console.error("OpenRouter API error", error);
    return "Sorry, there was an error processing your request.";
  }
}
