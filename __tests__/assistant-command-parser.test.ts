import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAssistantCommandProposal } from "../lib/ai/command-parser";
import type { Subject } from "../types/academic";

const subject: Subject = {
  activities: [],
  attendance: [],
  color: "#0f9f7a",
  grades: [],
  id: "redes",
  name: "Redes de Computadores",
  rules: {
    classesPerMeeting: 2,
    directApprovalGrade: 8,
    finalGradeFormula: "ufam-mf",
    gradingMethod: "simple",
    minimumAttendance: 75,
    minimumFinalGrade: 5,
    totalExpectedClasses: 60
  },
  schedules: [],
  semester: "2026.1",
  status: "active",
  workloadHours: 60
};

describe("assistant command parser", () => {
  it("proposes an absence record from natural language", () => {
    const proposal = buildAssistantCommandProposal({
      question: "registre 2 faltas em redes ontem",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "register_absence");
    assert.equal(proposal?.summary, "2 faltas em Redes de Computadores no dia 09/09");
    assert.equal(proposal?.warnings.length, 0);
  });

  it("proposes a grade record with a default max score", () => {
    const proposal = buildAssistantCommandProposal({
      question: "adicione nota 8,5 da prova em redes",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "add_grade");
    assert.equal(proposal?.summary, "Prova em Redes de Computadores: 8,5/10");
    assert.equal(proposal?.warnings.includes("Nao encontrei nota maxima, entao vou usar 10."), true);
  });

  it("proposes an academic activity with a future due date", () => {
    const proposal = buildAssistantCommandProposal({
      question: "crie prova de redes dia 20",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "add_activity");
    assert.equal(proposal?.summary, "Prova em Redes de Computadores para 20/09");
  });

  it("understands direct academic commands without a create verb", () => {
    const proposal = buildAssistantCommandProposal({
      question: "prova de redes amanha",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "add_activity");
    assert.equal(proposal?.summary, "Prova em Redes de Computadores para 11/09");
  });

  it("proposes a task with priority and date", () => {
    const proposal = buildAssistantCommandProposal({
      question: "crie tarefa comprar livro amanha urgente",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "add_task");
    assert.equal(proposal?.summary, "Comprar livro para 11/09");
    assert.equal(proposal?.warnings.length, 0);
  });

  it("turns a short dated phrase into a task when it is not academic data", () => {
    const proposal = buildAssistantCommandProposal({
      question: "comprar pilha amanha",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "add_task");
    assert.equal(proposal?.summary, "Comprar pilha para 11/09");
  });

  it("cleans natural personal reminders before saving the task title", () => {
    const proposal = buildAssistantCommandProposal({
      question: "tenho dentista sexta",
      subjects: [subject],
      today: "2026-09-10"
    });

    assert.equal(proposal?.intent, "add_task");
    assert.equal(proposal?.summary, "Dentista para 11/09");
  });
});
