import { Tool } from "@tinyfish/mcp-server";

export const scrape: Tool = {
  name: "tinyfish.scrape",
  description: "Scrape a URL using the TinyFish API.",
  inputs: {
    url: {
      type: "string",
      required: true,
      description: "The URL to scrape.",
    },
    goal: {
      type: "string",
      required: true,
      description: "A natural language description of the data to be extracted.",
    },
  },
  handler: async (inputs, { stream }) => {
    const { url, goal } = inputs;

    const apiKey = process.env.MINO_API_KEY;
    if (!apiKey) {
      throw new Error("MINO_API_KEY not configured");
    }

    const minoResponse = await fetch("https://mino.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: "lite",
      }),
    });

    if (!minoResponse.ok) {
      throw new Error(`Mino API returned ${minoResponse.status}`);
    }

    const reader = minoResponse.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6));
            stream.write(event);
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
  },
};