import type { Grade, GradingMethod } from "@/types/academic";

export function normalizeGrade(score: number, maxScore: number) {
  if (maxScore <= 0) {
    return 0;
  }

  return (score / maxScore) * 10;
}

export function calculateSimpleAverage(grades: Grade[]) {
  if (grades.length === 0) {
    return null;
  }

  const total = grades.reduce((sum, grade) => sum + normalizeGrade(grade.score, grade.maxScore), 0);
  return total / grades.length;
}

export function calculateWeightedAverage(grades: Grade[]) {
  if (grades.length === 0) {
    return null;
  }

  const weightSum = grades.reduce((sum, grade) => sum + (grade.weight ?? 1), 0);
  if (weightSum <= 0) {
    return null;
  }

  const total = grades.reduce(
    (sum, grade) => sum + normalizeGrade(grade.score, grade.maxScore) * (grade.weight ?? 1),
    0
  );

  return total / weightSum;
}

export function calculatePointsSum(grades: Grade[]) {
  if (grades.length === 0) {
    return null;
  }

  const earned = grades.reduce((sum, grade) => sum + grade.score, 0);
  const possible = grades.reduce((sum, grade) => sum + grade.maxScore, 0);
  return normalizeGrade(earned, possible);
}

export function calculateGradeAverage(grades: Grade[], method: GradingMethod) {
  if (method === "weighted") {
    return calculateWeightedAverage(grades);
  }

  if (method === "points") {
    return calculatePointsSum(grades);
  }

  return calculateSimpleAverage(grades);
}

export function calculateUfamFinalGrade(mee: number, pf: number) {
  return (2 * mee + pf) / 3;
}

export function calculateRequiredFinalExamGrade(mee: number, targetFinalGrade = 5) {
  const required = targetFinalGrade * 3 - 2 * mee;
  return Math.max(0, Number(required.toFixed(2)));
}

export function getAcademicSituation(average: number | null, directApprovalGrade: number, minimumFinalGrade: number) {
  if (average === null) {
    return "Sem notas";
  }

  if (average >= directApprovalGrade) {
    return "Aprovacao direta";
  }

  if (average >= minimumFinalGrade) {
    return "Pode precisar de PF";
  }

  return "Atenção na média";
}

export function simulateGrade(grades: Grade[], simulatedGrade: Grade, method: GradingMethod) {
  const projectedGrades = grades.map((grade) => (grade.id === simulatedGrade.id ? simulatedGrade : grade));
  const exists = grades.some((grade) => grade.id === simulatedGrade.id);
  const nextGrades = exists ? projectedGrades : [...grades, simulatedGrade];

  return calculateGradeAverage(nextGrades, method);
}
