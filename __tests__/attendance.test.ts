import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateAttendanceSummary, getAbsenceLimit } from "../lib/academic-rules/attendance";
import { createUfamRules } from "../lib/academic-rules/ufam";
import type { AttendanceRecord } from "../types/academic";

describe("attendance rules", () => {
  it("calculates the UFAM absence limit without allowing attendance below the minimum", () => {
    assert.equal(getAbsenceLimit(60, 75), 15);
    assert.equal(getAbsenceLimit(61, 75), 15);
  });

  it("calculates frequency, used absences, remaining absences and alert level", () => {
    const records: AttendanceRecord[] = [
      { id: "1", subjectId: "redes", date: "2026-08-27", quantity: 2, status: "absence" },
      { id: "2", subjectId: "redes", date: "2026-08-18", quantity: 2, status: "justified" },
      { id: "3", subjectId: "redes", date: "2026-08-20", quantity: 2, status: "present" }
    ];

    const summary = calculateAttendanceSummary(records, createUfamRules({ totalExpectedClasses: 60 }), "Redes");

    assert.equal(summary.usedAbsences, 4);
    assert.equal(summary.absenceLimit, 15);
    assert.equal(summary.remainingAbsences, 11);
    assert.equal(Number(summary.frequency.toFixed(1)), 93.3);
    assert.equal(summary.alertLevel, "normal");
  });

  it("marks the subject as limit reached when all allowed absences are used", () => {
    const records: AttendanceRecord[] = [
      { id: "1", subjectId: "redes", date: "2026-08-27", quantity: 15, status: "absence" }
    ];

    const summary = calculateAttendanceSummary(records, createUfamRules({ totalExpectedClasses: 60 }), "Redes");

    assert.equal(summary.remainingAbsences, 0);
    assert.equal(summary.alertLevel, "limit_reached");
  });
});
