import { createUfamRules } from "../academic-rules/ufam";
import type { RoutineData } from "../../features/data/seed";
import type { Subject, SubjectSchedule, SubjectStatus } from "../../types/academic";
import type {
  AcademicImportResult,
  AcademicImportSubjectDraft,
  AcademicImportSummary
} from "../../types/academic-import";

const subjectColors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];

interface ApplyAcademicImportOptions {
  idFactory?: (prefix: string) => string;
  selectedIndexes?: Iterable<number>;
}

export function applyAcademicImport(
  data: RoutineData,
  result: AcademicImportResult,
  options: ApplyAcademicImportOptions = {}
): { data: RoutineData; summary: AcademicImportSummary } {
  const selectedIndexes = options.selectedIndexes ? new Set(options.selectedIndexes) : null;
  const idFactory = options.idFactory ?? createImportId;
  const subjects = [...data.subjects];
  const summary: AcademicImportSummary = {
    courseUpdated: false,
    created: 0,
    schedulesAdded: 0,
    selected: 0,
    updated: 0
  };

  result.subjects.forEach((draft, index) => {
    if (selectedIndexes && !selectedIndexes.has(index)) {
      return;
    }

    summary.selected += 1;
    const existingIndex = findAcademicSubjectMatchIndex(subjects, draft);
    if (existingIndex >= 0) {
      const merged = mergeExistingSubject(subjects[existingIndex], draft, data, idFactory);
      subjects[existingIndex] = merged.subject;
      summary.schedulesAdded += merged.schedulesAdded;
      summary.updated += 1;
      return;
    }

    const subject = buildImportedSubject(draft, data, subjects, index, idFactory);
    summary.schedulesAdded += subject.schedules.length;
    subjects.push(subject);
    summary.created += 1;
  });

  const appPreference = mergeCoursePreference(data, result, summary);
  const completedAt = new Date().toISOString();
  const tasks = data.tasks.map((task) => {
    const shouldCompleteCourse = task.id === "configurar-curso" && summary.courseUpdated;
    const shouldCompleteSubjects = task.id === "cadastrar-disciplinas" && summary.selected > 0;
    return shouldCompleteCourse || shouldCompleteSubjects
      ? { ...task, completedAt, status: "done" as const }
      : task;
  });

  return {
    data: {
      ...data,
      appPreference,
      subjects,
      tasks
    },
    summary
  };
}

export function findAcademicSubjectMatchIndex(subjects: Subject[], draft: AcademicImportSubjectDraft) {
  const code = normalizeCode(draft.code);
  if (code) {
    const codeMatch = subjects.findIndex((subject) => normalizeCode(subject.code ?? "") === code);
    if (codeMatch >= 0) {
      return codeMatch;
    }
  }

  const name = normalizeName(draft.name);
  return name ? subjects.findIndex((subject) => normalizeName(subject.name) === name) : -1;
}

function mergeExistingSubject(
  existing: Subject,
  draft: AcademicImportSubjectDraft,
  data: RoutineData,
  idFactory: (prefix: string) => string
) {
  const schedules = [...existing.schedules];
  let schedulesAdded = 0;
  draft.schedules.forEach((schedule) => {
    if (!schedule.startTime || !schedule.endTime || hasSchedule(schedules, schedule)) {
      return;
    }
    schedules.push(toSubjectSchedule(schedule, existing.id, idFactory));
    schedulesAdded += 1;
  });

  const workloadHours = draft.workloadHours > 0 ? draft.workloadHours : existing.workloadHours;
  const classesPerMeeting = draft.schedules[0]?.classesQuantity || existing.rules.classesPerMeeting || data.appPreference.defaultClassesQuantity;
  return {
    schedulesAdded,
    subject: {
      ...existing,
      code: cleanOptional(draft.code) ?? existing.code,
      name: draft.name.trim() || existing.name,
      observations: mergeNotes(existing.observations, draft.notes),
      professor: cleanOptional(draft.professor) ?? existing.professor,
      recommendedPeriod: draft.recommendedPeriod > 0 ? draft.recommendedPeriod : existing.recommendedPeriod,
      room: cleanOptional(draft.room) ?? existing.room,
      rules: {
        ...existing.rules,
        classesPerMeeting
      },
      schedules,
      semester: draft.semester.trim() || existing.semester,
      status: mergeStatus(existing.status, draft.status),
      workloadHours
    }
  };
}

