import type { RoutineData } from "@/features/data/seed";
import { createUfamRules } from "../academic-rules/ufam";
import { mapClassroomCourseWorkType, toClassroomDeadline } from "./google-classroom";
import type { AcademicActivity, AcademicResource } from "@/types/academic";
import type {
  ClassroomAccount,
  ClassroomCourse,
  ClassroomCourseWork,
  ClassroomImportPayload
} from "@/types/classroom";
import type { Reminder } from "@/types/domain";

export interface ClassroomImportSummary {
  activities: number;
  reminders: number;
  resources: number;
  skipped: number;
  subjects: number;
  updated: number;
}

interface MergeClassroomOptions {
  idFactory?: (prefix: string) => string;
}

interface ActivityUpsertResult {
  activity: AcademicActivity;
  created: boolean;
}

const subjectColors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];

export function mergeClassroomPayload(
  data: RoutineData,
  payload: ClassroomImportPayload,
  options: MergeClassroomOptions = {}
) {
  const idFactory = options.idFactory ?? createImportId;
  const nextSubjects = [...data.subjects];
  const nextReminders = [...data.reminders];
  const summary: ClassroomImportSummary = {
    activities: 0,
    reminders: 0,
    resources: 0,
    skipped: 0,
    subjects: 0,
    updated: 0
  };

  payload.courses.forEach((item, index) => {
    const courseMarkers = getCourseMarkers(item.course, payload.account);
    const existingIndex = nextSubjects.findIndex(
      (subject) =>
        hasClassroomMarker(subject.observations, courseMarkers, `Google Classroom: ${item.course.id}`) ||
        (!payload.account && normalizeName(subject.name) === normalizeName(item.course.name))
    );
    const existingSubject = existingIndex >= 0 ? nextSubjects[existingIndex] : undefined;
    const subjectId = existingSubject?.id ?? idFactory("classroom-subject");
    const activities = [...(existingSubject?.activities ?? [])];
    const resources = [...(existingSubject?.resources ?? [])];
    const courseResource = buildResourceFromCourse(item.course, subjectId, payload.account, resources, idFactory);

    if (courseResource) {
      resources.unshift(courseResource);
      summary.resources += 1;
    }

    item.courseWork.forEach((work) => {
      const activityResult = upsertActivityFromCourseWork(
        work,
        subjectId,
        payload.account,
        activities,
        idFactory
      );

      if (activityResult) {
        if (activityResult.created) {
          activities.unshift(activityResult.activity);
          summary.activities += 1;
        } else {
          summary.updated += 1;
        }

        const reminderCreated = upsertActivityReminder(
          nextReminders,
          activityResult.activity,
          item.course.name,
          data.userId,
          idFactory
        );
        if (reminderCreated) {
          summary.reminders += 1;
        }
        return;
      }

      const resource = buildResourceFromCourseWork(work, subjectId, payload.account, resources, idFactory);
      if (resource) {
        resources.unshift(resource);
        summary.resources += 1;
      } else {
        summary.skipped += 1;
      }
    });

    const courseNotes = buildCourseNotes(item.course, payload.account);
    if (existingSubject) {
      nextSubjects[existingIndex] = {
        ...existingSubject,
        code: existingSubject.code ?? item.course.section,
        observations: mergeNotes(existingSubject.observations, courseNotes),
        room: existingSubject.room ?? item.course.room,
        activities,
        resources
      };
      return;
    }

    nextSubjects.unshift({
      id: subjectId,
      name: item.course.name,
      code: item.course.section,
      room: item.course.room,
      semester: data.appPreference.defaultSemester,
      workloadHours: data.appPreference.defaultWorkloadHours,
      color: subjectColors[index % subjectColors.length],
      status: "active",
      rules: createUfamRules({ classesPerMeeting: data.appPreference.defaultClassesQuantity }),
      schedules: [],
      attendance: [],
      grades: [],
      activities,
      resources,
      observations: courseNotes
    });
    summary.subjects += 1;
  });

  return {
    data: {
      ...data,
      reminders: nextReminders,
      subjects: nextSubjects
    },
    summary
  };
}

function upsertActivityFromCourseWork(
  work: ClassroomCourseWork,
  subjectId: string,
  account: ClassroomAccount | undefined,
  activities: AcademicActivity[],
  idFactory: (prefix: string) => string
): ActivityUpsertResult | undefined {
  const deadline = toClassroomDeadline(work.dueDate, work.dueTime);
  if (!deadline) {
    return undefined;
  }

  const markers = getCourseWorkMarkers(work, account);
  let existingIndex = activities.findIndex((activity) =>
    hasClassroomMarker(activity.notes, markers, `Google Classroom: ${work.courseId}/${work.id}`)
  );

  if (existingIndex < 0) {
    existingIndex = activities.findIndex(
      (activity) =>
        !activity.notes?.includes("Google Classroom") &&
        normalizeName(activity.title) === normalizeName(work.title) &&
        activity.dueDate === deadline.date
    );
  }

  const existing = existingIndex >= 0 ? activities[existingIndex] : undefined;
  const activity: AcademicActivity = {
    id: existing?.id ?? idFactory("classroom-activity"),
    subjectId,
    title: work.title,
    dueDate: deadline.date,
    time: deadline.time,
    type: mapClassroomCourseWorkType(work.workType),
    status: existing?.status ?? "not_started",
    maxScore: work.maxPoints,
    description: work.description,
    notes: mergeNotes(
      existing?.notes,
      [getCourseWorkMarker(work, account), work.alternateLink ? `Link: ${work.alternateLink}` : ""]
        .filter(Boolean)
        .join("\n")
    )
  };

  if (existingIndex >= 0) {
    activities[existingIndex] = activity;
  }

  return { activity, created: existingIndex < 0 };
}

