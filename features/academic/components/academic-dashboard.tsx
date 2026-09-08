"use client";

import { useState } from "react";

import { SubjectCard } from "@/features/academic/components/subject-card";
import { SubjectCreateForm } from "@/features/academic/components/subject-create-form";
import { mockSubjects } from "@/features/academic/data/mock";
import { createUfamRules } from "@/lib/academic-rules/ufam";
import type { Subject } from "@/types/academic";

export function AcademicDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);

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
        onCreate={(draft) => {
          const id = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const subject: Subject = {
            id: id || `disciplina-${Date.now()}`,
            name: draft.name,
            professor: draft.professor,
            semester: "2026/1",
            workloadHours: 60,
            color: draft.color,
            status: "active",
            room: draft.scheduleText ? draft.scheduleText : undefined,
            rules: createUfamRules(),
            schedules: [],
            attendance: [],
            grades: [],
            activities: []
          };

          setSubjects((current) => [subject, ...current]);
        }}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Disciplinas">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </section>
    </div>
  );
}
