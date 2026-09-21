"use client";

import { CalendarPlus, Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { weekdayLabels } from "@/lib/date";
import type { SubjectStatus, Weekday } from "@/types/academic";

export interface SubjectCreateDraft {
  code?: string;
  color: string;
  firstSchedule?: {
    classesQuantity: number;
    endTime: string;
    startTime: string;
    weekday: Weekday;
  };
  name: string;
  professor?: string;
  recommendedPeriod: number;
  room?: string;
  semester: string;
  status: SubjectStatus;
  workloadHours: number;
}

interface SubjectCreateFormProps {
  initialPeriod?: number | null;
  onClose: () => void;
  onCreate: (subject: SubjectCreateDraft) => void;
  open: boolean;
}

const colors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];
const weekdays: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const fieldClass =
  "mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-foreground outline-none transition focus:border-strong focus:ring-2 focus:ring-slate-200";

export function SubjectCreateForm({ initialPeriod, onClose, onCreate, open }: SubjectCreateFormProps) {
  const { data } = useRoutineData();
  const preferences = data.appPreference;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [professor, setProfessor] = useState("");
  const [room, setRoom] = useState("");
  const [recommendedPeriod, setRecommendedPeriod] = useState(String(preferences.currentCurriculumPeriod ?? 1));
  const [workloadHours, setWorkloadHours] = useState(String(preferences.defaultWorkloadHours));
  const [status, setStatus] = useState<SubjectStatus>("active");
  const [weekday, setWeekday] = useState<Weekday>("monday");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [classesQuantity, setClassesQuantity] = useState(String(preferences.defaultClassesQuantity));
  const [color, setColor] = useState(colors[0]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setRecommendedPeriod(String(initialPeriod ?? preferences.currentCurriculumPeriod ?? 1));
    setWorkloadHours(String(preferences.defaultWorkloadHours));
  }, [initialPeriod, open, preferences.currentCurriculumPeriod, preferences.defaultWorkloadHours]);

  if (!open) {
    return null;
  }

  function resetForm() {
    setName("");
    setCode("");
    setProfessor("");
    setRoom("");
    setRecommendedPeriod(String(initialPeriod ?? preferences.currentCurriculumPeriod ?? 1));
    setWorkloadHours(String(preferences.defaultWorkloadHours));
    setStatus("active");
    setWeekday("monday");
    setStartTime("");
    setEndTime("");
    setClassesQuantity(String(preferences.defaultClassesQuantity));
    setColor(colors[0]);
  }

  function close() {
    resetForm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5 dark:bg-black/70" role="presentation">
      <section
        aria-labelledby="new-subject-title"
        aria-modal="true"
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-soft sm:max-w-2xl sm:rounded-lg"
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-mint">Matriz curricular</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground" id="new-subject-title">
              Adicionar disciplina
            </h2>
          </div>
          <button
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-foreground"
            onClick={close}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <form
          className="p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              return;
            }

            const period = Math.max(1, Number(recommendedPeriod) || 1);
            onCreate({
              code: code.trim() || undefined,
              color,
              firstSchedule:
                startTime && endTime
                  ? {
                      classesQuantity: Number(classesQuantity) || 1,
                      endTime,
                      startTime,
                      weekday
                    }
                  : undefined,
              name: name.trim(),
              professor: professor.trim() || undefined,
              recommendedPeriod: period,
              room: room.trim() || undefined,
              semester: `${period}º período`,
              status,
              workloadHours: Number(workloadHours) || preferences.defaultWorkloadHours
            });
            close();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Disciplina *</span>
              <input
                autoFocus
                className={fieldClass}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Cálculo II"
                required
                value={name}
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Código</span>
              <input className={fieldClass} onChange={(event) => setCode(event.target.value)} placeholder="MAT204" value={code} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Situação</span>
              <select className={fieldClass} onChange={(event) => setStatus(event.target.value as SubjectStatus)} value={status}>
                <option value="planned">Planejada</option>
                <option value="active">Em andamento</option>
                <option value="completed">Concluída</option>
                <option value="failed">Reprovada</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Período recomendado</span>
              <input
                className={fieldClass}
                min={1}
                onChange={(event) => setRecommendedPeriod(event.target.value)}
                type="number"
                value={recommendedPeriod}
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Carga horária</span>
              <input
                className={fieldClass}
                min={1}
                onChange={(event) => setWorkloadHours(event.target.value)}
                type="number"
                value={workloadHours}
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Professor</span>
              <input className={fieldClass} onChange={(event) => setProfessor(event.target.value)} value={professor} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Sala ou link</span>
              <input className={fieldClass} onChange={(event) => setRoom(event.target.value)} value={room} />
            </label>
          </div>

          <fieldset className="mt-5 border-t border-line pt-5">
            <legend className="flex items-center gap-2 pr-3 text-sm font-semibold text-foreground">
              <CalendarPlus aria-hidden className="h-4 w-4 text-sky" />
              Primeira aula semanal
            </legend>
            <p className="mt-1 text-xs text-slate-500">Opcional. Outros horários podem ser adicionados dentro da disciplina.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <label>
                <span className="text-xs font-medium text-slate-600">Dia</span>
                <select className={fieldClass} onChange={(event) => setWeekday(event.target.value as Weekday)} value={weekday}>
                  {weekdays.map((option) => (
                    <option key={option} value={option}>
                      {weekdayLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">Início</span>
                <input className={fieldClass} onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">Fim</span>
                <input className={fieldClass} onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">Aulas</span>
                <input
                  className={fieldClass}
                  min={1}
                  onChange={(event) => setClassesQuantity(event.target.value)}
                  type="number"
                  value={classesQuantity}
                />
              </label>
            </div>
          </fieldset>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-5">
            <div className="flex items-center gap-2" aria-label="Cor da disciplina">
              {colors.map((option) => (
                <button
                  aria-label={`Usar cor ${option}`}
                  className="h-8 w-8 rounded-full border-2 transition hover:scale-105"
                  key={option}
                  onClick={() => setColor(option)}
                  style={{ backgroundColor: option, borderColor: color === option ? "#15161a" : "transparent" }}
                  type="button"
                />
              ))}
            </div>
            <Button type="submit">
              <Clock3 aria-hidden className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