function upsertActivityReminder(
  reminders: Reminder[],
  activity: AcademicActivity,
  subjectName: string,
  userId: string,
  idFactory: (prefix: string) => string
) {
  const remindAt = `${activity.dueDate}T${activity.time ?? "23:59"}:00`;
  const existingIndex = reminders.findIndex(
    (reminder) => reminder.sourceType === "activity" && reminder.sourceId === activity.id
  );
  const existing = existingIndex >= 0 ? reminders[existingIndex] : undefined;
  const changedDeadline = Boolean(existing && existing.remindAt !== remindAt);

  const reminder: Reminder = {
    id: existing?.id ?? idFactory("classroom-reminder"),
    userId,
    title: `${subjectName}: ${activity.title}`,
    remindAt,
    sourceType: "activity",
    sourceId: activity.id,
    status:
      existing?.status === "dismissed"
        ? "dismissed"
        : changedDeadline
          ? "scheduled"
          : (existing?.status ?? "scheduled")
  };

  if (existingIndex >= 0) {
    reminders[existingIndex] = reminder;
    return false;
  }

  reminders.unshift(reminder);
  return true;
}

function buildResourceFromCourse(
  course: ClassroomCourse,
  subjectId: string,
  account: ClassroomAccount | undefined,
  currentResources: AcademicResource[],
  idFactory: (prefix: string) => string
) {
  if (!course.alternateLink) {
    return undefined;
  }

  const markers = getCourseMarkers(course, account);
  if (
    currentResources.some((resource) =>
      hasClassroomMarker(resource.notes, markers, `Google Classroom: ${course.id}`)
    ) ||
    currentResources.some((resource) => resource.url === course.alternateLink)
  ) {
    return undefined;
  }

  return {
    createdAt: new Date().toISOString(),
    id: idFactory("classroom-resource"),
    notes: buildCourseNotes(course, account),
    subjectId,
    title: `Classroom - ${course.name}`,
    type: "classroom",
    url: course.alternateLink
  } satisfies AcademicResource;
}

function buildResourceFromCourseWork(
  work: ClassroomCourseWork,
  subjectId: string,
  account: ClassroomAccount | undefined,
  currentResources: AcademicResource[],
  idFactory: (prefix: string) => string
) {
  if (!work.alternateLink && !work.description) {
    return undefined;
  }

  const markers = getCourseWorkMarkers(work, account);
  if (
    currentResources.some((resource) =>
      hasClassroomMarker(resource.notes, markers, `Google Classroom: ${work.courseId}/${work.id}`)
    )
  ) {
    return undefined;
  }

  return {
    createdAt: new Date().toISOString(),
    id: idFactory("classroom-resource"),
    notes: [getCourseWorkMarker(work, account), work.description].filter(Boolean).join("\n"),
    subjectId,
    title: work.title,
    type: work.workType === "MATERIAL" ? "document" : "classroom",
    url: work.alternateLink
  } satisfies AcademicResource;
}

function buildCourseNotes(course: ClassroomCourse, account?: ClassroomAccount) {
  return [
    getCourseMarker(course, account),
    account?.email ? `Conta: ${account.email}` : "",
    course.descriptionHeading ? `Descricao: ${course.descriptionHeading}` : "",
    course.alternateLink ? `Link: ${course.alternateLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function getCourseMarkers(course: ClassroomCourse, account?: ClassroomAccount) {
  return unique([
    getCourseMarker(course, account),
    account?.email ? `Google Classroom (${account.email}): ${course.id}` : ""
  ]);
}

function getCourseWorkMarkers(work: ClassroomCourseWork, account?: ClassroomAccount) {
  return unique([
    getCourseWorkMarker(work, account),
    account?.email ? `Google Classroom (${account.email}): ${work.courseId}/${work.id}` : ""
  ]);
}

function getCourseMarker(course: ClassroomCourse, account?: ClassroomAccount) {
  return account?.id
    ? `Google Classroom [conta:${account.id}]: ${course.id}`
    : `Google Classroom: ${course.id}`;
}

function getCourseWorkMarker(work: ClassroomCourseWork, account?: ClassroomAccount) {
  return account?.id
    ? `Google Classroom [conta:${account.id}]: ${work.courseId}/${work.id}`
    : `Google Classroom: ${work.courseId}/${work.id}`;
}

function mergeNotes(current: string | undefined, next: string) {
  if (!current) {
    return next;
  }

  const nextMarker = next.split("\n")[0];
  if (current.includes(next) || current.includes(nextMarker)) {
    return current;
  }

  return `${current}\n${next}`;
}

function hasAnyMarker(value: string | undefined, markers: string[]) {
  return Boolean(value && markers.some((marker) => marker && value.includes(marker)));
}

function hasClassroomMarker(value: string | undefined, accountMarkers: string[], legacyMarker: string) {
  if (hasAnyMarker(value, accountMarkers)) {
    return true;
  }

  return Boolean(
    value &&
      value.includes(legacyMarker) &&
      !value.includes("Google Classroom [conta:") &&
      !value.includes("Google Classroom (")
  );
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function createImportId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
