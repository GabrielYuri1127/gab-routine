import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RoutineData } from "../features/data/seed";
import { mergeClassroomPayload } from "../lib/classroom/import-routine";
import type { ClassroomImportPayload } from "../types/classroom";

describe("Classroom routine import", () => {
  it("keeps accounts separate and persists each deadline as an activity and reminder", () => {
    let nextId = 0;
    const idFactory = (prefix: string) => `${prefix}-${++nextId}`;
    const first = mergeClassroomPayload(buildData(), buildPayload("account-a", "aluna.a@example.edu"), { idFactory });
    const firstSubject = first.data.subjects[0];
    const firstActivity = firstSubject.activities[0];
    const firstReminder = first.data.reminders[0];

    assert.equal(first.summary.subjects, 1);
    assert.equal(first.summary.activities, 1);
    assert.equal(first.summary.reminders, 1);
    assert.equal(firstActivity.dueDate, "2026-09-25");
    assert.equal(firstActivity.time, "23:30");
    assert.equal(firstReminder.title, "Calculo Aplicado: Lista de exercicios");
    assert.equal(firstReminder.remindAt, "2026-09-25T23:30:00");
    assert.equal(firstReminder.sourceId, firstActivity.id);

    const changed = structuredClone(first.data);
    changed.subjects[0].activities[0].status = "submitted";
    changed.reminders[0].status = "sent";
    const refreshedPayload = buildPayload("account-a", "aluna.a@example.edu");
    refreshedPayload.courses[0].courseWork[0].title = "Lista de exercicios revisada";
    refreshedPayload.courses[0].courseWork[0].dueDate = { day: 27, month: 9, year: 2026 };
    refreshedPayload.courses[0].courseWork[0].dueTime = { hours: 4, minutes: 15 };

    const refreshed = mergeClassroomPayload(changed, refreshedPayload, { idFactory });
    assert.equal(refreshed.data.subjects.length, 1);
    assert.equal(refreshed.data.subjects[0].activities.length, 1);
    assert.equal(refreshed.data.reminders.length, 1);
    assert.equal(refreshed.summary.activities, 0);
    assert.equal(refreshed.summary.updated, 1);
    assert.equal(refreshed.data.subjects[0].activities[0].status, "submitted");
    assert.equal(refreshed.data.reminders[0].status, "scheduled");
    assert.equal(refreshed.data.reminders[0].remindAt, "2026-09-27T00:15:00");

    const secondAccount = mergeClassroomPayload(
      refreshed.data,
      buildPayload("account-b", "aluna.b@example.edu"),
      { idFactory }
    );

    assert.equal(secondAccount.data.subjects.length, 2);
    assert.equal(secondAccount.data.reminders.length, 2);
    assert.equal(
      secondAccount.data.subjects.filter((subject) => subject.name === "Calculo Aplicado").length,
      2
    );
  });
});

function buildPayload(accountId: string, email: string): ClassroomImportPayload {
  return {
    account: {
      connectedAt: "2026-09-25T12:00:00.000Z",
      email,
      id: accountId,
      name: "Conta de teste"
    },
    courses: [
      {
        course: {
          alternateLink: "https://classroom.google.com/c/course-1",
          id: "course-1",
          name: "Calculo Aplicado",
          section: "Turma 01"
        },
        courseWork: [
          {
            alternateLink: "https://classroom.google.com/c/course-1/a/work-1",
            courseId: "course-1",
            dueDate: { day: 26, month: 9, year: 2026 },
            dueTime: { hours: 3, minutes: 30 },
            id: "work-1",
            title: "Lista de exercicios",
            workType: "ASSIGNMENT"
          }
        ]
      }
    ],
    fetchedAt: "2026-09-25T12:00:00.000Z",
    importId: `${accountId}-import`
  };
}

function buildData(): RoutineData {
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
      displayName: "Pessoa de teste",
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
    subjects: [],
    tasks: [],
    userId: "user-1",
    version: 4
  };
}
