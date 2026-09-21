import type { SubjectStatus, Weekday } from "@/types/academic";

export type AcademicDocumentKind = "auto" | "schedule" | "transcript";
export type AcademicDocumentType = "schedule" | "transcript" | "curriculum" | "unknown";

export interface AcademicImportCourse {
  courseName: string;
  institution: string;
  totalPeriods: number;
  totalWorkloadHours: number;
  currentPeriod: number;
}

export interface AcademicImportSchedule {
  weekday: Weekday;
  startTime: string;
  endTime: string;
  classesQuantity: number;
}

export interface AcademicImportSubjectDraft {
  name: string;
  code: string;
  professor: string;
  room: string;
  semester: string;
  recommendedPeriod: number;
  workloadHours: number;
  status: Exclude<SubjectStatus, "archived">;
  schedules: AcademicImportSchedule[];
  confidence: number;
  notes: string;
}

export interface AcademicImportResult {
  documentType: AcademicDocumentType;
  documentTitle: string;
  summary: string;
  warnings: string[];
  course: AcademicImportCourse;
  subjects: AcademicImportSubjectDraft[];
}

export interface AcademicImportSummary {
  selected: number;
  created: number;
  updated: number;
  schedulesAdded: number;
  courseUpdated: boolean;
}
