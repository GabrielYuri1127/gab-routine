import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AIProviderError,
  FailoverAIProvider,
  GeminiGenerateContentProvider,
  OpenAIResponsesProvider,
  getConfiguredAIProvider,
  type AIProvider
} from "../lib/ai/provider";

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

describe("Gemini GenerateContent provider", () => {
  it("converts instructions, PDF data and structured output safely", async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> | null = null;
    let requestHeaders: HeadersInit | undefined;
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requestHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "{\"answer\":\"ok\"}" }] } }],
          modelVersion: "gemini-test"
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    };

    try {
      const provider = new GeminiGenerateContentProvider("gemini-key", "gemini-test", "https://example.test/v1beta");
      const result = await provider.complete({
        messages: [
          { content: "system rules", role: "system" },
          {
            content: [
              { text: "read this", type: "input_text" },
              { file_data: "data:application/pdf;base64,AA==", filename: "grade.pdf", type: "input_file" }
            ],
            role: "user"
          }
        ],
        responseFormat: {
          name: "test",
          schema: {
            additionalProperties: false,
            properties: { answer: { maxLength: 20, type: "string" } },
            required: ["answer"],
            type: "object"
          },
          type: "json_schema"
        }
      });

      const body = requestBody as {
        contents?: Array<{ parts?: unknown[] }>;
        generationConfig?: { responseJsonSchema?: Record<string, unknown>; responseMimeType?: string };
        systemInstruction?: { parts?: Array<{ text?: string }> };
      } | null;
      const headers = new Headers(requestHeaders);
      assert.equal(result.provider, "gemini");
      assert.equal(result.model, "gemini-test");
      assert.equal(headers.get("x-goog-api-key"), "gemini-key");
      assert.equal(body?.systemInstruction?.parts?.[0]?.text, "system rules");
      assert.deepEqual(body?.contents?.[0]?.parts, [
        { text: "read this" },
        { inlineData: { data: "AA==", mimeType: "application/pdf" } }
      ]);
      assert.equal(body?.generationConfig?.responseMimeType, "application/json");
      assert.deepEqual(body?.generationConfig?.responseJsonSchema, {
        properties: { answer: { type: "string" } },
        required: ["answer"],
        type: "object"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("migrates the former default to the current stable Flash-Lite model", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = async (input) => {
      requestedUrls.push(String(input));
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "ok" }] } }],
          modelVersion: "gemini-3.5-flash-lite"
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    };

    try {
      const provider = new GeminiGenerateContentProvider(
        "gemini-key",
        "models/gemini-2.5-flash-lite",
        "https://example.test/v1beta"
      );
      const result = await provider.complete({ messages: [{ content: "hello", role: "user" }] });

      assert.equal(result.model, "gemini-3.5-flash-lite");
      assert.match(requestedUrls[0] ?? "", /models\/gemini-3\.5-flash-lite:generateContent$/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("discovers a compatible model and reuses it when the configured model is unavailable", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.endsWith("/models/gemini-unavailable:generateContent")) {
        return new Response(JSON.stringify({ error: { message: "model not found", status: "NOT_FOUND" } }), {
          headers: { "Content-Type": "application/json" },
          status: 404
        });
      }
      if (url.endsWith("/models?pageSize=1000")) {
        return new Response(
          JSON.stringify({
            models: [
              {
                baseModelId: "text-embedding-004",
                name: "models/text-embedding-004",
                supportedGenerationMethods: ["embedContent"]
              },
              {
                baseModelId: "gemini-3.5-flash-lite",
                name: "models/gemini-3.5-flash-lite",
                supportedGenerationMethods: ["generateContent"]
              }
            ]
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }
      if (url.endsWith("/models/gemini-3.5-flash-lite:generateContent")) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "online" }] } }],
            modelVersion: "gemini-3.5-flash-lite"
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      const provider = new GeminiGenerateContentProvider(
        "gemini-key",
        "gemini-unavailable",
        "https://example.test/v1beta"
      );
      const first = await provider.complete({ messages: [{ content: "hello", role: "user" }] });
      const second = await provider.complete({ messages: [{ content: "again", role: "user" }] });

      assert.equal(first.model, "gemini-3.5-flash-lite");
      assert.equal(second.model, "gemini-3.5-flash-lite");
      assert.equal(requestedUrls.filter((url) => url.includes("gemini-unavailable")).length, 1);
      assert.equal(requestedUrls.filter((url) => url.endsWith("/models?pageSize=1000")).length, 1);
      assert.equal(requestedUrls.filter((url) => url.includes("gemini-3.5-flash-lite")).length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("classifies free-tier exhaustion as a temporary limit", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }), {
        headers: { "Content-Type": "application/json" },
        status: 429
      });

    try {
      const provider = new GeminiGenerateContentProvider("gemini-key", "gemini-test", "https://example.test/v1beta");
      await assert.rejects(
        provider.complete({ messages: [{ content: "hello", role: "user" }] }),
        (error) => error instanceof AIProviderError && error.code === "rate_limited"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("AI provider failover", () => {
  it("uses Gemini when OpenAI has no credits", async () => {
    const calls: string[] = [];
    const openAI: AIProvider = {
      name: "openai",
      async complete() {
        calls.push("openai");
        throw new AIProviderError("insufficient_quota", 429);
      }
    };
    const gemini: AIProvider = {
      name: "gemini",
      async complete() {
        calls.push("gemini");
        return { content: "ok", model: "gemini-test", provider: "gemini" };
      }
    };
    const provider = new FailoverAIProvider([openAI, gemini]);

    const result = await provider.complete({ messages: [{ content: "hello", role: "user" }] });

    assert.deepEqual(calls, ["openai", "gemini"]);
    assert.equal(result.provider, "gemini");
  });

  it("builds automatic failover from server environment variables", () => {
    const provider = getConfiguredAIProvider({
      AI_PROVIDER: "auto",
      GEMINI_API_KEY: "gemini-key",
      OPENAI_API_KEY: "openai-key"
    });

    assert.equal(provider.name, "auto");
  });

  it("uses Gemini first in automatic economy mode", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("api.openai.com")) {
        throw new Error("OpenAI should not run before Gemini in automatic mode");
      }

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "online" }] } }],
          modelVersion: "gemini-3.5-flash-lite"
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    };

    try {
      const provider = getConfiguredAIProvider({
        AI_PROVIDER: "auto",
        GEMINI_API_KEY: "gemini-key",
        OPENAI_API_KEY: "openai-key"
      });
      const result = await provider.complete({ messages: [{ content: "hello", role: "user" }] });

      assert.equal(result.provider, "gemini");
      assert.match(requestedUrls[0] ?? "", /generativelanguage\.googleapis\.com/);
      assert.equal(requestedUrls.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("detects a Gemini key even when AI_PROVIDER is omitted", () => {
    const provider = getConfiguredAIProvider({
      GEMINI_API_KEY: "gemini-key"
    });

    assert.equal(provider.name, "gemini");
  });
});
