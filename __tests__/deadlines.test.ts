import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDeadlineUrgency } from "../lib/academic-rules/deadlines";

describe("deadline prioritization", () => {
  const today = new Date("2026-08-31T12:00:00");

  it("prioritizes deadlines by remaining days", () => {
    assert.equal(getDeadlineUrgency("2026-09-12", today), "normal");
    assert.equal(getDeadlineUrgency("2026-09-04", today), "attention");
    assert.equal(getDeadlineUrgency("2026-09-01", today), "urgent");
    assert.equal(getDeadlineUrgency("2026-08-30", today), "overdue");
  });
});
