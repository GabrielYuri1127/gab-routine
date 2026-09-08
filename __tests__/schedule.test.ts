import test from "node:test";
import assert from "node:assert/strict";

import { getRecentClassDates, isClassDate } from "../lib/academic-rules/schedule";
import type { Subject } from "../types/academic";

const subject: Subject = {
  id: "redes",
  name: "Redes",
  semester: "2026/1",
  workloadHours: 60,
  color: "#0f9f7a",
  status: "active",
  rules: {
    minimumAttendance: 75,
    directApprovalGrade: 8,
    minimumFinalGrade: 5,
    gradingMethod: "simple",
    finalGradeFormula: "ufam-mf",
    totalExpectedClasses: 60,
    classesPerMeeting: 2
  },
  schedules: [
    {
      id: "redes-segunda",
      subjectId: "redes",
      weekday: "monday",
      startTime: "08:00",
      endTime: "09:40",
      classesQuantity: 2
    },
    {
      id: "redes-quarta",
      subjectId: "redes",
      weekday: "wednesday",
      startTime: "08:00",
      endTime: "09:40",
      classesQuantity: 2
    }
  ],
  attendance: [
    {
      id: "registered",
      subjectId: "redes",
      date: "2026-09-07",
      quantity: 2,
      status: "absence"
    }
  ],
  grades: [],
  activities: []
};

test("finds recent class dates from the subject schedule", () => {
  const dates = getRecentClassDates(subject, "2026-09-10", 10);

  assert.deepEqual(
    dates.map((date) => date.date),
    ["2026-09-09", "2026-09-07", "2026-09-02", "2026-08-31"]
  );
  assert.equal(dates[1].alreadyRegistered, true);
  assert.equal(dates[0].classesQuantity, 2);
});

test("checks whether a date matches a class day", () => {
  assert.equal(isClassDate(subject, "2026-09-08"), false);
  assert.equal(isClassDate(subject, "2026-09-09"), true);
});
