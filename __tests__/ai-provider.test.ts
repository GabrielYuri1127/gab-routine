import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OpenAIResponsesProvider } from "../lib/ai/provider";

describe("OpenAI Responses provider", () => {
  it("sends privacy, safety and cache fields without forcing temperature", async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> | null = null;
    const fakeFetch: typeof fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ model: "gpt-test", output_text: "{\"answer\":\"ok\"}" }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    };
    globalThis.fetch = fakeFetch;

    try {
      const provider = new OpenAIResponsesProvider("test-key", "gpt-test", "https://example.test/v1");
      const result = await provider.complete({
        messages: [
          { content: "system rules", role: "system" },
          { content: "hello", role: "user" }
        ],
        promptCacheKey: "cache-user",
        safetyIdentifier: "safe-user"
      });

      const body = requestBody as Record<string, unknown> | null;
      assert.ok(body);
      assert.equal(result.model, "gpt-test");
      assert.equal(body.store, false);
      assert.equal(body.prompt_cache_key, "cache-user");
      assert.equal(body.safety_identifier, "safe-user");
      assert.equal(Object.hasOwn(body, "temperature"), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
