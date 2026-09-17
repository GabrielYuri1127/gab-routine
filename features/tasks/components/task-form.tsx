"use client";

import { useRouter } from "next/navigation";
import { CheckSquare, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getTodayInAppTimeZone } from "@/lib/date";
import { useRoutineData } from "@/features/data/routine-store";
import type { Priority, TaskStatus } from "@/types/domain";

const categories = ["Produtividade", "Rotina", "Estudo", "Trabalho", "Pessoal", "Faculdade"];

interface TaskFormProps {
  afterCreateHref?: string;
  compact?: boolean;
}

export function TaskForm({ afterCreateHref, compact = false }: TaskFormProps) {
  const router = useRouter();
  const { addTask } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>("open");
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("25");
  const [dependencyNotes, setDependencyNotes] = useState("");
  const [blockedReason, setBlockedReason] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const minutes = Number(estimatedMinutes);
    addTask({
      title: cleanTitle,
      description: description.trim() || undefined,
      priority,
      category,
      date: date || undefined,
      dueDate: date || undefined,
      time: time || undefined,
      estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
      blockedReason: blockedReason.trim() || undefined,
      dependencyNotes: dependencyNotes.trim() || undefined,
      status
    });

    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("open");
    setCategory(categories[0]);
    setDate(today);
    setTime("");
    setEstimatedMinutes("25");
    setDependencyNotes("");
    setBlockedReason("");

    if (afterCreateHref) {
      router.push(afterCreateHref);
    }
  }

  return (
    <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center gap-2">
        <CheckSquare aria-hidden className="h-5 w-5 text-mint" />
        <h2 className="text-lg font-semibold text-ink">{compact ? "Nova tarefa" : "Adicionar tarefa"}</h2>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Titulo</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: revisar aula, enviar relatorio ou organizar agenda"
            required
            value={title}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Data</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Hora</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setTime(event.target.value)}
              type="time"
              value={time}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Prioridade</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setPriority(event.target.value as Priority)}
              value={priority}
            >
              <option value="low">Baixa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Status</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              value={status}
            >
              <option value="open">Aberta</option>
              <option value="blocked">Bloqueada</option>
              <option value="snoozed">Adiada</option>
              <option value="done">Feita</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Categoria</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Minutos</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
              min={5}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
              step={5}
              type="number"
              value={estimatedMinutes}
            />
          </label>
        </div>

        <details className="rounded-lg border border-dashed border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">Dependencias e bloqueios</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500">Depende de</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
                onChange={(event) => setDependencyNotes(event.target.value)}
                placeholder="Ex.: professor liberar material"
                value={dependencyNotes}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-500">Motivo do bloqueio</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
                onChange={(event) => setBlockedReason(event.target.value)}
                placeholder="Ex.: aguardando resposta"
                value={blockedReason}
              />
            </label>
          </div>
        </details>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Descricao</span>
          <textarea
            className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-mint"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalhes opcionais"
            value={description}
          />
        </label>
      </div>

      <Button className="mt-4 w-full" type="submit">
        <Plus aria-hidden className="h-4 w-4" />
        Salvar tarefa
      </Button>
    </form>
  );
}
