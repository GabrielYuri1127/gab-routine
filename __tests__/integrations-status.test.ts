import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildIntegrationStatus } from "../lib/integrations/status";

describe("integration status", () => {
  it("reports only operational services without exposing secrets", () => {
    const report = buildIntegrationStatus(
      {
        AI_API_KEY: "secret",
        AI_MODEL: "gpt-5",
        AI_PROVIDER: "openai",
        GOOGLE_CLASSROOM_CLIENT_ID: "123456789012-classroomclient.apps.googleusercontent.com",
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
    const future = report.items.filter((item) => String(item.category) === "futuro");

    assert.equal(ai?.state, "ready");
    assert.match(ai?.detail ?? "", /IA online configurada/);
    assert.match(ai?.detail ?? "", /verificacao real/);
    assert.equal(classroom?.state, "ready");
    assert.equal(push?.state, "needs_setup");
    assert.equal(future.length, 0);
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

  it("reports Gemini with OpenAI fallback when both keys are configured", () => {
    const report = buildIntegrationStatus({
      AI_PROVIDER: "auto",
      GEMINI_API_KEY: "gemini-secret",
      OPENAI_API_KEY: "openai-secret"
    });
    const ai = report.items.find((item) => item.id === "ai");

    assert.equal(ai?.state, "ready");
    assert.match(ai?.detail ?? "", /Gemini/);
    assert.match(ai?.detail ?? "", /contingencia automatica/);
    assert.equal(JSON.stringify(report).includes("openai-secret"), false);
    assert.equal(JSON.stringify(report).includes("gemini-secret"), false);
  });

  it("requires secure Supabase storage for persistent Classroom sync", () => {
    const report = buildIntegrationStatus({
      GOOGLE_CLASSROOM_CLIENT_ID: "123456789012-classroomclient.apps.googleusercontent.com",
      GOOGLE_CLASSROOM_CLIENT_SECRET: "classroom-secret"
    });
    const classroom = report.items.find((item) => item.id === "classroom");

    assert.equal(classroom?.state, "needs_setup");
    assert.equal(classroom?.missing.includes("SUPABASE_SECRET_KEY"), true);
    assert.equal(JSON.stringify(report).includes("classroom-secret"), false);
  });
});
