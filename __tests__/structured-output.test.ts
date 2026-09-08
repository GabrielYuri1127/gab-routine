import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseAIIntent } from "../lib/ai/structured-output";

describe("AI structured output", () => {
  it("accepts a valid register absence intent", () => {
    const intent = parseAIIntent(
      JSON.stringify({
        intent: "register_absence",
        subjectId: "redes-de-computadores",
        quantity: 2,
        date: "2026-08-31",
        confidence: 0.95
      })
    );

    assert.equal(intent.intent, "register_absence");
    assert.equal(intent.quantity, 2);
  });

  it("rejects unsafe or malformed structured output", () => {
    assert.throws(() =>
      parseAIIntent(
        JSON.stringify({
          intent: "delete_subject",
          subjectId: "redes-de-computadores",
          confidence: 0.9
        })
      )
    );
  });
});
