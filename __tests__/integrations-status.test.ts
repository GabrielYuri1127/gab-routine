import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildIntegrationStatus } from "../lib/integrations/status";

describe("integration status", () => {
  it("separates ready, missing and future items without exposing secrets", () => {
    const report = buildIntegrationStatus(
      {
        AI_API_KEY: "secret",
        AI_MODEL: "gpt-5",
        AI_PROVIDER: "openai",
        GOOGLE_CLASSROOM_CLIENT_ID: "classroom-client",
        GOOGLE_CLASSROOM_CLIENT_SECRET: "classroom-secret",
        VERCEL: "1"
      },
      "https://gab-routine.vercel.app/configuracoes"
    );

    const ai = report.items.find((item) => item.id === "ai");
    const classroom = report.items.find((item) => item.id === "classroom");
    const future = report.items.filter((item) => item.category === "futuro");

    assert.equal(ai?.state, "ready");
    assert.equal(classroom?.state, "ready");
    assert.equal(future.length > 0, true);
    assert.equal(JSON.stringify(report).includes("secret"), false);
  });

  it("marks cloud sync as optional while local storage is enough", () => {
    const report = buildIntegrationStatus({}, "http://localhost:3000/configuracoes");
    const supabase = report.items.find((item) => item.id === "supabase");
    const ai = report.items.find((item) => item.id === "ai");

    assert.equal(supabase?.state, "optional");
    assert.equal(ai?.state, "needs_setup");
    assert.equal(ai?.missing.includes("AI_API_KEY"), true);
  });
});