function buildImportedSubject(
  draft: AcademicImportSubjectDraft,
  data: RoutineData,
  subjects: Subject[],
  colorIndex: number,
  idFactory: (prefix: string) => string
): Subject {
  const id = createUniqueSubjectId(draft.name, subjects, idFactory);
  const classesPerMeeting = draft.schedules[0]?.classesQuantity || data.appPreference.defaultClassesQuantity;
  const workloadHours = draft.workloadHours > 0 ? draft.workloadHours : data.appPreference.defaultWorkloadHours;

  return {
    activities: [],
    attendance: [],
    code: cleanOptional(draft.code),
    color: subjectColors[colorIndex % subjectColors.length],
    grades: [],
    id,
    name: draft.name.trim(),
    observations: cleanOptional(draft.notes),
    professor: cleanOptional(draft.professor),
    recommendedPeriod: draft.recommendedPeriod > 0 ? draft.recommendedPeriod : undefined,
    resources: [],
    room: cleanOptional(draft.room),
    rules: createUfamRules({ classesPerMeeting }),
    schedules: draft.schedules
      .filter((schedule) => schedule.startTime && schedule.endTime)
      .map((schedule) => toSubjectSchedule(schedule, id, idFactory)),
    semester:
      draft.semester.trim() ||
      (draft.recommendedPeriod > 0 ? `${draft.recommendedPeriod}o periodo` : data.appPreference.defaultSemester),
    status: draft.status,
    workloadHours
  };
}

function mergeCoursePreference(data: RoutineData, result: AcademicImportResult, summary: AcademicImportSummary) {
  const course = result.course;
  const patch = {
    courseInstitution: course.institution.trim() || data.appPreference.courseInstitution,
    courseOrArea: course.courseName.trim() || data.appPreference.courseOrArea,
    courseTotalSemesters: course.totalPeriods > 0 ? course.totalPeriods : data.appPreference.courseTotalSemesters,
    courseTotalWorkloadHours:
      course.totalWorkloadHours > 0 ? course.totalWorkloadHours : data.appPreference.courseTotalWorkloadHours,
    currentCurriculumPeriod:
      course.currentPeriod > 0 ? course.currentPeriod : data.appPreference.currentCurriculumPeriod
  };

  summary.courseUpdated =
    patch.courseInstitution !== data.appPreference.courseInstitution ||
    patch.courseOrArea !== data.appPreference.courseOrArea ||
    patch.courseTotalSemesters !== data.appPreference.courseTotalSemesters ||
    patch.courseTotalWorkloadHours !== data.appPreference.courseTotalWorkloadHours ||
    patch.currentCurriculumPeriod !== data.appPreference.currentCurriculumPeriod;

  return {
    ...data.appPreference,
    ...patch,
    contexts: Array.from(new Set([...data.appPreference.contexts, "faculdade", "trabalho"])),
    primaryContext: "faculdade",
    profileLabel: "faculdade e trabalho"
  };
}

function mergeStatus(existing: SubjectStatus, incoming: SubjectStatus) {
  if (existing === "completed" && incoming !== "completed") {
    return existing;
  }
  if (incoming === "planned" && existing !== "planned" && existing !== "archived") {
    return existing;
  }
  return incoming;
}

function hasSchedule(schedules: SubjectSchedule[], incoming: AcademicImportSubjectDraft["schedules"][number]) {
  return schedules.some(
    (schedule) =>
      schedule.weekday === incoming.weekday &&
      schedule.startTime === incoming.startTime &&
      schedule.endTime === incoming.endTime
  );
}

function toSubjectSchedule(
  schedule: AcademicImportSubjectDraft["schedules"][number],
  subjectId: string,
  idFactory: (prefix: string) => string
): SubjectSchedule {
  return {
    classesQuantity: Math.max(1, schedule.classesQuantity || 1),
    endTime: schedule.endTime,
    id: idFactory("schedule"),
    startTime: schedule.startTime,
    subjectId,
    weekday: schedule.weekday
  };
}

function createUniqueSubjectId(name: string, subjects: Subject[], idFactory: (prefix: string) => string) {
  const slug = normalizeName(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "subject";
  let id = idFactory(slug);
  while (subjects.some((subject) => subject.id === id)) {
    id = idFactory(slug);
  }
  return id;
}

function createImportId(prefix: string) {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${suffix}`;
}

function normalizeCode(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]/g, "");
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function cleanOptional(value: string) {
  const clean = value.trim();
  return clean || undefined;
}

function mergeNotes(existing: string | undefined, incoming: string) {
  const cleanIncoming = incoming.trim();
  if (!cleanIncoming) {
    return existing;
  }
  if (!existing?.trim()) {
    return cleanIncoming;
  }
  if (existing.includes(cleanIncoming)) {
    return existing;
  }
  return `${existing.trim()}\n${cleanIncoming}`;
}
