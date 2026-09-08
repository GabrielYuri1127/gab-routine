"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { getDeadlineUrgency } from "@/lib/academic-rules/deadlines";
import type { AcademicActivity, ActivityStatus, ActivityType, Subject } from "@/types/academic";

const statusLabels: Record<ActivityStatus, string> = {
  not_started: "Nao iniciado",
  in_progress: "Em andamento",
  submitted: "Entregue",
  corrected: "Corrigido",
  late: "Atrasado"
};

const typeLabels: Record<ActivityType, string> = {
  activity: "Atividade",
  exercise: "Exercicio",
  list: "Lista",
  work: "Trabalho",
  project: "Projeto",
  report: "Relatorio",
  presentation: "Apresentacao",
  exam: "Prova",
  seminar: "Seminario",
  lab: "Laboratorio",
  other: "Outro"
};

export function ActivityPanel({ subject }: { subject: Subject }) {
  const { addActivity, updateActivity } = useRoutineData();
  const activities = subject.activities;
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [time, setTime] = useState("23:59");
  const [type, setType] = useState<ActivityType>("activity");
  const [maxScore, setMaxScore] = useState("");
  const sorted = useMemo(
    () => [...activities].sort((a, b) => `${a.dueDate}${a.time ?? ""}`.localeCompare(`${b.dueDate}${b.time ?? ""}`)),
    [activities]
  );

  return (
    <section className="space-y-4" id="atividades">
      <div>
        <h2 className="text-lg font-semibold text-ink">Atividades</h2>
        <p className="mt-1 text-sm text-slate-500">Prazos ordenados automaticamente.</p>
      </div>

      <form
        className="rounded-lg border border-line bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !dueDate) {
            return;
          }

          const activity: AcademicActivity = {
            id: `${subject.id}-activity-${Date.now()}`,
            subjectId: subject.id,
            title: title.trim(),
            dueDate,
            time,
            type,
            status: "not_started",
            maxScore: maxScore ? Number(maxScore) : undefined
          };

          addActivity(subject.id, activity);
          setTitle("");
          setDueDate("");
          setTime("23:59");
          setType("activity");
          setMaxScore("");
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
          <label>
            <span className="text-sm font-medium text-slate-700">Titulo</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Relatorio"
              value={title}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Data</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
          <Button className="mt-6" type="submit">
            <Plus aria-hidden className="h-4 w-4" />
            Salvar
          </Button>
        </div>

        <details className="mt-4 rounded-lg border border-dashed border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">Mais opcoes</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label>
              <span className="text-sm font-medium text-slate-700">Horario</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
                onChange={(event) => setTime(event.target.value)}
                type="time"
                value={time}
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
                onChange={(event) => setType(event.target.value as ActivityType)}
                value={type}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Nota maxima</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
                onChange={(event) => setMaxScore(event.target.value)}
                step="0.1"
                type="number"
                value={maxScore}
              />
            </label>
          </div>
        </details>
      </form>

      <div className="space-y-2">
        {sorted.map((activity) => {
          const urgency = activity.status === "submitted" || activity.status === "corrected" ? "normal" : getDeadlineUrgency(activity.dueDate);
          const tone = activity.status === "submitted" || activity.status === "corrected" ? "mint" : urgency === "overdue" || urgency === "urgent" ? "coral" : urgency === "attention" ? "gold" : "neutral";

          return (
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={activity.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{activity.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {typeLabels[activity.type]} • {formatDate(activity.dueDate)} {activity.time ? `as ${activity.time}` : ""}
                  </p>
                </div>
                <Badge tone={tone}>{activity.status === "submitted" || activity.status === "corrected" ? statusLabels[activity.status] : urgencyLabel(urgency)}</Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <select
                  className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink"
                  onChange={(event) => {
                    const status = event.target.value as ActivityStatus;
                    updateActivity(subject.id, activity.id, { status });
                  }}
                  value={activity.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {activity.status !== "submitted" && activity.status !== "corrected" ? (
                  <Button
                    onClick={() =>
                      updateActivity(subject.id, activity.id, { status: "submitted" })
                    }
                    size="sm"
                    variant="secondary"
                  >
                    Marcar entregue
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function urgencyLabel(urgency: ReturnType<typeof getDeadlineUrgency>) {
  const labels = {
    normal: "Normal",
    attention: "Atenção",
    urgent: "Urgente",
    overdue: "Vencido"
  };

  return labels[urgency];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}
