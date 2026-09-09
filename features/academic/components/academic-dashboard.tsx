"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { SubjectCard } from "@/features/academic/components/subject-card";
import { SubjectCreateForm, type SubjectCreateDraft } from "@/features/academic/components/subject-create-form";
import { createId, useRoutineData } from "@/features/data/routine-store";
import { createUfamRules } from "@/lib/academic-rules/ufam";
import { cn } from "@/lib/utils";
import type { Subject, SubjectStatus } from "@/types/academic";

type SubjectFilter = SubjectStatus | "all";

const filters: { id: SubjectFilter; label: string }[] = [
  { id: "active", label: "Ativas" },
  { id: "paused", label: "Pausadas" },
  { id: "completed", label: "Concluidas" },
  { id: "archived", label: "Arquivadas" },
  { id: "all", label: "Todas" }
];

const statusLabels: Record<SubjectStatus, string> = {
  active: "ativa",
  archived: "arquivada",
  completed: "concluida",
  paused: "pausada"
};

export function AcademicDashboard() {
  const { data, addSubject } = useRoutineData();
  const [filter, setFilter] = useState<SubjectFilter>("active");
  const [query, setQuery] = useState("");

  const filteredSubjects = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return data.subjects.filter((subject) => {
      const matchesFilter = filter === "all" || subject.status === filter;
      const matchesQuery =
        !cleanQuery ||
        `${subject.name} ${subject.code ?? ""} ${subject.professor ?? ""} ${subject.room ?? ""} ${subject.semester}`
          .toLowerCase()
          .includes(cleanQuery);

      return matchesFilter && matchesQuery;
    });
  }, [data.subjects, filter, query]);

  const statusCounts = useMemo(
    () =>
      data.subjects.reduce<Record<SubjectStatus, number>>(
        (counts, subject) => ({
          ...counts,
          [subject.status]: counts[subject.status] + 1
        }),
        { active: 0, archived: 0, completed: 0, paused: 0 }
      ),
    [data.subjects]
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-mint">Faculdade</p>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Semestre atual</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Disciplinas, faltas, notas e atividades em uma visao compacta. As regras iniciais seguem o preset UFAM,
          mas cada disciplina pode mudar seus parametros.
        </p>
      </header>

      <SubjectCreateForm
        onCreate={(draft: SubjectCreateDraft) => {
          const id = buildSubjectId(draft.name, data.subjects);
          const subject: Subject = {
            id,
            name: draft.name,
            code: draft.code,
            professor: draft.professor,
            semester: draft.semester,
            workloadHours: draft.workloadHours,
            color: draft.color,
            status: "active",
            room: draft.room,
            rules: createUfamRules(),
            schedules: draft.firstSchedule
              ? [
                  {
                    ...draft.firstSchedule,
                    id: createId("schedule"),
                    subjectId: id
                  }
                ]
              : [],
            attendance: [],
            grades: [],
            activities: []
          };

          addSubject(subject);
        }}
      />

      <section className="rounded-lg border border-line bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 translate-y-[-50%] text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-line pl-9 pr-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, codigo, professor ou sala"
              value={query}
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {filters.map((item) => (
              <button
                className={cn(
                  "h-11 shrink-0 rounded-lg border border-line px-3 text-sm font-medium text-slate-600",
                  filter === item.id && "border-ink bg-ink text-white"
                )}
                key={item.id}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.entries(statusCounts) as Array<[SubjectStatus, number]>).map(([status, count]) => (
            <Badge key={status} tone={status === "active" ? "mint" : status === "paused" ? "gold" : "neutral"}>
              {count} {statusLabels[status]}
            </Badge>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Disciplinas">
        {filteredSubjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-4 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            Nenhuma disciplina nesse filtro.
          </div>
        ) : null}
        {filteredSubjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </section>
    </div>
  );
}

function buildSubjectId(name: string, subjects: Subject[]) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const fallback = `disciplina-${Date.now()}`;
  const candidate = base || fallback;

  if (!subjects.some((subject) => subject.id === candidate)) {
    return candidate;
  }

  return `${candidate}-${Date.now()}`;
}
