"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { weekdayLabels } from "@/lib/date";
import type { Weekday } from "@/types/academic";

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
  room?: string;
  semester: string;
  workloadHours: number;
}

interface SubjectCreateFormProps {
  onCreate: (subject: SubjectCreateDraft) => void;
}

const colors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];
const weekdays: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function SubjectCreateForm({ onCreate }: SubjectCreateFormProps) {
  const { data } = useRoutineData();
  const preferences = data.appPreference;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [professor, setProfessor] = useState("");
  const [room, setRoom] = useState("");
  const [semester, setSemester] = useState(preferences.defaultSemester);
  const [workloadHours, setWorkloadHours] = useState(String(preferences.defaultWorkloadHours));
  const [weekday, setWeekday] = useState<Weekday>("monday");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [classesQuantity, setClassesQuantity] = useState(String(preferences.defaultClassesQuantity));
  const [color, setColor] = useState(colors[0]);

  return (
    <form
      className="rounded-lg border border-line bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          return;
        }

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
          room: room.trim() || undefined,
          semester: semester.trim() || preferences.defaultSemester,
          workloadHours: Number(workloadHours) || preferences.defaultWorkloadHours
        });
        setName("");
        setCode("");
        setProfessor("");
        setRoom("");
        setSemester(preferences.defaultSemester);
        setWorkloadHours(String(preferences.defaultWorkloadHours));
        setWeekday("monday");
        setStartTime("");
        setEndTime("");
        setClassesQuantity(String(preferences.defaultClassesQuantity));
        setColor(colors[0]);
      }}
    >
      <div>
        <h2 className="text-base font-semibold text-ink">Nova area ou disciplina</h2>
        <p className="mt-1 text-sm text-slate-500">Cadastre estudo, curso, trabalho, projeto ou rotina que deseja acompanhar.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Nome *</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Ingles, Academia, Projeto TCC ou Redes de Computadores"
            required
            value={name}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Responsavel</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
            onChange={(event) => setProfessor(event.target.value)}
            placeholder="Professor, lider, cliente ou opcional"
            value={professor}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Local ou link</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
            onChange={(event) => setRoom(event.target.value)}
            placeholder="Local, sala ou link"
            value={room}
          />
        </label>
      </div>

      <details className="mt-4 rounded-lg border border-dashed border-line p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-600">Mais opcoes</summary>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label>
            <span className="text-sm font-medium text-slate-700">Codigo ou sigla</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              onChange={(event) => setCode(event.target.value)}
              placeholder="IEC..."
              value={code}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Periodo</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              onChange={(event) => setSemester(event.target.value)}
              value={semester}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Carga total</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              min={1}
              onChange={(event) => setWorkloadHours(event.target.value)}
              type="number"
              value={workloadHours}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Dia fixo</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              onChange={(event) => setWeekday(event.target.value as Weekday)}
              value={weekday}
            >
              {weekdays.map((option) => (
                <option key={option} value={option}>
                  {weekdayLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Inicio</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              onChange={(event) => setStartTime(event.target.value)}
              type="time"
              value={startTime}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Fim</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              onChange={(event) => setEndTime(event.target.value)}
              type="time"
              value={endTime}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Encontros</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
              min={1}
              onChange={(event) => setClassesQuantity(event.target.value)}
              type="number"
              value={classesQuantity}
            />
          </label>
        </div>
      </details>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((option) => (
            <button
              aria-label={`Usar cor ${option}`}
              className="h-8 w-8 rounded-full border-2"
              key={option}
              onClick={() => setColor(option)}
              style={{ backgroundColor: option, borderColor: color === option ? "#15161a" : "transparent" }}
              type="button"
            />
          ))}
        </div>
        <Button type="submit">Criar area</Button>
      </div>
    </form>
  );
}
