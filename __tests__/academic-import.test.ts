import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyAcademicImport } from "../lib/academic-import/merge";
import { parseAcademicImportResponse } from "../lib/academic-import/extractor";
import type { RoutineData } from "../features/data/seed";
import type { Subject } from "../types/academic";
import type { AcademicImportResult } from "../types/academic-import";

describe("academic document import", () => {
  it("creates subjects, schedules and course progress metadata atomically", () => {
    const data = buildData();
    const result = buildResult();
    let nextId = 0;
    const imported = applyAcademicImport(data, result, { idFactory: (prefix) => `${prefix}-${++nextId}` });

    assert.equal(imported.summary.created, 2);
    assert.equal(imported.summary.updated, 0);
    assert.equal(imported.summary.schedulesAdded, 1);
    assert.equal(imported.data.subjects.length, 2);
    assert.equal(imported.data.appPreference.courseOrArea, "Engenharia de Software");
    assert.equal(imported.data.appPreference.courseTotalWorkloadHours, 3200);
    assert.equal(imported.data.tasks.find((task) => task.id === "configurar-curso")?.status, "done");
    assert.equal(imported.data.tasks.find((task) => task.id === "cadastrar-disciplinas")?.status, "done");
  });

  it("updates a matching subject without losing grades, attendance or completed status", () => {
    const existing = buildSubject("algoritmos", "completed");
    existing.code = "COMP101";
    existing.grades = [{ id: "grade-1", maxScore: 10, name: "Prova", score: 9, subjectId: existing.id }];
    existing.attendance = [{ date: "2026-09-01", id: "attendance-1", quantity: 2, status: "present", subjectId: existing.id }];
    const data = buildData([existing]);
    const result = buildResult();
    result.subjects = [
      {
        ...result.subjects[0],
        code: "comp-101",
        professor: "Profa. Ada",
        status: "active"
      }
    ];
    const imported = applyAcademicImport(data, result, { idFactory: (prefix) => `${prefix}-new` });
    const subject = imported.data.subjects[0];

    assert.equal(imported.summary.created, 0);
    assert.equal(imported.summary.updated, 1);
    assert.equal(subject.status, "completed");
    assert.equal(subject.professor, "Profa. Ada");
    assert.equal(subject.grades.length, 1);
    assert.equal(subject.attendance.length, 1);
    assert.equal(subject.schedules.length, 1);
  });

  it("does not duplicate subjects or weekly schedules when the same document is applied twice", () => {
    const result = buildResult();
    result.subjects = [result.subjects[0]];
    let nextId = 0;
    const first = applyAcademicImport(buildData(), result, { idFactory: (prefix) => `${prefix}-${++nextId}` });
    const second = applyAcademicImport(first.data, result, { idFactory: (prefix) => `${prefix}-${++nextId}` });

    assert.equal(second.data.subjects.length, 1);
    assert.equal(second.data.subjects[0].schedules.length, 1);
    assert.equal(second.summary.created, 0);
    assert.equal(second.summary.updated, 1);
    assert.equal(second.summary.schedulesAdded, 0);
  });

  it("normalizes structured AI output before it reaches the review screen", () => {
    const raw = buildResult();
    raw.subjects[0].schedules[0].startTime = "8h00";
    raw.subjects[0].schedules[0].endTime = "99:00";
    raw.subjects[0].confidence = 1.4;
    raw.course.currentPeriod = 2.7;

    const parsed = parseAcademicImportResponse(JSON.stringify(raw));

    assert.equal(parsed.subjects[0].schedules[0].startTime, "08:00");
    assert.equal(parsed.subjects[0].schedules[0].endTime, "");
    assert.equal(parsed.subjects[0].confidence, 1);
    assert.equal(parsed.course.currentPeriod, 3);
  });
});

function buildData(subjects: Subject[] = []): RoutineData {
  return {
    appPreference: {
      accentColor: "#0f9f7a",
      appName: "Gavium",
      assistantAnswerStyle: "balanced",
      birthDate: "",
      contextDetails: "",
      contexts: ["faculdade", "trabalho"],
      courseInstitution: "",
      courseOrArea: "",
      courseTotalSemesters: 10,
      courseTotalWorkloadHours: 0,
      currentCurriculumPeriod: 1,
      defaultClassesQuantity: 2,
      defaultSemester: "Atual",
      defaultWorkloadHours: 60,
      discoverySource: "",
      displayName: "Teste",
      enabledModules: {
        assistant: true,
        calendar: true,
        classroom: true,
        reminders: true,
        tasks: true,
        tutorial: true
      },
      gender: "",
      id: "preferences",
      primaryContext: "faculdade",
      productivityGoal: "",
      profileLabel: "faculdade e trabalho",
      userId: "user-1"
    },
    events: [],
    notificationPreference: {
      dailySummaryTime: "07:00",
      id: "notifications",
      quietHoursEnd: "07:00",
      quietHoursStart: "23:00",
      tomorrowPlanningTime: "21:30",
      userId: "user-1"
    },
    reminders: [],
    subjects,
    tasks: [
      { id: "configurar-curso", priority: "high", status: "open", title: "Configurar curso", userId: "user-1" },
      { id: "cadastrar-disciplinas", priority: "high", status: "open", title: "Cadastrar disciplinas", userId: "user-1" }
    ],
    userId: "user-1",
    version: 4
  };
}

function buildSubject(id: string, status: Subject["status"]): Subject {
  return {
    activities: [],
    attendance: [],
    color: "#0f9f7a",
    grades: [],
    id,
    name: "Algoritmos",
    resources: [],
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
    semester: "1o periodo",
    status,
    workloadHours: 60
  };
}

function buildResult(): AcademicImportResult {
  return {
    course: {
      courseName: "Engenharia de Software",
      currentPeriod: 2,
      institution: "Universidade Teste",
      totalPeriods: 8,
      totalWorkloadHours: 3200
    },
    documentTitle: "Historico e horario",
    documentType: "transcript",
    subjects: [
      {
        code: "COMP101",
        confidence: 0.96,
        name: "Algoritmos",
        notes: "",
        professor: "",
        recommendedPeriod: 1,
        room: "Lab 1",
        schedules: [{ classesQuantity: 2, endTime: "10:00", startTime: "08:00", weekday: "monday" }],
        semester: "2026/1",
        status: "active",
        workloadHours: 60
      },
      {
        code: "MAT100",
        confidence: 0.9,
        name: "Calculo I",
        notes: "Aprovada",
        professor: "",
        recommendedPeriod: 1,
        room: "",
        schedules: [],
        semester: "2025/1",
        status: "completed",
        workloadHours: 90
      }
    ],
    summary: "Duas disciplinas reconhecidas.",
    warnings: []
  };
}
