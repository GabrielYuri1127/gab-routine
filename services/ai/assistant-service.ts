import { getConfiguredAIProvider } from "@/lib/ai/provider";
import { buildRoutineAssistantResponse, type RoutineAssistantInput } from "@/lib/ai/routine-assistant";

export async function askAssistantFallback(question: string, context?: Omit<RoutineAssistantInput, "question">) {
  const provider = getConfiguredAIProvider();

  if (provider.name === "none") {
    if (context) {
      return {
        source: "rules" as const,
        ...buildRoutineAssistantResponse({ ...context, question })
      };
    }

    return {
      source: "rules" as const,
      answer:
        "A IA ainda nao esta configurada. Por enquanto, o Gab routine usa regras internas para mostrar proximos itens, faltas, medias e prazos."
    };
  }

  return {
    source: "ai" as const,
    answer: `Pergunta recebida: ${question}`
  };
}
