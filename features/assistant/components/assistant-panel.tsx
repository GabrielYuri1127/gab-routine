"use client";

import Link from "next/link";
import { Bot, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { buildRoutineAssistantResponse, type RoutineAssistantResponse } from "@/lib/ai/routine-assistant";
import { getTodayInAppTimeZone } from "@/lib/date";

const promptSuggestions = [
  "O que devo fazer agora?",
  "Como estao minhas faltas?",
  "Quais prazos vem primeiro?",
  "Como estao minhas medias?"
];

export function AssistantPanel() {
  const { data } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const [question, setQuestion] = useState("");
  const starterResponse = useMemo(
    () =>
      buildRoutineAssistantResponse({
        events: data.events,
        question: "resumo",
        reminders: data.reminders,
        subjects: data.subjects,
        tasks: data.tasks,
        today
      }),
    [data.events, data.reminders, data.subjects, data.tasks, today]
  );
  const [response, setResponse] = useState<RoutineAssistantResponse | null>(null);

  const currentResponse = response ?? starterResponse;

  function ask(nextQuestion: string) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion) {
      return;
    }

    setResponse(
      buildRoutineAssistantResponse({
        events: data.events,
        question: cleanQuestion,
        reminders: data.reminders,
        subjects: data.subjects,
        tasks: data.tasks,
        today
      })
    );
    setQuestion("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Bot aria-hidden className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-semibold text-ink">Assistente</h2>
          </span>
          <Badge tone="sky">IA local</Badge>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Pergunta</span>
            <textarea
              className="mt-1 min-h-28 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-ink"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: o que devo priorizar hoje?"
              value={question}
            />
          </label>
          <Button className="w-full" type="submit">
            <Send aria-hidden className="h-4 w-4" />
            Perguntar
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {promptSuggestions.map((suggestion) => (
            <button
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
              key={suggestion}
              onClick={() => ask(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-ink p-4 text-white shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-white/75">
            <Sparkles aria-hidden className="h-4 w-4" />
            Resposta
          </span>
          <Badge tone="neutral">{intentLabels[currentResponse.intent]}</Badge>
        </div>
        <p className="text-base leading-7 text-white/90">{currentResponse.answer}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {currentResponse.highlights.map((highlight) => (
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={highlight.label}>
            <p className="text-xs font-semibold uppercase text-slate-400">{highlight.label}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xl font-semibold text-ink">{highlight.value}</p>
              <Badge tone={highlight.tone}>{highlight.tone === "neutral" ? "ok" : highlight.tone}</Badge>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Proximos passos</h2>
          <div className="mt-3 space-y-2">
            {currentResponse.suggestions.map((suggestion) => (
              <div className="flex items-center gap-2 text-sm text-slate-700" key={suggestion}>
                <span aria-hidden className="h-2 w-2 rounded-full bg-mint" />
                {suggestion}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Abrir</h2>
          <div className="mt-3 space-y-2">
            {currentResponse.quickLinks.map((link) => (
              <Link
                className="flex h-10 items-center justify-center rounded-lg border border-line text-sm font-medium text-ink transition hover:bg-slate-50"
                href={link.href}
                key={`${link.href}-${link.label}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const intentLabels: Record<RoutineAssistantResponse["intent"], string> = {
  attendance: "faltas",
  deadlines: "prazos",
  grades: "notas",
  now: "agora",
  summary: "resumo"
};
