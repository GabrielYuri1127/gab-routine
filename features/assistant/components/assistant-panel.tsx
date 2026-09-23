"use client";

import Link from "next/link";
import {
  Bot,
  BriefcaseBusiness,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Loader2,
  LogIn,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createId, useRoutineData } from "@/features/data/routine-store";
import type { AIHealthCode, AIHealthStatus } from "@/lib/ai/health";
import type { AssistantCommandProposal } from "@/lib/ai/command-parser";
import type { RoutineAssistantResponse } from "@/lib/ai/routine-assistant";
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

const emptyAssistantResponse: RoutineAssistantResponse = {
  answer: "Envie uma pergunta para receber uma resposta da IA online.",
  dataGaps: [],
  evidence: [],
  highlights: [],
  intent: "conversation",
  quickLinks: [],
  suggestions: []
};

export function AssistantPanel() {
  const { addActivity, addAttendanceRecord, addEvent, addGrade, addReminder, addTask, data, updateTask } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const supabaseConfigured = isSupabaseConfigured();
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeDetail, setModeDetail] = useState("Verificando a IA online.");
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const conversationRef = useRef<HTMLDivElement>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(supabaseConfigured ? undefined : null);
  const [source, setSource] = useState<"ai" | "error">("ai");
  const [response, setResponse] = useState<RoutineAssistantResponse | null>(null);

  const currentResponse = response ?? emptyAssistantResponse;
  const availabilityChecking = aiHealth === null || sessionEmail === undefined;
  const apiReady =
    (aiHealth?.code === "ready" || aiHealth?.code === "configured") &&
    (!supabaseConfigured || Boolean(sessionEmail));
  const assistantBadge = loading
    ? "IA online pensando"
    : availabilityChecking
      ? "Verificando"
      : apiReady
        ? "IA online"
        : "IA indisponivel";
  const assistantModeDetail = availabilityChecking
    ? "Verificando sua conta e a configuracao da IA online."
    : apiReady
      ? response
        ? modeDetail
        : aiHealth?.detail || "IA online pronta para responder."
      : "A IA online precisa de atencao antes de responder.";
  const needsLogin = aiHealth?.code === "auth_required";
  const needsAttention = Boolean(
    sessionEmail && aiHealth?.configured && aiHealth.available === false && aiHealth.code !== "auth_required"
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

      const result = await fetch("/api/assistant/health?probe=1", {
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
          detail: "Nao consegui verificar a IA online agora. Tente novamente em alguns instantes."
        });
      }
    });

    return () => {
      active = false;
    };
  }, [sessionEmail, supabaseConfigured]);

  useEffect(() => {
    const container = conversationRef.current;
    if (container) {
      container.scrollTo({ behavior: "smooth", top: container.scrollHeight });
    }
  }, [conversation, loading]);

  async function ask(nextQuestion: string) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion) {
      return;
    }

    setError("");
    setLoading(true);
    setQuestion("");
    const requestHistory = conversation.slice(-6).map(({ content, role }) => ({ content, role }));
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

      const payload = (await result.json().catch(() => null)) as AssistantApiResponse | null;
      if (!result.ok || !payload) {
        throw new Error(payload?.modeDetail || payload?.error || "Nao consegui acessar a IA online agora.");
      }

      setModeDetail(payload.modeDetail ?? "IA online ativa.");

      if (payload.error || payload.source !== "ai" || !payload.response) {
        const detail = payload.modeDetail ?? "A IA online nao conseguiu responder agora. Tente novamente.";
        setQuestion(cleanQuestion);
        setResponse(null);
        setSource("error");
        setError(detail);
        removePendingQuestion(setConversation, cleanQuestion);
        if (!isTransientAIError(payload.error) || aiHealth?.available !== true) {
          setAiHealth({
            available: false,
            checkedAt: new Date().toISOString(),
            code: toAIHealthCode(payload.error),
            configured: payload.error !== "not_configured",
            detail
          });
        }
        return;
      }

      const nextResponse = applyCommandIfNeeded(payload.response);
      setResponse(nextResponse);
      setConversation((current) => [
        ...current,
        { content: nextResponse.answer, id: createId("chat-assistant"), role: "assistant" as const }
      ].slice(-10));
      setSource("ai");
      setAiHealth({
        available: true,
        checkedAt: new Date().toISOString(),
        code: "ready",
        configured: true,
        detail: payload.modeDetail ?? "IA online pronta.",
        model: payload.model
      });
    } catch (requestError) {
      const detail = requestError instanceof Error ? requestError.message : "Nao consegui acessar a IA online agora.";
      setQuestion(cleanQuestion);
      setResponse(null);
      removePendingQuestion(setConversation, cleanQuestion);
      setSource("error");
      setModeDetail(detail);
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  function handleQuestionKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!loading) {
        void ask(question);
      }
    }
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

  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Bot aria-hidden className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-semibold text-foreground">Assistente</h2>
          </span>
          <Badge tone={!apiReady && (error || source === "error") ? "coral" : apiReady ? "mint" : "sky"}>{assistantBadge}</Badge>
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

        {needsAttention && !error ? (
          <div className="mb-4 border-l-2 border-coral bg-coral/5 px-3 py-3">
            <p className="text-sm leading-6 text-slate-700">{aiHealth?.detail}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="assistant-question">
            Pergunta
          </label>
          <div className="flex items-end gap-2 rounded-lg border border-line bg-white p-2 focus-within:border-strong">
            <textarea
              className="max-h-36 min-h-12 min-w-0 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none"
              id="assistant-question"
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              placeholder="Escreva sua pergunta..."
              rows={2}
              value={question}
            />
            <button
              aria-label={loading ? "Aguardando resposta" : "Enviar pergunta"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-contrast text-white transition hover:bg-contrast-hover disabled:cursor-not-allowed disabled:opacity-45"
              disabled={loading || !question.trim()}
              title="Enviar pergunta"
              type="submit"
            >
              {loading ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
            </button>
          </div>
        </form>

        {error && source === "error" ? (
          <div className="mt-3 border-l-2 border-coral bg-coral/5 px-3 py-3 text-sm leading-6 text-slate-700">{error}</div>
        ) : null}

        {conversation.length || loading ? (
          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Conversa</p>
              <button
                aria-label="Limpar conversa"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-foreground"
                onClick={() => {
                  setConversation([]);
                  setError("");
                  setResponse(null);
                }}
                title="Limpar conversa"
                type="button"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div aria-live="polite" className="max-h-80 space-y-3 overflow-y-auto pr-1" ref={conversationRef}>
              {conversation.map((message) => (
                <div className={message.role === "user" ? "flex justify-end" : "flex justify-start"} key={message.id}>
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[88%] rounded-lg bg-contrast px-3 py-2 text-sm leading-6 text-white"
                        : "max-w-[92%] border-l-2 border-mint bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex items-center gap-2 border-l-2 border-mint bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  Analisando seus dados
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {promptSuggestions.map((suggestion) => {
            const Icon = suggestion.icon;

            return (
              <button
                className="flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-line px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-foreground"
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

      {response && currentResponse.highlights.length ? (
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
      ) : null}

      {response ? (
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
      ) : null}

      {response ? (
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
              {currentResponse.sources?.length ? (
                <div className={currentResponse.evidence.length ? "border-t border-line pt-3" : ""}>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Fontes online</p>
                  <div className="space-y-2">
                    {currentResponse.sources.map((source) => (
                      <a
                        className="flex items-start gap-2 break-words text-sm leading-6 text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                        href={source.url}
                        key={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                        <span>{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              {!currentResponse.evidence.length && !currentResponse.sources?.length ? (
                <p className="text-sm leading-6 text-slate-600">Resposta gerada diretamente pela IA online.</p>
              ) : null}
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
      ) : null}
    </div>
  );
}

interface AssistantApiResponse {
  error?: string;
  modeDetail?: string;
  model?: string;
  response?: RoutineAssistantResponse;
  source?: "ai" | "error";
}

interface ConversationMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

const aiHealthCodes = new Set<AIHealthCode>([
  "auth_required",
  "configured",
  "insufficient_quota",
  "invalid_api_key",
  "invalid_response",
  "model_unavailable",
  "not_configured",
  "rate_limited",
  "ready",
  "request_rejected",
  "service_unavailable",
  "timeout"
]);

function toAIHealthCode(value: string | undefined): AIHealthCode {
  return value && aiHealthCodes.has(value as AIHealthCode) ? (value as AIHealthCode) : "service_unavailable";
}

function isTransientAIError(value: string | undefined) {
  return value === "timeout" || value === "rate_limited" || value === "service_unavailable" || value === "invalid_response";
}

function removePendingQuestion(
  setConversation: React.Dispatch<React.SetStateAction<ConversationMessage[]>>,
  question: string
) {
  setConversation((current) => {
    const latest = current.at(-1);
    return latest?.role === "user" && latest.content === question ? current.slice(0, -1) : current;
  });
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
