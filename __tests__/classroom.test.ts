import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mapClassroomCourseWorkType,
  toDateKeyFromClassroomDueDate,
  toTimeFromClassroomDueTime
} from "../lib/classroom/google-classroom";

describe("Google Classroom mapping", () => {
  it("formats Classroom due dates and due times", () => {
    assert.equal(toDateKeyFromClassroomDueDate({ day: 9, month: 9, year: 2026 }), "2026-09-09");
    assert.equal(toTimeFromClassroomDueTime({ hours: 8, minutes: 5 }), "08:05");
    assert.equal(toTimeFromClassroomDueTime(undefined), undefined);
  });

  it("maps Classroom work types to academic activity types", () => {
    assert.equal(mapClassroomCourseWorkType("ASSIGNMENT"), "work");
    assert.equal(mapClassroomCourseWorkType("SHORT_ANSWER_QUESTION"), "exercise");
    assert.equal(mapClassroomCourseWorkType("MATERIAL"), "other");
    assert.equal(mapClassroomCourseWorkType("UNKNOWN"), "activity");
  });
});
