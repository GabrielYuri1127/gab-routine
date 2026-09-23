import { z } from "zod";

import {
  AIProviderError,
  getAIProviderFailure,
  getConfiguredAIProvider,
  type AIProviderName
} from "@/lib/ai/provider";
import {
  buildRoutineAssistantResponse,
  type AssistantIntent,
  type RoutineAssistantInput,
  type RoutineAssistantResponse
} from "@/lib/ai/routine-assistant";
import { NATURAL_LANGUAGE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { shouldUseWebSearch } from "@/lib/ai/web-search";

export interface AssistantConversationMessage {
  content: string;
  role: "assistant" | "user";
}

export interface AskAssistantOptions {
  allowOnline?: boolean;
  fallbackError?: string;
  fallbackModeDetail?: string;
  history?: AssistantConversationMessage[];
  promptCacheKey?: string;
  safetyIdentifier?: string;
}

export interface AssistantServiceResult {
  error?: string;
  modeDetail?: string;
  model?: string;
  provider?: AIProviderName;
  response?: RoutineAssistantResponse;
  source: "ai" | "error";
}

const assistantIntentSchema = z.enum([
  "now",
  "date_time",
  "attendance",
  "command",
  "grades",
  "resources",
  "deadlines",
  "readiness",
  "summary",
  "conversation"
]);

const generatedResponseSchema = z
  .object({
    answer: z.string().trim().min(1).max(1_500),
    dataGaps: z.array(z.string().trim().min(1).max(180)).max(4),
    evidence: z.array(z.string().trim().min(1).max(220)).max(5),
    intent: assistantIntentSchema,
    suggestions: z.array(z.string().trim().min(1).max(160)).min(1).max(4)
  })
  .strict();

type GeneratedAssistantResponse = z.infer<typeof generatedResponseSchema>;

export async function askAssistant(
  question: string,
  context: Omit<RoutineAssistantInput, "question">,
  options: AskAssistantOptions = {}
): Promise<AssistantServiceResult> {
  const provider = getConfiguredAIProvider();

  if (provider.name === "none") {
    return {
      error: "not_configured",
      modeDetail: "A IA online ainda nao esta configurada. Adicione OPENAI_API_KEY ou GEMINI_API_KEY na Vercel e publique novamente.",
      source: "error"
    };
  }

  if (options.allowOnline === false) {
    return {
      error: options.fallbackError ?? "auth_required",
      modeDetail:
        options.fallbackModeDetail ??
        "Entre na sua conta para usar a IA online.",
      source: "error"
    };
  }

  const localResponse = buildRoutineAssistantResponse({ ...context, question });
  const enableWebSearch = !localResponse.commandProposal && shouldUseWebSearch(question);

  try {
    const completion = await provider.complete({
      enableWebSearch,
      maxOutputTokens: 1_100,
      messages: [
        {
          role: "system",
          content: `${NATURAL_LANGUAGE_SYSTEM_PROMPT}
Voce e o assistente pessoal inteligente do Gavium.
Responda de verdade a pergunta atual; nao apenas reescreva a resposta calculada.
Use calculatedResponse como fonte confiavel para calculos, acoes, links, datas e alertas ja verificados pelo sistema.
O campo today contem a data atual no fuso America/Manaus. Preserve essa data quando ela fizer parte da pergunta.
Use userContext e recentConversation para personalizar e manter continuidade.
Voce pode orientar sobre estudos, produtividade, rotina, trabalho e organizacao mesmo quando a pergunta nao se encaixar nas regras locais.
Nunca invente dados pessoais, tarefas, disciplinas, notas, faltas, datas, links ou acoes executadas.
Somente diga que uma acao sera salva quando calculatedResponse.commandProposal existir. Sem commandProposal, explique ou peca o dado que falta.
Nao altere nem proponha um comando diferente do commandProposal calculado.
${
  enableWebSearch
    ? "Use a busca online para responder fatos atuais, como clima, noticias, precos e resultados. Diferencie claramente fatos encontrados de inferencias e nao invente informacoes que a busca nao confirmou."
    : "Em evidence, cite apenas fatos presentes no contexto ou deixe a lista vazia. Em dataGaps, informe somente dados realmente ausentes e uteis para responder melhor."
}
Responda em portugues brasileiro natural, direto e especifico. Evite respostas prontas e repetitivas.`
        },
        ...sanitizeHistory(options.history),
        {
          role: "user",
          content: JSON.stringify(buildModelContext(question, context, localResponse))
        }
      ],
      promptCacheKey: options.promptCacheKey,
      responseFormat: enableWebSearch
        ? undefined
        : {
            name: "gavium_assistant_response",
            schema: {
              additionalProperties: false,
              properties: {
                answer: { maxLength: 1_500, type: "string" },
                dataGaps: {
                  items: { maxLength: 180, type: "string" },
                  maxItems: 4,
                  type: "array"
                },
                evidence: {
                  items: { maxLength: 220, type: "string" },
                  maxItems: 5,
                  type: "array"
                },
                intent: {
                  enum: ["now", "date_time", "attendance", "command", "grades", "resources", "deadlines", "readiness", "summary", "conversation"],
                  type: "string"
                },
                suggestions: {
                  items: { maxLength: 160, type: "string" },
                  maxItems: 4,
                  minItems: 1,
                  type: "array"
                }
              },
              required: ["answer", "dataGaps", "evidence", "intent", "suggestions"],
              type: "object"
            },
            strict: true,
            type: "json_schema"
          },
      safetyIdentifier: options.safetyIdentifier
    });

    if (enableWebSearch) {
      return {
        modeDetail: `IA online ativa com ${completion.model}, busca atual e fontes consultadas.`,
        model: completion.model,
        provider: completion.provider,
        response: buildWebAssistantResponse(question, localResponse, completion.content, completion.sources),
        source: "ai"
      };
    }

    const generated = parseGeneratedResponse(completion.content);

    if (!generated) {
      throw new AIProviderError("invalid_response");
    }

    return {
      modeDetail: `IA online ativa com ${completion.model}, contexto da rotina e memoria recente.`,
      model: completion.model,
      provider: completion.provider,
      response: mergeGeneratedResponse(localResponse, generated),
      source: "ai"
    };
  } catch (error) {
    const failure = getAIProviderFailure(error);
    return {
      error: failure.code,
      modeDetail: failure.detail,
      source: "error"
    };
  }
}

function buildModelContext(
  question: string,
  context: Omit<RoutineAssistantInput, "question">,
  calculatedResponse: RoutineAssistantResponse
) {
  return {
    calculatedResponse,
    currentQuestion: question,
    today: context.today,
    userContext: {
      answerStyle: context.appPreference?.assistantAnswerStyle ?? "balanced",
      contexts: context.appPreference?.contexts ?? [],
      courseOrArea: context.appPreference?.courseOrArea ?? "",
      displayName: context.appPreference?.displayName ?? "",
      primaryContext: context.appPreference?.primaryContext ?? "",
      productivityGoal: context.appPreference?.productivityGoal ?? ""
    },
    routineData: {
      events: context.events.slice(0, 40).map(({ category, date, endsAt, startsAt, title }) => ({
        category,
        date,
        endsAt,
        startsAt,
        title
      })),
      reminders: context.reminders.slice(0, 40).map(({ remindAt, sourceType, status, title }) => ({
        remindAt,
        sourceType,
        status,
        title
      })),
      subjects: context.subjects.slice(0, 20).map((subject) => ({
        activities: subject.activities.slice(0, 20).map(({ dueDate, status, time, title, type }) => ({ dueDate, status, time, title, type })),
        attendance: subject.attendance.slice(0, 40).map(({ date, quantity, status }) => ({ date, quantity, status })),
        code: subject.code,
        grades: subject.grades.slice(0, 20).map(({ date, maxScore, name, score, weight }) => ({ date, maxScore, name, score, weight })),
        name: subject.name,
        resources: (subject.resources ?? []).slice(0, 15).map(({ notes, title, type, url }) => ({ notes, title, type, url })),
        rules: subject.rules,
        schedules: subject.schedules,
        semester: subject.semester,
        status: subject.status
      })),
      tasks: context.tasks.slice(0, 80).map(({ category, date, dueDate, priority, status, time, title }) => ({
        category,
        date,
        dueDate,
        priority,
        status,
        time,
        title
      }))
    }
  };
}

function sanitizeHistory(history: AssistantConversationMessage[] | undefined) {
  return (history ?? [])
    .slice(-6)
    .map((message) => ({
      content: message.content.trim().slice(0, 1_000),
      role: message.role
    }))
    .filter((message) => message.content.length > 0);
}

function parseGeneratedResponse(content: string): GeneratedAssistantResponse | null {
  try {
    const parsed = generatedResponseSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function mergeGeneratedResponse(localResponse: RoutineAssistantResponse, generated: GeneratedAssistantResponse): RoutineAssistantResponse {
  const commandMode = Boolean(localResponse.commandProposal);

  return {
    ...localResponse,
    answer: generated.answer,
    dataGaps: uniqueStrings(commandMode ? localResponse.dataGaps : [...localResponse.dataGaps, ...generated.dataGaps], 5),
    evidence: uniqueStrings(commandMode ? localResponse.evidence : generated.evidence.length ? generated.evidence : localResponse.evidence, 6),
    intent: (commandMode ? "command" : generated.intent) as AssistantIntent,
    suggestions: uniqueStrings(generated.suggestions, 4)
  };
}

function buildWebAssistantResponse(
  question: string,
  localResponse: RoutineAssistantResponse,
  answer: string,
  sources: RoutineAssistantResponse["sources"]
): RoutineAssistantResponse {
  const preserveDateContext = localResponse.intent === "date_time";

  return {
    ...localResponse,
    answer: answer.trim(),
    dataGaps: [],
    evidence: preserveDateContext ? localResponse.evidence : [],
    highlights: preserveDateContext ? localResponse.highlights : [],
    intent: preserveDateContext ? "date_time" : "conversation",
    quickLinks: preserveDateContext ? localResponse.quickLinks : [],
    sources: sources ?? [],
    suggestions: buildWebSuggestions(question)
  };
}

function buildWebSuggestions(question: string) {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/(?:temperatura|graus|clima|chuva|tempo)/.test(normalized)) {
    return ["Ver a previsao para amanha", "Perguntar se vai chover hoje", "Organizar minha rotina com esse clima"];
  }
  if (/(?:noticia|noticias)/.test(normalized)) {
    return ["Resumir as noticias principais", "Explicar uma dessas noticias", "Voltar para minhas prioridades"];
  }

  return ["Aprofundar essa resposta", "Consultar outra informacao atual", "Voltar para minha rotina"];
}

function uniqueStrings(values: string[], limit: number) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}
