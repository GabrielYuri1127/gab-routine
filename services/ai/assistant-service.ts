import { getConfiguredAIProvider } from "@/lib/ai/provider";
import { buildRoutineAssistantResponse, type RoutineAssistantInput } from "@/lib/ai/routine-assistant";
import { NATURAL_LANGUAGE_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export interface AssistantServiceResult {
  error?: string;
  modeDetail?: string;
  model?: string;
  response: ReturnType<typeof buildRoutineAssistantResponse>;
  source: "ai" | "rules";
}

export async function askAssistant(question: string, context: Omit<RoutineAssistantInput, "question">): Promise<AssistantServiceResult> {
  const localResponse = buildRoutineAssistantResponse({ ...context, question });
  const provider = getConfiguredAIProvider();

  if (provider.name === "none") {
    return {
      modeDetail: "IA online nao configurada; resposta gerada pelo motor local do Gavium.",
      response: localResponse,
      source: "rules"
    };
  }

  try {
    const completion = await provider.complete({
      maxOutputTokens: 450,
      messages: [
        {
          role: "system",
          content: `${NATURAL_LANGUAGE_SYSTEM_PROMPT}
Voce melhora a resposta do assistente pessoal Gavium.
Use somente os numeros, nomes, datas e links ja calculados pelo sistema.
Mantenha a resposta curta, mas com raciocinio visivel e sem parecer modelo pronto.
Nao remova avisos de dados faltantes.`
        },
        {
          role: "user",
          content: JSON.stringify({
            calculatedResponse: localResponse,
            answerStyle: context.appPreference?.assistantAnswerStyle ?? "balanced",
            userName: context.appPreference?.displayName ?? "",
            question
          })
        }
      ],
      responseFormat: {
        name: "gavium_assistant_response",
        schema: {
          additionalProperties: false,
          properties: {
            answer: { maxLength: 900, type: "string" },
            suggestions: {
              items: { maxLength: 120, type: "string" },
              maxItems: 3,
              minItems: 1,
              type: "array"
            }
          },
          required: ["answer", "suggestions"],
          type: "object"
        },
        strict: true,
        type: "json_schema"
      },
      temperature: 0.2
    });
    const polished = parsePolishedResponse(completion.content);

    return {
      modeDetail: `IA online ativa com ${completion.model}.`,
      model: completion.model,
      response: {
        ...localResponse,
        answer: polished.answer || localResponse.answer,
        suggestions: polished.suggestions.length ? polished.suggestions : localResponse.suggestions
      },
      source: "ai"
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "AI request failed",
      modeDetail: "A IA online falhou; resposta gerada pelo motor local do Gavium.",
      response: localResponse,
      source: "rules"
    };
  }
}

export async function askAssistantFallback(question: string, context?: Omit<RoutineAssistantInput, "question">) {
  if (context) {
    return askAssistant(question, context);
  }

  if (getConfiguredAIProvider().name === "none") {
    return {
      source: "rules" as const,
      answer:
        "A IA ainda nao esta configurada. Por enquanto, o Gavium usa regras internas para mostrar proximos itens, faltas, medias e prazos."
    };
  }

  return {
    source: "ai" as const,
    answer: `Pergunta recebida: ${question}`
  };
}

function parsePolishedResponse(content: string): { answer: string; suggestions: string[] } {
  try {
    const parsed = JSON.parse(content) as Partial<{ answer: unknown; suggestions: unknown }>;
    return {
      answer: typeof parsed.answer === "string" ? parsed.answer.trim() : "",
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string").slice(0, 3)
        : []
    };
  } catch {
    return {
      answer: "",
      suggestions: []
    };
  }
}
