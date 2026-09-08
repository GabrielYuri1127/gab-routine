export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type SubjectStatus = "active" | "paused" | "completed" | "archived";

export type AttendanceStatus = "absence" | "justified" | "present" | "cancelled";

export type GradingMethod = "simple" | "weighted" | "points" | "custom";

export type ActivityType =
  | "activity"
  | "exercise"
  | "list"
  | "work"
  | "project"
  | "report"
  | "presentation"
  | "exam"
  | "seminar"
  | "lab"
  | "other";

export type ActivityStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "corrected"
  | "late";

export interface SubjectSchedule {
  id: string;
  subjectId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  classesQuantity: number;
}

export interface AcademicRules {
  minimumAttendance: number;
  directApprovalGrade: number;
  minimumFinalGrade: number;
  gradingMethod: GradingMethod;
  finalGradeFormula: "ufam-mf" | "custom";
  totalExpectedClasses: number;
  classesPerMeeting: number;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  quantity: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface Grade {
  id: string;
  subjectId: string;
  name: string;
  score: number;
  maxScore: number;
  weight?: number;
  type?: "mee" | "pf" | "exam" | "work" | "project" | "activity" | "other";
  date?: string;
  notes?: string;
}

export interface AcademicActivity {
  id: string;
  subjectId: string;
  title: string;
  dueDate: string;
  time?: string;
  type: ActivityType;
  status: ActivityStatus;
  weight?: number;
  maxScore?: number;
  description?: string;
  notes?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  professor?: string;
  room?: string;
  semester: string;
  workloadHours: number;
  color: string;
  status: SubjectStatus;
  rules: AcademicRules;
  schedules: SubjectSchedule[];
  attendance: AttendanceRecord[];
  grades: Grade[];
  activities: AcademicActivity[];
  observations?: string;
}
