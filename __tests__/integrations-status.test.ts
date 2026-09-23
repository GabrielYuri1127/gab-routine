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
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SECRET_KEY: "server-key",
        VERCEL: "1"
      },
      "https://gab-routine.vercel.app/configuracoes"
    );

    const ai = report.items.find((item) => item.id === "ai");
    const classroom = report.items.find((item) => item.id === "classroom");
    const push = report.items.find((item) => item.id === "push");
    const future = report.items.filter((item) => item.category === "futuro");

    assert.equal(ai?.state, "ready");
    assert.match(ai?.detail ?? "", /configurada/);
    assert.match(ai?.detail ?? "", /todas as perguntas/);
    assert.doesNotMatch(ai?.detail ?? "", /ativa/);
    assert.equal(classroom?.state, "ready");
    assert.equal(push?.state, "needs_setup");
    assert.equal(future.length > 0, true);
    assert.equal(JSON.stringify(report).includes("secret"), false);
  });

  it("marks cloud sync as required for sharing with multiple users", () => {
    const report = buildIntegrationStatus({}, "http://localhost:3000/configuracoes");
    const supabase = report.items.find((item) => item.id === "supabase");
    const ai = report.items.find((item) => item.id === "ai");
    const push = report.items.find((item) => item.id === "push");

    assert.equal(supabase?.state, "needs_setup");
    assert.equal(supabase?.missing.includes("NEXT_PUBLIC_SUPABASE_URL"), true);
    assert.equal(ai?.state, "needs_setup");
    assert.equal(ai?.missing.some((item) => item.includes("AI_API_KEY")), true);
    assert.equal(push?.state, "needs_setup");
    assert.equal(push?.missing.includes("CRON_SECRET"), true);
  });

  it("reports OpenAI with Gemini fallback when both keys are configured", () => {
    const report = buildIntegrationStatus({
      AI_PROVIDER: "auto",
      GEMINI_API_KEY: "gemini-secret",
      OPENAI_API_KEY: "openai-secret"
    });
    const ai = report.items.find((item) => item.id === "ai");

    assert.equal(ai?.state, "ready");
    assert.match(ai?.detail ?? "", /contingencia automatica/);
    assert.equal(JSON.stringify(report).includes("openai-secret"), false);
    assert.equal(JSON.stringify(report).includes("gemini-secret"), false);
  });

  it("requires secure Supabase storage for persistent Classroom sync", () => {
    const report = buildIntegrationStatus({
      GOOGLE_CLASSROOM_CLIENT_ID: "classroom-client",
      GOOGLE_CLASSROOM_CLIENT_SECRET: "classroom-secret"
    });
    const classroom = report.items.find((item) => item.id === "classroom");

    assert.equal(classroom?.state, "needs_setup");
    assert.equal(classroom?.missing.includes("SUPABASE_SECRET_KEY"), true);
    assert.equal(JSON.stringify(report).includes("classroom-secret"), false);
  });
});
