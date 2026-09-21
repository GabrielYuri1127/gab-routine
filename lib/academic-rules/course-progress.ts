import type { Subject, SubjectStatus } from "@/types/academic";

export interface CourseProgressSummary {
  activeSubjects: number;
  completedSubjects: number;
  failedSubjects: number;
  plannedSubjects: number;
  progressPercent: number;
  completedWorkloadHours: number;
  totalSubjects: number;
  totalWorkloadHours: number;
  trackedWorkloadHours: number;
}

export interface CurriculumPeriod {
  period: number;
  subjects: Subject[];
  workloadHours: number;
  completedWorkloadHours: number;
}

export function calculateCourseProgress(subjects: Subject[], configuredTotalWorkloadHours?: number): CourseProgressSummary {
  const trackedSubjects = subjects.filter((subject) => subject.status !== "archived");
  const completedSubjects = trackedSubjects.filter((subject) => subject.status === "completed");
  const trackedWorkloadHours = sumWorkload(trackedSubjects);
  const completedWorkloadHours = sumWorkload(completedSubjects);
  const totalWorkloadHours =
    configuredTotalWorkloadHours && configuredTotalWorkloadHours > 0
      ? Math.max(configuredTotalWorkloadHours, completedWorkloadHours)
      : trackedWorkloadHours;
  const progressPercent =
    totalWorkloadHours > 0
      ? clampPercentage((completedWorkloadHours / totalWorkloadHours) * 100)
      : trackedSubjects.length > 0
        ? clampPercentage((completedSubjects.length / trackedSubjects.length) * 100)
        : 0;

  return {
    activeSubjects: countStatus(trackedSubjects, "active"),
    completedSubjects: completedSubjects.length,
    failedSubjects: countStatus(trackedSubjects, "failed"),
    plannedSubjects: countStatus(trackedSubjects, "planned"),
    progressPercent,
    completedWorkloadHours,
    totalSubjects: trackedSubjects.length,
    totalWorkloadHours,
    trackedWorkloadHours
  };
}

export function groupSubjectsByCurriculumPeriod(subjects: Subject[], totalPeriods: number, fallbackPeriod = 1): CurriculumPeriod[] {
  const lastKnownPeriod = Math.max(
    totalPeriods,
    ...subjects.map((subject) => getSubjectCurriculumPeriod(subject)).filter((period): period is number => period !== null),
    1
  );

  return Array.from({ length: lastKnownPeriod }, (_, index) => {
    const period = index + 1;
    const periodSubjects = subjects.filter((subject) => {
      const subjectPeriod = getSubjectCurriculumPeriod(subject) ?? fallbackPeriod;
      return subject.status !== "archived" && subjectPeriod === period;
    });

    return {
      period,
      subjects: periodSubjects,
      workloadHours: sumWorkload(periodSubjects),
      completedWorkloadHours: sumWorkload(periodSubjects.filter((subject) => subject.status === "completed"))
    };
  });
}

export function getSubjectCurriculumPeriod(subject: Subject) {
  if (subject.recommendedPeriod && subject.recommendedPeriod > 0) {
    return subject.recommendedPeriod;
  }

  const normalized = subject.semester
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const directMatch = normalized.match(/^(\d{1,2})(?:o|a|º|ª)?(?:\s+periodo)?$/);
  const namedMatch = normalized.match(/^periodo\s+(\d{1,2})$/);
  const value = Number(directMatch?.[1] ?? namedMatch?.[1]);
  return value > 0 && value <= 30 ? value : null;
}

function sumWorkload(subjects: Subject[]) {
  return subjects.reduce((total, subject) => total + Math.max(subject.workloadHours || 0, 0), 0);
}

function countStatus(subjects: Subject[], status: SubjectStatus) {
  return subjects.filter((subject) => subject.status === status).length;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
