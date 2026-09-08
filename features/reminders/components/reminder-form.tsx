"use client";

import { useRouter } from "next/navigation";
import { BellPlus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getTodayInAppTimeZone } from "@/lib/date";
import { useRoutineData } from "@/features/data/routine-store";
import type { Reminder } from "@/types/domain";

const sourceTypes: { value: NonNullable<Reminder["sourceType"]>; label: string }[] = [
  { value: "custom", label: "Livre" },
  { value: "task", label: "Tarefa" },
  { value: "activity", label: "Atividade" },
  { value: "study", label: "Estudo" }
];

interface ReminderFormProps {
  afterCreateHref?: string;
  compact?: boolean;
}

export function ReminderForm({ afterCreateHref, compact = false }: ReminderFormProps) {
  const router = useRouter();
  const { addReminder } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("21:30");
  const [sourceType, setSourceType] = useState<NonNullable<Reminder["sourceType"]>>("custom");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !date || !time) {
      return;
    }

    addReminder({
      title: cleanTitle,
      remindAt: `${date}T${time}:00`,
      sourceType,
      status: "scheduled"
    });

    setTitle("");
    setDate(today);
    setTime("21:30");
    setSourceType("custom");

    if (afterCreateHref) {
      router.push(afterCreateHref);
    }
  }

  return (
    <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center gap-2">
        <BellPlus aria-hidden className="h-5 w-5 text-sky" />
        <h2 className="text-lg font-semibold text-ink">{compact ? "Novo lembrete" : "Adicionar lembrete"}</h2>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Titulo</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-sky"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Separar material da aula"
            required
            value={title}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Data</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-sky"
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Hora</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-sky"
              onChange={(event) => setTime(event.target.value)}
              required
              type="time"
              value={time}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Tipo</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-sky"
              onChange={(event) => setSourceType(event.target.value as NonNullable<Reminder["sourceType"]>)}
              value={sourceType}
            >
              {sourceTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Button className="mt-4 w-full" type="submit">
        <Plus aria-hidden className="h-4 w-4" />
        Salvar lembrete
      </Button>
    </form>
  );
}
