"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTodayInAppTimeZone } from "@/lib/date";
import { useRoutineData } from "@/features/data/routine-store";
import type { Event } from "@/types/domain";

const eventCategories: { value: Event["category"]; label: string }[] = [
  { value: "appointment", label: "Compromisso" },
  { value: "study", label: "Estudo" },
  { value: "work", label: "Trabalho" },
  { value: "deadline", label: "Prazo" },
  { value: "personal", label: "Pessoal" }
];

interface EventFormProps {
  afterCreateHref?: string;
  compact?: boolean;
  defaultDate?: string;
}

export function EventForm({ afterCreateHref, compact = false, defaultDate }: EventFormProps) {
  const router = useRouter();
  const { addEvent } = useRoutineData();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? getTodayInAppTimeZone());
  const [startsAt, setStartsAt] = useState("16:00");
  const [endsAt, setEndsAt] = useState("");
  const [category, setCategory] = useState<Event["category"]>("appointment");

  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !date) {
      return;
    }

    addEvent({
      title: cleanTitle,
      date,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      category
    });

    setTitle("");
    setStartsAt("16:00");
    setEndsAt("");
    setCategory("appointment");

    if (afterCreateHref) {
      router.push(afterCreateHref);
    }
  }

  return (
    <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center gap-2">
        <CalendarPlus aria-hidden className="h-5 w-5 text-gold" />
        <h2 className="text-lg font-semibold text-ink">{compact ? "Novo compromisso" : "Adicionar compromisso"}</h2>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Titulo</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Resolver documentos"
            required
            value={title}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Data</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Inicio</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setStartsAt(event.target.value)}
              type="time"
              value={startsAt}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Fim</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setEndsAt(event.target.value)}
              type="time"
              value={endsAt}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Tipo</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setCategory(event.target.value as Event["category"])}
              value={category}
            >
              {eventCategories.map((item) => (
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
        Salvar compromisso
      </Button>
    </form>
  );
}
