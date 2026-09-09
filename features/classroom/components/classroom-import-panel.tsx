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
import { cn } from "@/lib/utils";
import type { AcademicActivity, Subject } from "@/types/academic";
import type { ClassroomCourse, ClassroomCourseWork, ClassroomImportPayload } from "@/types/classroom";

const CLASSROOM_IMPORT_STORAGE_KEY = "gab-routine:classroom:last-import";

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
  const [payload, setPayload] = useState<ClassroomImportPayload | null>(null);
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

    const storedImport = window.localStorage.getItem(CLASSROOM_IMPORT_STORAGE_KEY);
    if (storedImport) {
      try {
        setPayload(JSON.parse(storedImport) as ClassroomImportPayload);
      } catch {
        window.localStorage.removeItem(CLASSROOM_IMPORT_STORAGE_KEY);
      }
    }

    const query = new URLSearchParams(window.location.search).get("classroom");
    if (query === "import-ready") {
      setMessage("Google Classroom conectado. Revise a previa e importe quando estiver pronto.");
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
    const courses = payload?.courses.length ?? 0;
    const courseWork = payload?.courses.reduce((total, item) => total + item.courseWork.length, 0) ?? 0;
    const datedCourseWork =
      payload?.courses.reduce(
        (total, item) => total + item.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length,
        0
      ) ?? 0;

    return { courses, courseWork, datedCourseWork };
  }, [payload]);

  function clearPayload() {
    window.localStorage.removeItem(CLASSROOM_IMPORT_STORAGE_KEY);
    setPayload(null);
    setMessage("Previa do Google Classroom removida.");
  }

  function importIntoRoutine() {
    if (!payload) {
      return;
    }

    const result = mergeClassroomPayload(data, payload);
    replaceData(result.data);
    setMessage(
      `Importei ${result.summary.subjects} disciplina(s) e ${result.summary.activities} atividade(s). ${result.summary.skipped} item(ns) ja existiam ou nao tinham data.`
    );
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
            Traga turmas e trabalhos com prazo para dentro de Faculdade. O Gab routine usa somente leitura e nao altera nada no Google.
          </p>
        </div>
        <Badge tone={status?.configured ? "mint" : "gold"}>{status?.configured ? "Pronto para conectar" : "Aguardando chaves"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Mini label="Turmas na previa" value={totals.courses.toString()} />
        <Mini label="Itens encontrados" value={totals.courseWork.toString()} />
        <Mini label="Com prazo" value={totals.datedCourseWork.toString()} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status?.configured ? (
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-black"
            href="/api/classroom/connect"
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Conectar Google Classroom
          </a>
        ) : (
          <Button disabled>
            <AlertCircle aria-hidden className="h-4 w-4" />
            Configure as chaves
          </Button>
        )}

        <Button disabled={!payload || totals.datedCourseWork === 0} onClick={importIntoRoutine} variant="secondary">
          <UploadCloud aria-hidden className="h-4 w-4" />
          Importar para Faculdade
        </Button>

        <Button disabled={!payload} onClick={clearPayload} variant="ghost">
          <Trash2 aria-hidden className="h-4 w-4" />
          Limpar previa
        </Button>
      </div>

      {!status?.configured ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Use `GOOGLE_CLASSROOM_CLIENT_ID`, `GOOGLE_CLASSROOM_CLIENT_SECRET` e `GOOGLE_CLASSROOM_REDIRECT_URI` no ambiente do app.
        </div>
      ) : null}

      {payload ? (
        <div className="mt-4 space-y-2">
          {payload.courses.slice(0, 5).map((item) => (
            <div className="rounded-lg border border-line p-3" key={item.course.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.course.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.course.section || item.course.room || "Sem secao"} - {item.courseWork.length} item(ns)
                  </p>
                </div>
                <Badge tone={item.courseWork.some((work) => toDateKeyFromClassroomDueDate(work.dueDate)) ? "sky" : "neutral"}>
                  {item.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length} com prazo
                </Badge>
              </div>
            </div>
          ))}

          {payload.courses.length > 5 ? (
            <p className="text-xs text-slate-500">Mais {payload.courses.length - 5} turma(s) serao consideradas na importacao.</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-line p-3 text-sm text-slate-500">
          <RefreshCw aria-hidden className="h-4 w-4" />
          Nenhuma previa importada ainda.
        </div>
      )}

      {message ? (
        <p className={cn("mt-3 flex items-center gap-2 text-sm font-medium", message.startsWith("Importei") ? "text-mint" : "text-slate-600")}>
          {message.startsWith("Importei") ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : null}
          {message}
        </p>
      ) : null}
    </section>
  );
}

function mergeClassroomPayload(data: RoutineData, payload: ClassroomImportPayload) {
  const nextSubjects = [...data.subjects];
  const summary: ImportResult = { activities: 0, skipped: 0, subjects: 0 };

  payload.courses.forEach((item, index) => {
    const marker = getCourseMarker(item.course);
    const existingIndex = nextSubjects.findIndex(
      (subject) => subject.observations?.includes(marker) || normalizeName(subject.name) === normalizeName(item.course.name)
    );
    const existingSubject = existingIndex >= 0 ? nextSubjects[existingIndex] : undefined;
    const subjectId = existingSubject?.id ?? createId("classroom-subject");
    const activities = [...(existingSubject?.activities ?? [])];

    item.courseWork.forEach((work) => {
      const activity = buildActivityFromCourseWork(work, subjectId, activities);
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
        observations: mergeNotes(existingSubject.observations, buildCourseNotes(item.course)),
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
      semester: getCurrentSemester(),
      workloadHours: 60,
      color: subjectColors[index % subjectColors.length],
      status: "active",
      rules: createUfamRules(),
      schedules: [],
      attendance: [],
      grades: [],
      activities,
      observations: buildCourseNotes(item.course)
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

function buildActivityFromCourseWork(work: ClassroomCourseWork, subjectId: string, currentActivities: AcademicActivity[]) {
  const dueDate = toDateKeyFromClassroomDueDate(work.dueDate);
  if (!dueDate) {
    return undefined;
  }

  const marker = getCourseWorkMarker(work);
  const duplicated = currentActivities.some(
    (activity) =>
      activity.notes?.includes(marker) || (normalizeName(activity.title) === normalizeName(work.title) && activity.dueDate === dueDate)
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

function buildCourseNotes(course: ClassroomCourse) {
  return [
    getCourseMarker(course),
    course.descriptionHeading ? `Descricao: ${course.descriptionHeading}` : "",
    course.alternateLink ? `Link: ${course.alternateLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function getCourseMarker(course: ClassroomCourse) {
  return `Google Classroom: ${course.id}`;
}

function getCourseWorkMarker(work: ClassroomCourseWork) {
  return `Google Classroom: ${work.courseId}/${work.id}`;
}

function getCurrentSemester() {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() < 6 ? "1" : "2"}`;
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
