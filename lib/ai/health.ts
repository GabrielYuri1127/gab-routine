import {
  AIProviderError,
  getAIProviderFailure,
  getConfiguredAIProvider,
  type AIProvider,
  type AIProviderFailureCode
} from "./provider";

export type AIHealthCode = "ready" | "not_configured" | "auth_required" | AIProviderFailureCode;

export interface AIHealthStatus {
  available: boolean;
  checkedAt: string;
  code: AIHealthCode;
  configured: boolean;
  detail: string;
  model?: string;
}

const SUCCESS_CACHE_MS = 5 * 60 * 1_000;
const FAILURE_CACHE_MS = 30 * 1_000;

let cachedHealth: { expiresAt: number; value: AIHealthStatus } | null = null;
let pendingHealth: Promise<AIHealthStatus> | null = null;

export async function checkAIHealth(): Promise<AIHealthStatus> {
  const now = Date.now();
  if (cachedHealth && cachedHealth.expiresAt > now) {
    return cachedHealth.value;
  }

  pendingHealth ??= probeAIProvider().finally(() => {
    pendingHealth = null;
  });
  const value = await pendingHealth;
  cachedHealth = {
    expiresAt: now + (value.available ? SUCCESS_CACHE_MS : FAILURE_CACHE_MS),
    value
  };
  return value;
}

export async function probeAIProvider(provider: AIProvider = getConfiguredAIProvider()): Promise<AIHealthStatus> {
  const checkedAt = new Date().toISOString();
  if (provider.name === "none") {
    return {
      available: false,
      checkedAt,
      code: "not_configured",
      configured: false,
      detail: "A IA online ainda nao esta configurada. O motor local continua disponivel."
    };
  }

  try {
    const completion = await provider.complete({
      maxOutputTokens: 512,
      messages: [
        {
          content: "Responda somente com o objeto solicitado para confirmar que este modelo esta disponivel.",
          role: "system"
        },
        { content: "Confirme a disponibilidade.", role: "user" }
      ],
      responseFormat: {
        name: "gavium_ai_health",
        schema: {
          additionalProperties: false,
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
          type: "object"
        },
        strict: true,
        type: "json_schema"
      },
      timeoutMs: 15_000
    });
    const parsed = JSON.parse(completion.content) as { ok?: unknown };
    if (parsed.ok !== true) {
      throw new AIProviderError("invalid_response");
    }

    return {
      available: true,
      checkedAt,
      code: "ready",
      configured: true,
      detail: `IA online testada e pronta com ${completion.model}.`,
      model: completion.model
    };
  } catch (error) {
    const failure = getAIProviderFailure(error instanceof SyntaxError ? new AIProviderError("invalid_response") : error);
    return {
      available: false,
      checkedAt,
      code: failure.code,
      configured: true,
      detail: failure.detail
    };
  }
}
