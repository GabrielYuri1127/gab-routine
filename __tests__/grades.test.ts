import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateGradeAverage,
  calculateRequiredFinalExamGrade,
  calculateSimpleAverage,
  calculateUfamFinalGrade,
  calculateWeightedAverage
} from "../lib/academic-rules/grades";
import type { Grade } from "../types/academic";

const grades: Grade[] = [
  { id: "1", subjectId: "redes", name: "AV1", score: 7, maxScore: 10, weight: 1 },
  { id: "2", subjectId: "redes", name: "AV2", score: 8, maxScore: 10, weight: 3 }
];

describe("grade rules", () => {
  it("calculates simple average", () => {
    assert.equal(calculateSimpleAverage(grades), 7.5);
    assert.equal(calculateGradeAverage(grades, "simple"), 7.5);
  });

  it("calculates weighted average", () => {
    assert.equal(calculateWeightedAverage(grades), 7.75);
    assert.equal(calculateGradeAverage(grades, "weighted"), 7.75);
  });

  it("calculates UFAM final grade formula", () => {
    assert.equal(Number(calculateUfamFinalGrade(6, 8).toFixed(1)), 6.7);
  });

  it("calculates the final exam grade needed for a target MF", () => {
    assert.equal(calculateRequiredFinalExamGrade(6, 5), 3);
    assert.equal(calculateRequiredFinalExamGrade(2, 5), 11);
  });
});
