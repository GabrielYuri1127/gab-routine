import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { weekdayLabels } from "@/lib/date";
import { mockSubjects } from "@/features/academic/data/mock";
import type { Weekday } from "@/types/academic";

const weekdays: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function WeekView() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Semana</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Aulas do semestre</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Nesta fase, a semana ja mostra aulas geradas pelos horarios das disciplinas. Tarefas, estudos e
          compromissos entram quando a persistencia for ativada.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Semana">
        {weekdays.map((weekday) => {
          const classes = mockSubjects.flatMap((subject) =>
            subject.schedules
              .filter((schedule) => schedule.weekday === weekday)
              .map((schedule) => ({ subject, schedule }))
          );

          return (
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={weekday}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase text-ink">{weekdayLabels[weekday]}</h2>
                <Badge tone={classes.length ? "mint" : "neutral"}>{classes.length} aulas</Badge>
              </div>

              {classes.length === 0 ? (
                <p className="text-sm text-slate-500">Sem aulas cadastradas.</p>
              ) : (
                <div className="space-y-2">
                  {classes.map(({ subject, schedule }) => (
                    <Link
                      className="grid grid-cols-[58px_1fr] gap-3 rounded-lg border border-line px-3 py-2 transition hover:bg-slate-50"
                      href={`/faculdade/${subject.id}`}
                      key={schedule.id}
                    >
                      <span className="text-sm font-semibold text-ink">{schedule.startTime}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-700">{subject.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {subject.room ?? "Sala nao informada"} • {schedule.classesQuantity} aulas
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
