import type { AcademicRules } from "@/types/academic";

export const UFAM_ACADEMIC_PRESET: AcademicRules = {
  minimumAttendance: 75,
  directApprovalGrade: 8,
  minimumFinalGrade: 5,
  gradingMethod: "simple",
  finalGradeFormula: "ufam-mf",
  totalExpectedClasses: 60,
  classesPerMeeting: 2
};

export function createUfamRules(overrides: Partial<AcademicRules> = {}): AcademicRules {
  return {
    ...UFAM_ACADEMIC_PRESET,
    ...overrides
  };
}
