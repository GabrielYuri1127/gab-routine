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
  Mic,
  Send,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  X,
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

const MAX_AUDIO_BYTES = 1_500_000;
const MAX_RECORDING_SECONDS = 60;

export function AssistantPanel() {
  const { addActivity, addAttendanceRecord, addEvent, addGrade, addReminder, addTask, data, updateTask } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const supabaseConfigured = isSupabaseConfigured();
  const [aiHealth, setAiHealth] = useState<AIHealthStatus | null>(null);
  const [audioDraft, setAudioDraft] = useState<AssistantAudioDraft | null>(null);
  const [audioError, setAudioError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeDetail, setModeDetail] = useState("Verificando a IA online.");
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const conversationRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
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

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function ask(nextQuestion: string, nextAudio: AssistantAudioDraft | null = null) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion && !nextAudio) {
      return;
    }

    const pendingContent = cleanQuestion || `Mensagem de voz (${formatDuration(nextAudio?.durationMs ?? 0)})`;
    setAudioError("");
    setError("");
    setLoading(true);
    setQuestion("");
    setAudioDraft(null);
    const requestHistory = conversation.slice(-6).map(({ content, role }) => ({ content, role }));
    setConversation((current) => [
      ...current,
      { content: pendingContent, id: createId("chat-user"), role: "user" as const }
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
          audio: nextAudio
            ? {
                dataUrl: nextAudio.dataUrl,
                durationMs: nextAudio.durationMs,
                mimeType: nextAudio.mimeType
              }
            : undefined,
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
        setAudioDraft(nextAudio);
        setResponse(null);
        setSource("error");
        setError(detail);
        removePendingQuestion(setConversation, pendingContent);
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
      if (payload.transcript) {
        replacePendingQuestion(
          setConversation,
          pendingContent,
          cleanQuestion ? `${cleanQuestion}\nVoz: ${payload.transcript}` : payload.transcript
        );
      }
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
      setAudioDraft(nextAudio);
      setResponse(null);
      removePendingQuestion(setConversation, pendingContent);
      setSource("error");
      setModeDetail(detail);
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question, audioDraft);
  }

  function handleQuestionKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!loading) {
        void ask(question, audioDraft);
      }
    }
  }

  async function startRecording() {
    setAudioError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError("Este navegador nao oferece gravacao de voz. Atualize o Chrome ou use outro navegador.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      const preferredMimeType = getPreferredAudioMimeType();
      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 48_000,
        ...(preferredMimeType ? { mimeType: preferredMimeType } : {})
      });

      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setAudioDraft(null);
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setAudioError("Nao consegui concluir a gravacao. Tente novamente.");
        stopRecording();
      };
      recorder.onstop = () => {
        const durationMs = Math.min(
          MAX_RECORDING_SECONDS * 1_000,
          Math.max(100, Date.now() - recordingStartedAtRef.current)
        );
        const chunks = recordingChunksRef.current;
        const mimeType = normalizeAudioMimeType(chunks[0]?.type || recorder.mimeType);
        releaseRecordingResources();

        if (!mimeType) {
          setAudioError("O formato desta gravacao nao e compativel. Atualize o navegador e tente novamente.");
          return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) {
          setAudioError("A gravacao ficou vazia. Confira a permissao do microfone e tente novamente.");
          return;
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setAudioError("O audio ficou grande demais. Grave uma mensagem mais curta.");
          return;
        }

        void blobToDataUrl(blob)
          .then((dataUrl) => {
            setAudioDraft({ dataUrl, durationMs, mimeType });
          })
          .catch(() => {
            setAudioError("Nao consegui preparar o audio. Tente gravar novamente.");
          });
      };

      recorder.start(250);
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        const elapsedSeconds = Math.min(
          MAX_RECORDING_SECONDS,
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1_000)
        );
        setRecordingSeconds(elapsedSeconds);
        if (elapsedSeconds >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (recordingError) {
      releaseRecordingResources();
      const permissionDenied = recordingError instanceof DOMException && recordingError.name === "NotAllowedError";
      setAudioError(
        permissionDenied
          ? "Permita o uso do microfone para enviar uma mensagem de voz."
          : "Nao consegui abrir o microfone. Confira se outro aplicativo esta usando-o."
      );
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecording(false);

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      releaseRecordingResources();
    }
  }

  function releaseRecordingResources() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    setRecording(false);
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
          {audioDraft ? (
            <div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-line bg-slate-50 p-2">
              <audio
                aria-label={`Mensagem de voz de ${formatDuration(audioDraft.durationMs)}`}
                className="h-10 min-w-0 flex-1"
                controls
                preload="metadata"
                src={audioDraft.dataUrl}
              />
              <button
                aria-label="Remover mensagem de voz"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-foreground"
                onClick={() => setAudioDraft(null)}
                title="Remover mensagem de voz"
                type="button"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
          ) : null}
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
              aria-label={recording ? "Parar gravacao" : "Gravar mensagem de voz"}
              className={
                recording
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-coral text-white transition hover:opacity-90"
                  : "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line text-slate-600 transition hover:bg-slate-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
              }
              disabled={loading || Boolean(audioDraft)}
              onClick={() => {
                if (recording) {
                  stopRecording();
                } else {
                  void startRecording();
                }
              }}
              title={recording ? "Parar gravacao" : "Gravar mensagem de voz"}
              type="button"
            >
              {recording ? <Square aria-hidden className="h-4 w-4 fill-current" /> : <Mic aria-hidden className="h-5 w-5" />}
            </button>
            <button
              aria-label={loading ? "Aguardando resposta" : "Enviar pergunta"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-contrast text-white transition hover:bg-contrast-hover disabled:cursor-not-allowed disabled:opacity-45"
              disabled={loading || recording || (!question.trim() && !audioDraft)}
              title="Enviar pergunta"
              type="submit"
            >
              {loading ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
            </button>
          </div>
          {recording ? (
            <div aria-live="polite" className="mt-2 flex items-center gap-2 text-xs font-medium text-coral">
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-coral" />
              Gravando {formatDuration(recordingSeconds * 1_000)} de 01:00
            </div>
          ) : null}
        </form>

        {audioError ? (
          <div className="mt-3 border-l-2 border-coral bg-coral/5 px-3 py-3 text-sm leading-6 text-slate-700">{audioError}</div>
        ) : null}

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
                        ? "max-w-[88%] whitespace-pre-wrap rounded-lg bg-contrast px-3 py-2 text-sm leading-6 text-white"
                        : "max-w-[92%] whitespace-pre-wrap border-l-2 border-mint bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
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
  transcript?: string;
}

interface AssistantAudioDraft {
  dataUrl: string;
  durationMs: number;
  mimeType: string;
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

function replacePendingQuestion(
  setConversation: React.Dispatch<React.SetStateAction<ConversationMessage[]>>,
  pendingContent: string,
  confirmedContent: string
) {
  setConversation((current) => {
    const latest = current.at(-1);
    if (latest?.role !== "user" || latest.content !== pendingContent) {
      return current;
    }

    return [...current.slice(0, -1), { ...latest, content: confirmedContent }];
  });
}

function getPreferredAudioMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function normalizeAudioMimeType(value: string) {
  const mimeType = value.split(";")[0]?.trim().toLowerCase();
  const supportedMimeTypes = new Set([
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mp3",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/opus",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/x-wav"
  ]);
  return mimeType && supportedMimeTypes.has(mimeType) ? mimeType : "";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
