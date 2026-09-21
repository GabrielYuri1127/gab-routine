import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldUseLocalAssistant } from "../lib/ai/economy";
import type { RoutineAssistantResponse } from "../lib/ai/routine-assistant";

function response(intent: RoutineAssistantResponse["intent"]): RoutineAssistantResponse {
  return {
    answer: "Resposta calculada",
    dataGaps: [],
    evidence: [],
    highlights: [],
    intent,
    quickLinks: [],
    suggestions: ["Continuar"]
  };
}

describe("AI economy routing", () => {
  it("keeps calculated academic questions local", () => {
    assert.equal(shouldUseLocalAssistant("Como estao minhas faltas?", response("attendance")), true);
    assert.equal(shouldUseLocalAssistant("Qual e meu progresso no curso?", response("course_progress")), true);
  });

  it("uses online AI for open-ended planning", () => {
    assert.equal(shouldUseLocalAssistant("Monte um plano de estudos personalizado", response("summary")), false);
    assert.equal(shouldUseLocalAssistant("Como posso estudar melhor para a prova?", response("summary")), false);
  });

  it("honors an explicit request for online AI", () => {
    assert.equal(shouldUseLocalAssistant("Use a IA online para analisar minhas faltas", response("attendance")), false);
  });
});
