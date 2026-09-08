import { getConfiguredAIProvider } from "@/lib/ai/provider";

export async function askAssistantFallback(question: string) {
  const provider = getConfiguredAIProvider();

  if (provider.name === "none") {
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
