"use client";

import { CalendarPlus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { getDeadlineUrgency } from "@/lib/academic-rules/deadlines";
import { cn } from "@/lib/utils";
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

type ActivityFilter = "pending" | "urgent" | "done" | "all";

const filters: { id: ActivityFilter; label: string }[] = [
  { id: "pending", label: "Pendentes" },
  { id: "urgent", label: "Urgentes" },
  { id: "done", label: "Entregues" },
  { id: "all", label: "Todas" }
];

const presets: { label: string; type: ActivityType; time: string }[] = [
  { label: "Prova", type: "exam", time: "08:00" },
  { label: "Lista", type: "list", time: "23:59" },
  { label: "Projeto", type: "project", time: "23:59" },
  { label: "Relatorio", type: "report", time: "23:59" }
];

export function ActivityPanel({ subject }: { subject: Subject }) {
  const { addActivity, removeActivity, updateActivity } = useRoutineData();
  const activities = subject.activities;
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [time, setTime] = useState("23:59");
  const [type, setType] = useState<ActivityType>("activity");
  const [maxScore, setMaxScore] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

  const summary = useMemo(() => {
    const done = activities.filter(isDone).length;
    const urgent = activities.filter((activity) => !isDone(activity) && isUrgent(activity)).length;
    return {
      pending: activities.length - done,
      done,
      urgent
    };
  }, [activities]);

  const sorted = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return [...activities]
      .filter((activity) => {
        if (filter === "pending" && isDone(activity)) {
          return false;
        }

        if (filter === "urgent" && (isDone(activity) || !isUrgent(activity))) {
          return false;
        }

        if (filter === "done" && !isDone(activity)) {
          return false;
        }

        if (typeFilter !== "all" && activity.type !== typeFilter) {
          return false;
        }

        if (!cleanQuery) {
          return true;
        }

        return `${activity.title} ${activity.description ?? ""} ${activity.notes ?? ""}`.toLowerCase().includes(cleanQuery);
      })
      .sort((a, b) => `${a.dueDate}${a.time ?? ""}`.localeCompare(`${b.dueDate}${b.time ?? ""}`));
  }, [activities, filter, query, typeFilter]);

  function createActivity(event: React.FormEvent<HTMLFormElement>) {
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
      maxScore: maxScore ? Number(maxScore) : undefined,
      description: description.trim() || undefined
    };

    addActivity(subject.id, activity);
    setTitle("");
    setDueDate("");
    setTime("23:59");
    setType("activity");
    setMaxScore("");
    setDescription("");
    setFilter("pending");
  }

  return (
    <section className="space-y-4" id="atividades">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Atividades</h2>
          <p className="mt-1 text-sm text-slate-500">Crie, filtre e edite prazos sem sair desta area.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-80">
          <Mini label="Pendentes" value={summary.pending.toString()} />
          <Mini label="Urgentes" value={summary.urgent.toString()} />
          <Mini label="Entregues" value={summary.done.toString()} />
        </div>
      </div>

      <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={createActivity}>
        <div className="mb-3 flex items-center gap-2">
          <CalendarPlus aria-hidden className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold text-ink">Nova atividade</h3>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {presets.map((preset) => (
            <button
              className={cn(
                "h-10 shrink-0 rounded-lg border border-line bg-white px-3 text-sm font-medium text-slate-600",
                type === preset.type && "border-ink bg-ink text-white"
              )}
              key={preset.type}
              onClick={() => {
                setType(preset.type);
                setTime(preset.time);
                if (!title) {
                  setTitle(preset.label);
                }
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

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
          <label className="mt-3 block">
            <span className="text-sm font-medium text-slate-700">Descricao</span>
            <textarea
              className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalhes, link, criterio ou orientacao"
              value={description}
            />
          </label>
        </details>
      </form>

      <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 translate-y-[-50%] text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-line pl-9 pr-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar atividade"
              value={query}
            />
          </label>
          <select
            className="h-11 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
            onChange={(event) => setTypeFilter(event.target.value as ActivityType | "all")}
            value={typeFilter}
          >
            <option value="all">Todos os tipos</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              className={cn(
                "h-9 rounded-lg border border-line px-3 text-sm font-medium text-slate-600",
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

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-4 text-sm text-slate-500">
            Nenhuma atividade nesse filtro.
          </div>
        ) : null}

        {sorted.map((activity) => {
          const urgency = isDone(activity) ? "normal" : getDeadlineUrgency(activity.dueDate);
          const tone = getActivityTone(activity, urgency);

          return (
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={activity.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{activity.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {typeLabels[activity.type]} - {formatDate(activity.dueDate)} {activity.time ? `as ${activity.time}` : ""}
                  </p>
                </div>
                <Badge tone={tone}>{isDone(activity) ? statusLabels[activity.status] : urgencyLabel(urgency)}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink"
                  onChange={(event) => updateActivity(subject.id, activity.id, { status: event.target.value as ActivityStatus })}
                  value={activity.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {!isDone(activity) ? (
                  <Button onClick={() => updateActivity(subject.id, activity.id, { status: "submitted" })} size="sm" variant="secondary">
                    Marcar entregue
                  </Button>
                ) : null}
                <Button aria-label="Excluir atividade" onClick={() => removeActivity(subject.id, activity.id)} size="icon" variant="ghost">
                  <Trash2 aria-hidden className="h-4 w-4" />
                </Button>
              </div>

              <details className="mt-3 rounded-lg border border-dashed border-line p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">Editar detalhes</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_120px]">
                  <label className="text-xs text-slate-500">
                    Titulo
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                      onChange={(event) => updateActivity(subject.id, activity.id, { title: event.target.value })}
                      value={activity.title}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Data
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                      onChange={(event) => updateActivity(subject.id, activity.id, { dueDate: event.target.value })}
                      type="date"
                      value={activity.dueDate}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Hora
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                      onChange={(event) => updateActivity(subject.id, activity.id, { time: event.target.value || undefined })}
                      type="time"
                      value={activity.time ?? ""}
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs text-slate-500">
                    Tipo
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink"
                      onChange={(event) => updateActivity(subject.id, activity.id, { type: event.target.value as ActivityType })}
                      value={activity.type}
                    >
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    Nota maxima
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                      onChange={(event) =>
                        updateActivity(subject.id, activity.id, {
                          maxScore: event.target.value ? Number(event.target.value) : undefined
                        })
                      }
                      step="0.1"
                      type="number"
                      value={activity.maxScore ?? ""}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Peso
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm text-ink outline-none focus:border-ink"
                      onChange={(event) =>
                        updateActivity(subject.id, activity.id, {
                          weight: event.target.value ? Number(event.target.value) : undefined
                        })
                      }
                      step="0.1"
                      type="number"
                      value={activity.weight ?? ""}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs text-slate-500">
                  Descricao
                  <textarea
                    className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-2 py-2 text-sm text-ink outline-none focus:border-ink"
                    onChange={(event) => updateActivity(subject.id, activity.id, { description: event.target.value || undefined })}
                    value={activity.description ?? ""}
                  />
                </label>
              </details>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[10px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function isDone(activity: AcademicActivity) {
  return activity.status === "submitted" || activity.status === "corrected";
}

function isUrgent(activity: AcademicActivity) {
  const urgency = getDeadlineUrgency(activity.dueDate);
  return urgency === "urgent" || urgency === "overdue";
}

function getActivityTone(activity: AcademicActivity, urgency: ReturnType<typeof getDeadlineUrgency>): "neutral" | "mint" | "gold" | "coral" {
  if (isDone(activity)) {
    return "mint";
  }

  if (urgency === "overdue" || urgency === "urgent") {
    return "coral";
  }

  if (urgency === "attention") {
    return "gold";
  }

  return "neutral";
}

function urgencyLabel(urgency: ReturnType<typeof getDeadlineUrgency>) {
  const labels = {
    normal: "Normal",
    attention: "Atencao",
    urgent: "Urgente",
    overdue: "Vencido"
  };

  return labels[urgency];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}
