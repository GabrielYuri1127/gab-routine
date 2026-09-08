"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Subject } from "@/types/academic";

interface SubjectCreateFormProps {
  onCreate: (subject: Pick<Subject, "name" | "professor" | "color"> & { scheduleText: string }) => void;
}

const colors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f"];

export function SubjectCreateForm({ onCreate }: SubjectCreateFormProps) {
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [color, setColor] = useState(colors[0]);

  return (
    <form
      className="rounded-lg border border-line bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          return;
        }

        onCreate({ name: name.trim(), professor: professor.trim(), scheduleText: scheduleText.trim(), color });
        setName("");
        setProfessor("");
        setScheduleText("");
        setColor(colors[0]);
      }}
    >
      <div>
        <h2 className="text-base font-semibold text-ink">Nova disciplina</h2>
        <p className="mt-1 text-sm text-slate-500">Cadastro rapido, so com o essencial.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Nome *</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Redes de Computadores"
            required
            value={name}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Professor</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
            onChange={(event) => setProfessor(event.target.value)}
            placeholder="Opcional"
            value={professor}
          />
        </label>

        <label>
          <span className="text-sm font-medium text-slate-700">Dias e horarios</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
            onChange={(event) => setScheduleText(event.target.value)}
            placeholder="Seg e Qua, 08:00"
            value={scheduleText}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
        <Button type="submit">Criar</Button>
      </div>
    </form>
  );
}
