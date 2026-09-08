"use client";

import Link from "next/link";
import { Bell, BookOpen, CheckCircle2, Clock, NotebookTabs } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { calculateAttendanceSummary } from "@/lib/academic-rules/attendance";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import { formatLongDate, getCurrentWeekday } from "@/lib/date";
import { extraTodayBlocks, getClassBlocksForWeekday, getPendingActivities, mockSubjects } from "@/features/academic/data/mock";

const seedTasks = [
  { id: "finalizar-relatorio", title: "Finalizar relatorio", done: false, priority: "urgent" },
  { id: "revisar-redes", title: "Revisar Redes", done: false, priority: "high" },
  { id: "organizar-amanha", title: "Organizar amanha", done: false, priority: "medium" }
];

export function TodayOverview() {
  const [now, setNow] = useState<Date | null>(null);
  const [tasks, setTasks] = useState(seedTasks);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const todayBlocks = useMemo(() => {
    const weekday = now ? getCurrentWeekday(now) : "monday";
    return [...getClassBlocksForWeekday(weekday), ...extraTodayBlocks].sort((a, b) => a.time.localeCompare(b.time));
  }, [now]);

  const nextBlock = useMemo(() => {
    if (!now) {
      return todayBlocks[0];
    }

    const currentTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Manaus",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);

    return todayBlocks.find((block) => block.time >= currentTime) ?? null;
  }, [now, todayBlocks]);

  const sortedTasks = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));
  const pendingActivities = getPendingActivities().slice(0, 3);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-mint">Bom dia</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Gab routine</h1>
          <p className="mt-1 text-sm text-slate-500">{now ? formatLongDate(now) : "Carregando data..."}</p>
        </div>
        <button
          aria-label="Centro de notificacoes sera ativado na Fase 3"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-slate-400"
          disabled
          type="button"
        >
          <Bell aria-hidden className="h-5 w-5" />
        </button>
      </header>

      <section className="rounded-lg bg-ink p-4 text-white shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Proximo</p>
          <Clock aria-hidden className="h-4 w-4 text-white/70" />
        </div>
        {nextBlock ? (
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{nextBlock.time}</p>
              <p className="mt-1 text-base text-white/85">{nextBlock.title}</p>
            </div>
            <Badge tone={nextBlock.type === "class" ? "mint" : nextBlock.type === "study" ? "sky" : "gold"}>
              {nextBlock.type === "class" ? "Aula" : nextBlock.type === "study" ? "Estudo" : "Rotina"}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-white/80">Nada restante hoje. Bom momento para planejar amanha.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Hoje</h2>
          <Link className="text-sm font-medium text-mint" href="/semana">
            Ver semana
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-white shadow-sm">
          {todayBlocks.map((block) => (
            <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0" key={block.id}>
              <span className="text-sm font-semibold text-ink">{block.time}</span>
              <span className="min-w-0 truncate text-sm text-slate-700">{block.title}</span>
              <Badge tone={block.type === "class" ? "mint" : block.type === "study" ? "sky" : "gold"}>
                {block.type === "class" ? "aula" : block.type === "study" ? "estudo" : "fixo"}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Pendentes</h2>
        <div className="rounded-lg border border-line bg-white shadow-sm">
          {sortedTasks.map((task) => (
            <label className="flex min-h-12 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0" key={task.id}>
              <input
                checked={task.done}
                className="h-5 w-5 rounded border-line text-ink"
                onChange={(event) =>
                  setTasks((current) =>
                    current.map((item) => (item.id === task.id ? { ...item, done: event.target.checked } : item))
                  )
                }
                type="checkbox"
              />
              <span className={`min-w-0 flex-1 text-sm ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {task.title}
              </span>
              {task.priority === "urgent" ? <Badge tone="coral">urgente</Badge> : null}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Faculdade</h2>
          <Link className="text-sm font-medium text-mint" href="/faculdade">
            Abrir
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {mockSubjects.slice(0, 2).map((subject) => {
            const attendance = calculateAttendanceSummary(subject.attendance, subject.rules, subject.name);
            const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);
            const pendingCount = subject.activities.filter(
              (activity) => activity.status !== "submitted" && activity.status !== "corrected"
            ).length;

            return (
              <Link className="rounded-lg border border-line bg-white p-4 shadow-sm" href={`/faculdade/${subject.id}`} key={subject.id}>
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen aria-hidden className="h-4 w-4" style={{ color: subject.color }} />
                  <h3 className="truncate text-sm font-semibold uppercase text-ink">{subject.name}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric label="Media" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
                  <MiniMetric label="Frequencia" value={`${Math.round(attendance.frequency)}%`} />
                  <MiniMetric label="Atividades" value={`${pendingCount}`} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <NotebookTabs aria-hidden className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold text-ink">Prazos proximos</h2>
        </div>
        <div className="space-y-2">
          {pendingActivities.map((activity) => (
            <div className="flex items-center justify-between gap-3" key={activity.id}>
              <p className="min-w-0 truncate text-sm text-slate-700">{activity.title}</p>
              <span className="shrink-0 text-xs text-slate-500">{formatShortDate(activity.dueDate)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-slate-600">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          Modo rapido ativo
        </div>
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}
