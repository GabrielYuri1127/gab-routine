import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User } from "@supabase/supabase-js";

import type { RoutineData } from "../features/data/seed";
import { getConfiguredAdminEmails, isGaviumAdmin } from "../lib/admin/access";
import {
  AdminRoutineTargetNotFoundError,
  adminRoutineMutationSchema,
  applyAdminRoutineOperation
} from "../lib/admin/routine-editor";
import type { Subject } from "../types/academic";

describe("Admin access", () => {
  it("recognizes only an app role or a configured normalized email", () => {
    const env = { GAVIUM_ADMIN_EMAILS: " admin@example.com, suporte@example.com ", NODE_ENV: "test" } as NodeJS.ProcessEnv;
    const emptyEnv = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
    const regularUser = buildUser({ email: "ADMIN@example.com" });
    const roleUser = buildUser({ app_metadata: { role: "owner" }, email: "person@example.com" });
    const stranger = buildUser({ email: "other@example.com" });

    assert.deepEqual(getConfiguredAdminEmails(env), ["admin@example.com", "suporte@example.com"]);
    assert.equal(isGaviumAdmin(regularUser, env), true);
    assert.equal(isGaviumAdmin(roleUser, emptyEnv), true);
    assert.equal(isGaviumAdmin(stranger, env), false);
  });

  it("rejects profile fields outside the explicit editable list", () => {
    const parsed = adminRoutineMutationSchema.safeParse({
      operation: {
        patch: { profilePhoto: "data:image/png;base64,secret" },
        type: "profile"
      }
    });

    assert.equal(parsed.success, false);
  });
});

describe("Authorized routine editing", () => {
  it("updates only the requested task and leaves the source untouched", () => {
    const source = buildRoutine();
    const originalTitle = source.tasks[1].title;
    const result = applyAdminRoutineOperation(source, {
      id: source.tasks[0].id,
      patch: { priority: "urgent", title: "Revisar cronograma" },
      type: "task"
    });

    assert.equal(result.data.tasks[0].title, "Revisar cronograma");
    assert.equal(result.data.tasks[0].priority, "urgent");
    assert.equal(result.data.tasks[1].title, originalTitle);
    assert.notEqual(result.data, source);
    assert.notEqual(result.data.tasks, source.tasks);
    assert.notEqual(source.tasks[0].title, "Revisar cronograma");
  });

  it("edits one academic activity and rejects stale targets", () => {
    const source = buildRoutine();
    const subject = buildSubject();
    source.subjects = [subject];

    const result = applyAdminRoutineOperation(source, {
      id: "activity-one",
      patch: { dueDate: "2026-10-04", status: "in_progress", time: "19:00" },
      subjectId: subject.id,
      type: "activity"
    });

    assert.equal(result.data.subjects[0].activities[0].dueDate, "2026-10-04");
    assert.equal(result.data.subjects[0].activities[0].status, "in_progress");
    assert.throws(
      () =>
        applyAdminRoutineOperation(source, {
          id: "missing",
          patch: { title: "Nao deve salvar" },
          type: "reminder"
        }),
      AdminRoutineTargetNotFoundError
    );
  });
});

function buildUser(overrides: Partial<User>): User {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-09-25T00:00:00.000Z",
    id: "00000000-0000-4000-8000-000000000001",
    user_metadata: {},
    ...overrides
  } as User;
}

function buildSubject(): Subject {
  return {
    activities: [
      {
        dueDate: "2026-10-01",
        id: "activity-one",
        status: "not_started",
        subjectId: "subject-one",
        title: "Relatorio",
        type: "report"
      }
    ],
    attendance: [],
    color: "#0f9f7a",
    grades: [],
    id: "subject-one",
    name: "Disciplina de teste",
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
    semester: "2026/2",
    status: "active",
    workloadHours: 60
  };
}

function buildRoutine(): RoutineData {
  return {
    appPreference: {
      accentColor: "#0f9f7a",
      appName: "Gavium",
      assistantAnswerStyle: "balanced",
      birthDate: "",
      contextDetails: "",
      contexts: ["faculdade", "trabalho"],
      courseOrArea: "",
      currentCurriculumPeriod: 1,
      defaultClassesQuantity: 2,
      defaultSemester: "2026/2",
      defaultWorkloadHours: 60,
      discoverySource: "",
      displayName: "Usuario de teste",
      enabledModules: {
        assistant: true,
        calendar: true,
        classroom: true,
        reminders: true,
        tasks: true,
        tutorial: true
      },
      gender: "",
      id: "preferences-one",
      primaryContext: "faculdade",
      profileLabel: "faculdade e trabalho",
      productivityGoal: "",
      userId: "user-one"
    },
    events: [],
    notificationPreference: {
      dailySummaryTime: "07:00",
      id: "notifications-one",
      quietHoursEnd: "07:00",
      quietHoursStart: "23:00",
      tomorrowPlanningTime: "21:30",
      userId: "user-one"
    },
    reminders: [
      {
        id: "reminder-one",
        remindAt: "2026-09-26T08:00:00",
        status: "scheduled",
        title: "Revisar aula",
        userId: "user-one"
      }
    ],
    subjects: [],
    tasks: [
      {
        category: "Faculdade",
        id: "task-one",
        priority: "high",
        status: "open",
        title: "Planejar estudo",
        userId: "user-one"
      },
      {
        category: "Trabalho",
        id: "task-two",
        priority: "medium",
        status: "open",
        title: "Organizar entrega",
        userId: "user-one"
      }
    ],
    userId: "user-one",
    version: 4
  };
}
