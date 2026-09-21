"use client";

import Link from "next/link";
import {
  Bot,
  BriefcaseBusiness,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  LogIn,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createId, useRoutineData } from "@/features/data/routine-store";
import type { AIHealthCode, AIHealthStatus } from "@/lib/ai/health";
import type { AssistantCommandProposal } from "@/lib/ai/command-parser";
import { buildRoutineAssistantResponse, type RoutineAssistantResponse } from "@/lib/ai/routine-assistant";
import { getTodayInAppTimeZone } from "@/lib/date";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const promptSuggestions: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Bot, label: "Oi, o que voce consegue fazer?" },
  { icon: Sparkles, label: "O que devo fazer agora?" },
  { icon: TrendingUp, label: "Como esta meu progresso no curso?" },
  { icon: GraduationCap, label: "Como estao minhas faltas?" },
  { icon: ClipboardCheck, label: "Quais disciplinas precisam de atencao?" },
  { icon: ClipboardCheck, label: "Quais prazos academicos vem primeiro?" },
  { icon: BriefcaseBusiness, label: "Qual e minha prioridade de trabalho hoje?" },
  { icon: GraduationCap, label: "Como estao minhas medias?" },
];

export function AssistantPanel() {
  const { addActivity, addAttendanceRecord, addEvent, addGrade, addReminder, addTask, data, updateTask } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const supabaseConfigured = isSupabaseConfigured();
  const [actionMessage, setActionMessage] = useState("");
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [error, setError] = useState("");
  const [healthRefreshKey, setHealthRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modeDetail, setModeDetail] = useState("IA local pronta para responder com os dados cadastrados.");
  const [model, setModel] = useState("");
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(supabaseConfigured ? undefined : null);
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
  const availabilityChecking = aiHealth === null || sessionEmail === undefined;
  const apiReady = aiHealth?.available === true && (!supabaseConfigured || Boolean(sessionEmail));
  const assistantBadge = response
    ? source === "ai"
      ? "IA API"
      : "IA local"
    : availabilityChecking
      ? "Verificando"
      : apiReady
        ? "IA API pronta"
        : "IA local";
  const assistantModeDetail = response
    ? modeDetail
    : availabilityChecking
      ? "Verificando sua conta e a configuracao da IA online."
      : aiHealth?.detail ?? "Nao consegui verificar a IA online agora; o motor local continua disponivel.";
  const needsLogin = aiHealth?.code === "auth_required";
  const needsAttention = Boolean(
    sessionEmail && aiHealth?.configured && !aiHealth.available && aiHealth.code !== "auth_required"
  );

  useEffect(() => {
    let active = true;

    if (!supabaseConfigured) {
      return () => {
        active = false;
      };
    }

    const client = createSupabaseBrowserClient();
    void client.auth.getSession().then(({ data: sessionData }) => {
      if (active) {
        setSessionEmail(sessionData.session?.user.email ?? null);
      }
    });
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setSessionEmail(session?.user.email ?? null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  useEffect(() => {
    if (sessionEmail === undefined) {
      return;
    }

    let active = true;
    setAiHealth(null);

    void (async () => {
      const headers: Record<string, string> = {};
      if (supabaseConfigured) {
        const { data: sessionData } = await createSupabaseBrowserClient().auth.getSession();
        if (sessionData.session?.access_token) {
          headers.Authorization = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const result = await fetch("/api/assistant/health", {
        cache: "no-store",
        headers
      });
      const payload = (await result.json()) as AIHealthStatus;
      if (!result.ok && result.status !== 401) {
        throw new Error("AI health request failed");
      }
      if (active) {
        setAiHealth(payload);
      }
    })().catch(() => {
      if (active) {
        setAiHealth({
          available: false,
          checkedAt: new Date().toISOString(),
          code: "service_unavailable",
          configured: true,
          detail: "Nao consegui verificar a IA online agora. O motor local continua disponivel."
        });
      }
    });

    return () => {
      active = false;
    };
  }, [healthRefreshKey, sessionEmail, supabaseConfigured]);

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
    setActionMessage("");
    setLoading(true);
    setModel("");
    setLastQuestion(cleanQuestion);
    setQuestion("");
    const requestHistory = conversation.slice(-8).map(({ content, role }) => ({ content, role }));
    setConversation((current) => [
      ...current,
      { content: cleanQuestion, id: createId("chat-user"), role: "user" as const }
    ].slice(-10));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (isSupabaseConfigured()) {
        const { data: sessionData } = await createSupabaseBrowserClient().auth.getSession();
        if (sessionData.session?.access_token) {
          headers.Authorization = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const result = await fetch("/api/assistant", {
        body: JSON.stringify({
          events: data.events,
          history: requestHistory,
          appPreference: data.appPreference,
          question: cleanQuestion,
          reminders: data.reminders,
          subjects: data.subjects,
          tasks: data.tasks,
          today
        }),
        headers,
        method: "POST"
      });

      if (!result.ok) {
        throw new Error("Assistant request failed");
      }

      const payload = (await result.json()) as AssistantApiResponse;
      const nextResponse = applyCommandIfNeeded(payload.response ?? localResponse);
      setResponse(nextResponse);
      setConversation((current) => [
        ...current,
        { content: nextResponse.answer, id: createId("chat-assistant"), role: "assistant" as const }
      ].slice(-10));
      setSource(payload.source ?? "rules");
      setModel(payload.model ?? "");
      setModeDetail(payload.modeDetail ?? (payload.source === "ai" ? "IA online ativa." : "IA local ativa."));

      if (payload.error) {
        const detail = payload.modeDetail ?? "A IA online falhou; usei a resposta local nesta pergunta.";
        setError(detail);
        setAiHealth({
          available: false,
          checkedAt: new Date().toISOString(),
          code: payload.error,
          configured: true,
          detail
        });
      } else if (payload.source === "ai") {
        setAiHealth({
          available: true,
          checkedAt: new Date().toISOString(),
          code: "ready",
          configured: true,
          detail: payload.modeDetail ?? "IA online pronta.",
          model: payload.model
        });
      }
    } catch {
      const nextResponse = applyCommandIfNeeded(localResponse);
      setResponse(nextResponse);
      setConversation((current) => [
        ...current,
        { content: nextResponse.answer, id: createId("chat-assistant"), role: "assistant" as const }
      ].slice(-10));
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

  function applyCommandIfNeeded(nextResponse: RoutineAssistantResponse) {
    if (!nextResponse.commandProposal) {
      return nextResponse;
    }

    const proposal = nextResponse.commandProposal;
    applyCommand(proposal);
    return {
      ...nextResponse,
      answer: getCompletionMessage(proposal),
      commandProposal: undefined,
      dataGaps: proposal.warnings,
      evidence: [
        ...nextResponse.evidence,
        "Acao salva automaticamente porque o comando tinha dados suficientes."
      ],
      suggestions: ["Conferir o registro salvo", "Perguntar qual e a proxima prioridade", "Criar outro comando se precisar"]
    };
  }

  function applyCommand(proposal: AssistantCommandProposal) {
    if (proposal.intent === "register_absence") {
      addAttendanceRecord(proposal.subject.id, {
        date: proposal.date,
        id: createId("absence-ai"),
        notes: "Registrado automaticamente pelo assistente do Gavium.",
        quantity: proposal.quantity,
        status: "absence",
        subjectId: proposal.subject.id
      });
    }

    if (proposal.intent === "add_grade") {
      addGrade(proposal.subject.id, {
        date: proposal.date,
        id: createId("grade-ai"),
        maxScore: proposal.maxScore,
        name: proposal.name,
        notes: "Registrado automaticamente pelo assistente do Gavium.",
        score: proposal.score,
        subjectId: proposal.subject.id
      });
    }

    if (proposal.intent === "add_activity") {
      addActivity(proposal.subject.id, {
        dueDate: proposal.dueDate,
        id: createId("activity-ai"),
        notes: "Criado automaticamente pelo assistente do Gavium.",
        status: "not_started",
        subjectId: proposal.subject.id,
        title: proposal.title,
        type: proposal.activityType
      });
    }

    if (proposal.intent === "add_task") {
      addTask({
        category: proposal.category,
        date: proposal.dueDate,
        description: "Criada automaticamente pelo assistente do Gavium.",
        dueDate: proposal.dueDate,
        priority: proposal.priority,
        title: proposal.title
      });
    }

    if (proposal.intent === "add_reminder") {
      addReminder({
        remindAt: proposal.remindAt,
        sourceType: proposal.sourceType,
        status: "scheduled",
        title: proposal.title
      });
    }

    if (proposal.intent === "add_event") {
      addEvent({
        category: proposal.category,
        date: proposal.date,
        endsAt: proposal.endsAt,
        startsAt: proposal.startsAt,
        title: proposal.title
      });
    }

    if (proposal.intent === "complete_task") {
      updateTask(proposal.task.id, {
        completedAt: new Date().toISOString(),
        status: "done"
      });
    }

    if (proposal.intent === "reschedule_task") {
      updateTask(proposal.task.id, {
        date: proposal.date,
        dueDate: proposal.date,
        snoozedUntil: undefined,
        status: "open",
        ...(proposal.time ? { time: proposal.time } : {})
      });
    }

    setActionMessage(getCompletionMessage(proposal));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Bot aria-hidden className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-semibold text-foreground">Assistente</h2>
          </span>
          <Badge tone={source === "ai" || (!response && apiReady) ? "mint" : "sky"}>{assistantBadge}</Badge>
        </div>
        <p className="mb-4 text-xs leading-5 text-slate-500">{assistantModeDetail}</p>

        {needsLogin ? (
          <div className="mb-4 flex flex-col gap-3 border-l-2 border-mint bg-mint/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-700">A chave da IA esta pronta. Falta apenas entrar na sua conta para proteger seus dados.</p>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-contrast px-4 text-sm font-medium text-white transition hover:bg-contrast-hover"
              href="/login"
            >
              <LogIn aria-hidden className="h-4 w-4" />
              Entrar para ativar
            </Link>
          </div>
        ) : null}

        {needsAttention ? (
          <div className="mb-4 flex flex-col gap-3 border-l-2 border-coral bg-coral/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-700">{aiHealth?.detail}</p>
            <Button
              className="shrink-0"
              onClick={() => setHealthRefreshKey((current) => current + 1)}
              size="sm"
              variant="secondary"
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              Testar novamente
            </Button>
          </div>
        ) : null}

        {conversation.length ? (
          <div className="mb-4 border-y border-line bg-slate-50/70 py-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Conversa recente</p>
              <button
                aria-label="Limpar conversa"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-foreground"
                onClick={() => setConversation([])}
                title="Limpar conversa"
                type="button"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div aria-live="polite" className="max-h-64 space-y-3 overflow-y-auto px-3">
              {conversation.map((message) => (
                <div className={message.role === "user" ? "flex justify-end" : "flex justify-start"} key={message.id}>
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[88%] rounded-lg bg-contrast px-3 py-2 text-sm leading-6 text-white"
                        : "max-w-[88%] border-l-2 border-mint bg-white px-3 py-2 text-sm leading-6 text-slate-700"
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  Analisando seus dados
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Pergunta</span>
            <textarea
              className="mt-1 min-h-28 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 text-sm text-foreground outline-none focus:border-strong"
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

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {promptSuggestions.map((suggestion) => {
            const Icon = suggestion.icon;

            return (
            <button
              className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-foreground"
              disabled={loading}
              key={suggestion.label}
              onClick={() => ask(suggestion.label)}
              type="button"
            >
              <Icon aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{suggestion.label}</span>
            </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-contrast p-4 text-white shadow-soft" style={{ borderTop: `4px solid ${data.appPreference.accentColor}` }}>
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
        {actionMessage && actionMessage !== currentResponse.answer ? (
          <p className="mt-3 text-sm font-medium text-white/75">{actionMessage}</p>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {currentResponse.highlights.map((highlight) => (
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={highlight.label}>
            <p className="text-xs font-semibold uppercase text-slate-400">{highlight.label}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xl font-semibold text-foreground">{highlight.value}</p>
              <Badge tone={highlight.tone}>{highlight.tone === "neutral" ? "ok" : highlight.tone}</Badge>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Proximos passos</h2>
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
          <h2 className="text-lg font-semibold text-foreground">Abrir</h2>
          <div className="mt-3 space-y-2">
            {currentResponse.quickLinks.map((link) => (
              <Link
                className="flex h-10 items-center justify-center rounded-lg border border-line text-sm font-medium text-foreground transition hover:bg-slate-50"
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
          <h2 className="text-lg font-semibold text-foreground">Base da resposta</h2>
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
          <h2 className="text-lg font-semibold text-foreground">Dados que ajudam</h2>
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
  command: "acao",
  conversation: "conversa",
  course_progress: "curso",
  date_time: "data",
  deadlines: "prazos",
  grades: "notas",
  resources: "materiais",
  now: "agora",
  readiness: "status",
  summary: "resumo",
  work: "trabalho"
};

interface AssistantApiResponse {
  error?: AIHealthCode;
  modeDetail?: string;
  model?: string;
  response?: RoutineAssistantResponse;
  source?: "ai" | "rules";
}

interface ConversationMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

function getCompletionMessage(proposal: AssistantCommandProposal) {
  if (proposal.intent === "register_absence") {
    return `Concluido: ${proposal.summary} ${proposal.quantity === 1 ? "registrada" : "registradas"}.`;
  }

  if (proposal.intent === "add_task") {
    return `Concluido: tarefa "${proposal.summary}" adicionada.`;
  }

  if (proposal.intent === "add_reminder") {
    return `Concluido: lembrete "${proposal.summary}" adicionado.`;
  }

  if (proposal.intent === "add_event") {
    return `Concluido: compromisso "${proposal.summary}" adicionado.`;
  }

  if (proposal.intent === "complete_task") {
    return `Concluido: a tarefa "${proposal.task.title}" foi marcada como concluida.`;
  }

  if (proposal.intent === "reschedule_task") {
    return `Concluido: ${proposal.summary}.`;
  }

  return `Concluido: ${proposal.summary} adicionada.`;
}
