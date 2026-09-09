"use client";

import { AlertCircle, CheckCircle2, ExternalLink, GraduationCap, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";
import { createId, useRoutineData } from "@/features/data/routine-store";
import { createUfamRules } from "@/lib/academic-rules/ufam";
import {
  mapClassroomCourseWorkType,
  toDateKeyFromClassroomDueDate,
  toTimeFromClassroomDueTime
} from "@/lib/classroom/google-classroom";
import type { AcademicActivity } from "@/types/academic";
import type { ClassroomAccount, ClassroomCourse, ClassroomCourseWork, ClassroomImportPayload } from "@/types/classroom";

const CLASSROOM_IMPORT_STORAGE_KEY = "gab-routine:classroom:last-import";
const CLASSROOM_IMPORTS_STORAGE_KEY = "gab-routine:classroom:imports";

interface ClassroomStatus {
  callbackPath: string;
  configured: boolean;
  scopes: string[];
}

interface ImportResult {
  activities: number;
  skipped: number;
  subjects: number;
}

const subjectColors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];

export function ClassroomImportPanel() {
  const { data, replaceData } = useRoutineData();
  const [status, setStatus] = useState<ClassroomStatus | null>(null);
  const [imports, setImports] = useState<ClassroomImportPayload[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/classroom/status")
      .then((response) => response.json())
      .then((nextStatus: ClassroomStatus) => {
        if (active) {
          setStatus(nextStatus);
        }
      })
      .catch(() => {
        if (active) {
          setStatus({ callbackPath: "/api/classroom/callback", configured: false, scopes: [] });
        }
      });

    setImports(readStoredImports());

    const query = new URLSearchParams(window.location.search).get("classroom");
    if (query === "import-ready") {
      setMessage("Conta do Google Classroom conectada. Revise a previa e importe quando estiver pronto.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "missing") {
      setMessage("Configure as chaves do Google Classroom antes de conectar.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "error" || query === "invalid-state") {
      setMessage("Nao consegui concluir a conexao com o Google Classroom.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const courses = imports.reduce((total, item) => total + item.courses.length, 0);
    const courseWork = imports.reduce((total, item) => total + item.courses.reduce((sum, course) => sum + course.courseWork.length, 0), 0);
    const datedCourseWork = imports.reduce(
      (total, item) =>
        total +
        item.courses.reduce(
          (sum, course) => sum + course.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length,
          0
        ),
      0
    );

    return { courses, courseWork, datedCourseWork };
  }, [imports]);

  function clearImport(target: ClassroomImportPayload) {
    const nextImports = imports.filter((item) => getImportKey(item) !== getImportKey(target));
    window.localStorage.setItem(CLASSROOM_IMPORTS_STORAGE_KEY, JSON.stringify(nextImports));
    window.localStorage.removeItem(CLASSROOM_IMPORT_STORAGE_KEY);
    setImports(nextImports);
    setMessage("Previa dessa conta removida.");
  }

  function importOne(target: ClassroomImportPayload) {
    const result = mergeClassroomPayload(data, target);
    replaceData(result.data);
    setMessage(formatImportMessage(result.summary, getAccountLabel(target)));
  }

  function importAll() {
    const total: ImportResult = { activities: 0, skipped: 0, subjects: 0 };
    const mergedData = imports.reduce((currentData, item) => {
      const result = mergeClassroomPayload(currentData, item);
      total.activities += result.summary.activities;
      total.skipped += result.summary.skipped;
      total.subjects += result.summary.subjects;
      return result.data;
    }, data);

    replaceData(mergedData);
    setMessage(formatImportMessage(total, "todas as contas"));
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap aria-hidden className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-ink">Google Classroom</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Conecte uma ou mais contas institucionais. Cada conta fica separada na previa e pode ser importada sem misturar origem.
          </p>
        </div>
        <Badge tone={status?.configured ? "mint" : "gold"}>{status?.configured ? "Pronto para conectar" : "Aguardando chaves"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Mini label="Contas" value={imports.length.toString()} />
        <Mini label="Turmas" value={totals.courses.toString()} />
        <Mini label="Itens com prazo" value={totals.datedCourseWork.toString()} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status?.configured ? (
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-black"
            href="/api/classroom/connect"
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Adicionar conta Classroom
          </a>
        ) : (
          <Button disabled>
            <AlertCircle aria-hidden className="h-4 w-4" />
            Configure as chaves
          </Button>
        )}

        <Button disabled={imports.length < 2 || totals.datedCourseWork === 0} onClick={importAll} variant="secondary">
          <UploadCloud aria-hidden className="h-4 w-4" />
          Importar todas
        </Button>
      </div>

      {!status?.configured ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Use <code>GOOGLE_CLASSROOM_CLIENT_ID</code>, <code>GOOGLE_CLASSROOM_CLIENT_SECRET</code> e{" "}
          <code>GOOGLE_CLASSROOM_REDIRECT_URI</code> no ambiente do app.
        </div>
      ) : null}

      {imports.length ? (
        <div className="mt-4 space-y-3">
          {imports.map((item) => {
            const accountTotals = getImportTotals(item);

            return (
              <div className="rounded-lg border border-line p-3" key={getImportKey(item)}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{getAccountLabel(item)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {accountTotals.courses} turma(s), {accountTotals.courseWork} item(ns), {accountTotals.datedCourseWork} com prazo
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button disabled={accountTotals.datedCourseWork === 0} onClick={() => importOne(item)} size="sm" variant="secondary">
                      Importar
                    </Button>
                    <Button aria-label="Remover previa" onClick={() => clearImport(item)} size="icon" variant="ghost">
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {item.courses.slice(0, 4).map((courseItem) => (
                    <div className="rounded-lg border border-line bg-slate-50 p-3" key={courseItem.course.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{courseItem.course.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {courseItem.course.section || courseItem.course.room || "Sem secao"} - {courseItem.courseWork.length} item(ns)
                          </p>
                        </div>
                        <Badge tone={courseItem.courseWork.some((work) => toDateKeyFromClassroomDueDate(work.dueDate)) ? "sky" : "neutral"}>
                          {courseItem.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length} com prazo
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {item.courses.length > 4 ? (
                    <p className="text-xs text-slate-500">Mais {item.courses.length - 4} turma(s) dessa conta entram na importacao.</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-line p-3 text-sm text-slate-500">
          <RefreshCw aria-hidden className="h-4 w-4" />
          Nenhuma conta importada ainda.
        </div>
      )}

      {message ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
          {message.startsWith("Importei") ? <CheckCircle2 aria-hidden className="h-4 w-4 text-mint" /> : null}
          {message}
        </p>
      ) : null}
    </section>
  );
}

function readStoredImports() {
  const imports = parseImports(window.localStorage.getItem(CLASSROOM_IMPORTS_STORAGE_KEY));
  const legacyImport = parseImport(window.localStorage.getItem(CLASSROOM_IMPORT_STORAGE_KEY));

  if (!legacyImport) {
    return imports;
  }

  const hasLegacy = imports.some((item) => getImportKey(item) === getImportKey(legacyImport));
  return hasLegacy ? imports : [legacyImport, ...imports].slice(0, 8);
}

function parseImports(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as ClassroomImportPayload[];
    return Array.isArray(parsed) ? parsed.filter(isImportPayload) : [];
  } catch {
    return [];
  }
}

function parseImport(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as ClassroomImportPayload;
    return isImportPayload(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isImportPayload(value: ClassroomImportPayload) {
  return Boolean(value && Array.isArray(value.courses) && value.fetchedAt);
}

function mergeClassroomPayload(data: RoutineData, payload: ClassroomImportPayload) {
  const nextSubjects = [...data.subjects];
  const summary: ImportResult = { activities: 0, skipped: 0, subjects: 0 };

  payload.courses.forEach((item, index) => {
    const marker = getCourseMarker(item.course, payload.account);
    const legacyMarker = `Google Classroom: ${item.course.id}`;
    const existingIndex = nextSubjects.findIndex(
      (subject) =>
        subject.observations?.includes(marker) ||
        subject.observations?.includes(legacyMarker) ||
        (!payload.account && normalizeName(subject.name) === normalizeName(item.course.name))
    );
    const existingSubject = existingIndex >= 0 ? nextSubjects[existingIndex] : undefined;
    const subjectId = existingSubject?.id ?? createId("classroom-subject");
    const activities = [...(existingSubject?.activities ?? [])];

    item.courseWork.forEach((work) => {
      const activity = buildActivityFromCourseWork(work, subjectId, payload.account, activities);
      if (!activity) {
        summary.skipped += 1;
        return;
      }

      activities.unshift(activity);
      summary.activities += 1;
    });

    if (existingSubject) {
      nextSubjects[existingIndex] = {
        ...existingSubject,
        code: existingSubject.code ?? item.course.section,
        observations: mergeNotes(existingSubject.observations, buildCourseNotes(item.course, payload.account)),
        room: existingSubject.room ?? item.course.room,
        activities
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
      observations: buildCourseNotes(item.course, payload.account)
    });
    summary.subjects += 1;
  });

  return {
    data: {
      ...data,
      userId: data.userId || LOCAL_USER_ID,
      subjects: nextSubjects
    },
    summary
  };
}

function buildActivityFromCourseWork(
  work: ClassroomCourseWork,
  subjectId: string,
  account: ClassroomAccount | undefined,
  currentActivities: AcademicActivity[]
) {
  const dueDate = toDateKeyFromClassroomDueDate(work.dueDate);
  if (!dueDate) {
    return undefined;
  }

  const marker = getCourseWorkMarker(work, account);
  const legacyMarker = `Google Classroom: ${work.courseId}/${work.id}`;
  const duplicated = currentActivities.some(
    (activity) =>
      activity.notes?.includes(marker) ||
      activity.notes?.includes(legacyMarker) ||
      (normalizeName(activity.title) === normalizeName(work.title) && activity.dueDate === dueDate)
  );

  if (duplicated) {
    return undefined;
  }

  return {
    id: createId("classroom-activity"),
    subjectId,
    title: work.title,
    dueDate,
    time: toTimeFromClassroomDueTime(work.dueTime) ?? "23:59",
    type: mapClassroomCourseWorkType(work.workType),
    status: "not_started",
    maxScore: work.maxPoints,
    description: work.description,
    notes: [marker, work.alternateLink ? `Link: ${work.alternateLink}` : ""].filter(Boolean).join("\n")
  } satisfies AcademicActivity;
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

function getCourseMarker(course: ClassroomCourse, account?: ClassroomAccount) {
  return `Google Classroom${account?.email ? ` (${account.email})` : ""}: ${course.id}`;
}

function getCourseWorkMarker(work: ClassroomCourseWork, account?: ClassroomAccount) {
  return `Google Classroom${account?.email ? ` (${account.email})` : ""}: ${work.courseId}/${work.id}`;
}

function getAccountLabel(payload: ClassroomImportPayload) {
  const account = payload.account;
  if (!account) {
    return "Conta Google";
  }

  if (account.name && account.email) {
    return `${account.name} - ${account.email}`;
  }

  return account.email ?? account.name ?? "Conta Google";
}

function getImportKey(payload: ClassroomImportPayload) {
  return payload.account?.id ?? payload.account?.email ?? payload.importId ?? payload.fetchedAt;
}

function getImportTotals(payload: ClassroomImportPayload) {
  const courses = payload.courses.length;
  const courseWork = payload.courses.reduce((total, item) => total + item.courseWork.length, 0);
  const datedCourseWork = payload.courses.reduce(
    (total, item) => total + item.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length,
    0
  );

  return { courses, courseWork, datedCourseWork };
}

function formatImportMessage(summary: ImportResult, accountLabel: string) {
  return `Importei ${summary.subjects} disciplina(s) e ${summary.activities} atividade(s) de ${accountLabel}. ${summary.skipped} item(ns) ja existiam ou nao tinham data.`;
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

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
