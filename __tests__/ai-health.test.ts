import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { probeAIProvider } from "../lib/ai/health";
import { AIProviderError, type AIProvider } from "../lib/ai/provider";

describe("AI health probe", () => {
  it("marks the configured model ready only after a real completion", async () => {
    const provider: AIProvider = {
      name: "openai",
      async complete() {
        return { content: JSON.stringify({ ok: true }), model: "gpt-test" };
      }
    };

    const result = await probeAIProvider(provider);

    assert.equal(result.available, true);
    assert.equal(result.code, "ready");
    assert.equal(result.model, "gpt-test");
  });

  it("returns a safe actionable reason when the key is rejected", async () => {
    const provider: AIProvider = {
      name: "openai",
      async complete() {
        throw new AIProviderError("invalid_api_key", 401);
      }
    };

    const result = await probeAIProvider(provider);

    assert.equal(result.available, false);
    assert.equal(result.code, "invalid_api_key");
    assert.match(result.detail, /AI_API_KEY/);
  });
});
