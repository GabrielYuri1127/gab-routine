import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AIProviderError, OpenAIResponsesProvider } from "../lib/ai/provider";

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

  it("keeps file and image input parts in multimodal requests", async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> | null = null;
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ model: "gpt-test", output_text: "{}" }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    };

    try {
      const provider = new OpenAIResponsesProvider("test-key", "gpt-test", "https://example.test/v1");
      await provider.complete({
        messages: [
          { content: "extract safely", role: "system" },
          {
            content: [
              { text: "read this", type: "input_text" },
              { file_data: "data:application/pdf;base64,AA==", filename: "grade.pdf", type: "input_file" }
            ],
            role: "user"
          }
        ],
        timeoutMs: 75_000
      });

      const body = requestBody as { input?: Array<{ content?: unknown }> } | null;
      assert.ok(body?.input);
      assert.deepEqual(body.input[0]?.content, [
        { text: "read this", type: "input_text" },
        { file_data: "data:application/pdf;base64,AA==", filename: "grade.pdf", type: "input_file" }
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("classifies a rejected key without exposing the provider response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { code: "invalid_api_key", message: "secret detail" } }), {
        headers: { "Content-Type": "application/json" },
        status: 401
      });

    try {
      const provider = new OpenAIResponsesProvider("bad-key", "gpt-test", "https://example.test/v1");
      await assert.rejects(
        provider.complete({ messages: [{ content: "hello", role: "user" }] }),
        (error) => error instanceof AIProviderError && error.code === "invalid_api_key" && !error.message.includes("secret detail")
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("distinguishes missing credits from a temporary rate limit", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { code: "insufficient_quota" } }), {
        headers: { "Content-Type": "application/json" },
        status: 429
      });

    try {
      const provider = new OpenAIResponsesProvider("test-key", "gpt-test", "https://example.test/v1");
      await assert.rejects(
        provider.complete({ messages: [{ content: "hello", role: "user" }] }),
        (error) => error instanceof AIProviderError && error.code === "insufficient_quota"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
