"use client";

import Link from "next/link";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { buildRoutineAssistantResponse, type RoutineAssistantResponse } from "@/lib/ai/routine-assistant";
import { getTodayInAppTimeZone } from "@/lib/date";

const promptSuggestions = [
  "O que devo fazer agora?",
  "O que falta para publicar o app?",
  "Como estao minhas faltas?",
  "Quais prazos vem primeiro?",
  "Como estao minhas medias?"
];

export function AssistantPanel() {
  const { data } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeDetail, setModeDetail] = useState("IA local pronta para responder com os dados cadastrados.");
  const [model, setModel] = useState("");
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [source, setSource] = useState<"ai" | "rules">("rules");
  const starterResponse = useMemo(
    () =>
      buildRoutineAssistantResponse({
        events: data.events,
        appPreference: data.appPreference,
        question: "resumo",
        reminders: data.reminders,
        subjects: data.subjects,
        tasks: data.tasks,
        today
      }),
    [data.appPreference, data.events, data.reminders, data.subjects, data.tasks, today]
  );
  const [response, setResponse] = useState<RoutineAssistantResponse | null>(null);

  const currentResponse = response ?? starterResponse;

  async function ask(nextQuestion: string) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion) {
      return;
    }

    const localResponse = buildRoutineAssistantResponse({
      events: data.events,
      appPreference: data.appPreference,
      question: cleanQuestion,
      reminders: data.reminders,
      subjects: data.subjects,
      tasks: data.tasks,
      today
    });

    setError("");
    setLoading(true);
    setModel("");
    setLastQuestion(cleanQuestion);
    setQuestion("");

    try {
      const result = await fetch("/api/assistant", {
        body: JSON.stringify({
          events: data.events,
          appPreference: data.appPreference,
          question: cleanQuestion,
          reminders: data.reminders,
          subjects: data.subjects,
          tasks: data.tasks,
          today
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!result.ok) {
        throw new Error("Assistant request failed");
      }

      const payload = (await result.json()) as AssistantApiResponse;
      setResponse(payload.response ?? localResponse);
      setSource(payload.source ?? "rules");
      setModel(payload.model ?? "");
      setModeDetail(payload.modeDetail ?? (payload.source === "ai" ? "IA online ativa." : "IA local ativa."));

      if (payload.error) {
        setError("Usei a resposta local porque a IA online nao respondeu.");
      }
    } catch {
      setResponse(localResponse);
      setSource("rules");
      setModeDetail("IA local ativa; nao consegui confirmar a rota online agora.");
      setError("Usei a resposta local porque a IA online nao respondeu.");
    } finally {
      setLoading(false);
    }
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
          <Badge tone={source === "ai" ? "mint" : "sky"}>{source === "ai" ? "IA API" : "IA local"}</Badge>
        </div>
        <p className="mb-4 text-xs leading-5 text-slate-500">{modeDetail}</p>

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
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
            {loading ? "Pensando" : "Perguntar"}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {promptSuggestions.map((suggestion) => (
            <button
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
              disabled={loading}
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
            {model ? `Resposta com ${model}` : "Resposta"}
          </span>
          <Badge tone="neutral">{intentLabels[currentResponse.intent]}</Badge>
        </div>
        {lastQuestion ? <p className="mb-2 text-sm text-white/60">Pergunta: {lastQuestion}</p> : null}
        <p className="text-base leading-7 text-white/90">{currentResponse.answer}</p>
        {error ? <p className="mt-3 text-sm text-white/65">{error}</p> : null}
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

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Base da resposta</h2>
          <div className="mt-3 space-y-2">
            {currentResponse.evidence.map((item) => (
              <div className="flex items-start gap-2 text-sm leading-6 text-slate-700" key={item}>
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Dados que ajudam</h2>
          <div className="mt-3 space-y-2">
            {currentResponse.dataGaps.length ? (
              currentResponse.dataGaps.map((item) => (
                <div className="flex items-start gap-2 text-sm leading-6 text-slate-700" key={item}>
                  <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  {item}
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-600">Os dados principais para essa resposta ja estao cadastrados.</p>
            )}
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
  readiness: "status",
  summary: "resumo"
};

interface AssistantApiResponse {
  error?: string;
  modeDetail?: string;
  model?: string;
  response?: RoutineAssistantResponse;
  source?: "ai" | "rules";
}
