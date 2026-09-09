import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRoutineAssistantResponse } from "../lib/ai/routine-assistant";
import type { Subject } from "../types/academic";
import type { AppPreference, Task } from "../types/domain";

const baseSubject: Subject = {
  activities: [
    {
      dueDate: "2026-09-08",
      id: "activity-1",
      status: "not_started",
      subjectId: "redes",
      title: "Lista de roteamento",
      type: "list"
    }
  ],
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

const urgentTask: Task = {
  category: "Faculdade",
  date: "2026-09-08",
  dueDate: "2026-09-08",
  id: "task-1",
  priority: "urgent",
  status: "open",
  title: "Enviar relatorio",
  userId: "local-user"
};

const coachPreference: AppPreference = {
  accentColor: "#0f9f7a",
  appName: "GAB ROUTINE",
  assistantAnswerStyle: "coach",
  defaultClassesQuantity: 2,
  defaultSemester: "2026/1",
  defaultWorkloadHours: 60,
  displayName: "Gabriel",
  enabledModules: {
    assistant: true,
    calendar: true,
    classroom: true,
    reminders: true,
    tasks: true,
    tutorial: true
  },
  id: "preference-1",
  profileLabel: "rotina pessoal",
  userId: "local-user"
};

describe("routine assistant", () => {
  it("answers with today's priority when asked what to do now", () => {
    const response = buildRoutineAssistantResponse({
      events: [],
      question: "O que devo fazer agora?",
      reminders: [],
      subjects: [baseSubject],
      tasks: [urgentTask],
      today: "2026-09-08"
    });

    assert.equal(response.intent, "now");
    assert.match(response.answer, /Lista de roteamento/);
    assert.equal(response.highlights.some((highlight) => highlight.label === "Prioridade alta" && highlight.value === "1"), true);
    assert.equal(response.evidence.some((item) => item.includes("Primeira tarefa calculada: Enviar relatorio")), true);
  });

  it("surfaces attendance risk from registered absences", () => {
    const subject: Subject = {
      ...baseSubject,
      attendance: [
        {
          date: "2026-09-01",
          id: "absence-1",
          quantity: 14,
          status: "absence",
          subjectId: "redes"
        }
      ]
    };

    const response = buildRoutineAssistantResponse({
      events: [],
      question: "Como estao minhas faltas?",
      reminders: [],
      subjects: [subject],
      tasks: [],
      today: "2026-09-08"
    });

    assert.equal(response.intent, "attendance");
    assert.match(response.answer, /Redes de Computadores/);
    assert.equal(response.quickLinks.some((link) => link.href === "/faculdade/redes"), true);
    assert.equal(response.evidence.some((item) => item.includes("14/15 faltas")), true);
  });

  it("uses answer style preferences in the local assistant", () => {
    const response = buildRoutineAssistantResponse({
      appPreference: coachPreference,
      events: [],
      question: "O que esta atrasado?",
      reminders: [],
      subjects: [baseSubject],
      tasks: [urgentTask],
      today: "2026-09-09"
    });

    assert.equal(response.intent, "deadlines");
    assert.match(response.answer, /Meu conselho/);
    assert.equal(response.suggestions.every((suggestion) => suggestion.startsWith("Fazer: ")), true);
    assert.equal(response.highlights.some((highlight) => highlight.label === "Atrasados" && highlight.value === "2"), true);
  });
});
