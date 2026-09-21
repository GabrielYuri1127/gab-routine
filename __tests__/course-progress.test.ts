import assert from "node:assert/strict";
import test from "node:test";

import { calculateCourseProgress, groupSubjectsByCurriculumPeriod } from "../lib/academic-rules/course-progress";
import type { Subject } from "../types/academic";

function buildSubject(id: string, status: Subject["status"], workloadHours: number, recommendedPeriod: number): Subject {
  return {
    id,
    name: id,
    semester: `${recommendedPeriod}o periodo`,
    recommendedPeriod,
    workloadHours,
    color: "#0f9f7a",
    status,
    rules: {
      minimumAttendance: 75,
      directApprovalGrade: 8,
      minimumFinalGrade: 5,
      gradingMethod: "simple",
      finalGradeFormula: "ufam-mf",
      totalExpectedClasses: 30,
      classesPerMeeting: 2
    },
    schedules: [],
    attendance: [],
    grades: [],
    activities: []
  };
}

test("calculates degree progress from completed workload", () => {
  const subjects = [buildSubject("A", "completed", 60, 1), buildSubject("B", "active", 90, 2)];
  const progress = calculateCourseProgress(subjects, 300);

  assert.equal(progress.completedWorkloadHours, 60);
  assert.equal(progress.progressPercent, 20);
  assert.equal(progress.activeSubjects, 1);
  assert.equal(progress.completedSubjects, 1);
});

test("groups the curriculum by recommended period", () => {
  const subjects = [buildSubject("A", "completed", 60, 1), buildSubject("B", "planned", 90, 3)];
  const periods = groupSubjectsByCurriculumPeriod(subjects, 4);

  assert.equal(periods.length, 4);
  assert.deepEqual(periods[0].subjects.map((subject) => subject.id), ["A"]);
  assert.deepEqual(periods[2].subjects.map((subject) => subject.id), ["B"]);
  assert.equal(periods[2].workloadHours, 90);
});

test("does not mistake an academic term year for a curriculum period", () => {
  const legacySubject = buildSubject("Legacy", "active", 60, 4);
  delete legacySubject.recommendedPeriod;
  legacySubject.semester = "2026/1";

  const periods = groupSubjectsByCurriculumPeriod([legacySubject], 8, 5);
  assert.deepEqual(periods[4].subjects.map((subject) => subject.id), ["Legacy"]);
});
