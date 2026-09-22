export type AIProviderName = "none" | "openrouter" | "gemini" | "groq" | "openai" | "local";

export type AIInputContentPart =
  | { text: string; type: "input_text" }
  | { detail?: "auto" | "high" | "low"; image_url: string; type: "input_image" }
  | { file_data: string; filename: string; type: "input_file" };

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIInputContentPart[];
}

export interface AIProviderRequest {
  messages: AIMessage[];
  maxOutputTokens?: number;
  promptCacheKey?: string;
  temperature?: number;
  responseFormat?: "json" | JsonSchemaResponseFormat;
  safetyIdentifier?: string;
  timeoutMs?: number;
}

export interface AIProviderResponse {
  content: string;
  model: string;
}

export interface AIProvider {
  name: AIProviderName;
  complete(request: AIProviderRequest): Promise<AIProviderResponse>;
}

export interface JsonSchemaResponseFormat {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
  type: "json_schema";
}

export type AIProviderFailureCode =
  | "invalid_api_key"
  | "insufficient_quota"
  | "rate_limited"
  | "model_unavailable"
  | "request_rejected"
  | "timeout"
  | "invalid_response"
  | "service_unavailable";

export interface AIProviderFailure {
  code: AIProviderFailureCode;
  detail: string;
}

export class AIProviderError extends Error {
  constructor(
    public readonly code: AIProviderFailureCode,
    public readonly status?: number
  ) {
    super(`AI provider failed: ${code}`);
    this.name = "AIProviderError";
  }
}

export class DisabledAIProvider implements AIProvider {
  name: AIProviderName = "none";

  async complete(): Promise<AIProviderResponse> {
    throw new Error("AI provider is disabled. The app should keep working without AI.");
  }
}

export class OpenAIResponsesProvider implements AIProvider {
  name: AIProviderName = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl = "https://api.openai.com/v1"
  ) {}

  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const instructions = request.messages
      .filter((message) => message.role === "system")
      .map((message) => (typeof message.content === "string" ? message.content : ""))
      .filter(Boolean)
      .join("\n\n");
    const input = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        content: message.content,
        role: message.role
      }));

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/responses`, {
        body: JSON.stringify({
          input,
          instructions: instructions || undefined,
          max_output_tokens: request.maxOutputTokens ?? 500,
          model: this.model,
          prompt_cache_key: request.promptCacheKey,
          safety_identifier: request.safetyIdentifier,
          store: false,
          ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
          text: request.responseFormat ? { format: buildTextFormat(request.responseFormat) } : undefined
        }),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        signal: AbortSignal.timeout(request.timeoutMs ?? 20_000)
      });
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      const name = error instanceof Error ? error.name : "";
      throw new AIProviderError(name === "AbortError" || name === "TimeoutError" ? "timeout" : "service_unavailable");
    }

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as OpenAIErrorPayload | null;
      throw new AIProviderError(classifyOpenAIError(response.status, errorPayload), response.status);
    }

    const payload = (await response.json().catch(() => null)) as OpenAIResponsesPayload | null;
    if (!payload) {
      throw new AIProviderError("invalid_response", response.status);
    }

    return {
      content: payload.output_text ?? extractOutputText(payload),
      model: payload.model ?? this.model
    };
  }
}

export function getAIProviderFailure(error: unknown): AIProviderFailure {
  const code = error instanceof AIProviderError ? error.code : "service_unavailable";

  return {
    code,
    detail: failureDetails[code]
  };
}

function buildTextFormat(format: AIProviderRequest["responseFormat"]) {
  if (!format || format === "json") {
    return { type: "json_object" };
  }

  return {
    name: format.name,
    schema: format.schema,
    strict: format.strict ?? true,
    type: "json_schema"
  };
}

export function getConfiguredAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  const apiKey = process.env.AI_API_KEY;

  if (providerName === "openai" && apiKey) {
    return new OpenAIResponsesProvider(apiKey, process.env.AI_MODEL || "gpt-5");
  }

  return new DisabledAIProvider();
}

interface OpenAIResponsesPayload {
  model?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
}

interface OpenAIErrorPayload {
  error?: {
    code?: string;
    type?: string;
  };
}

const failureDetails: Record<AIProviderFailureCode, string> = {
  invalid_api_key: "A chave da OpenAI foi recusada. Atualize AI_API_KEY na Vercel e faca um novo deploy.",
  insufficient_quota: "A conta da OpenAI esta sem creditos ou atingiu o limite de uso. Ajuste o faturamento antes de tentar novamente.",
  rate_limited: "A OpenAI limitou temporariamente as chamadas. Aguarde alguns minutos e tente novamente.",
  model_unavailable: "O modelo configurado em AI_MODEL nao esta disponivel para esta chave. Escolha um modelo liberado e faca um novo deploy.",
  request_rejected: "A OpenAI recusou o formato da solicitacao. Revise a configuracao e tente novamente.",
  timeout: "A OpenAI demorou mais que o limite para responder. Tente novamente em alguns instantes.",
  invalid_response: "A OpenAI respondeu, mas o conteudo veio incompleto. Tente novamente.",
  service_unavailable: "Nao foi possivel conectar a OpenAI agora. Tente novamente em alguns instantes."
};

function classifyOpenAIError(status: number, payload: OpenAIErrorPayload | null): AIProviderFailureCode {
  const providerCode = `${payload?.error?.code ?? ""} ${payload?.error?.type ?? ""}`.toLowerCase();

  if (status === 401 || providerCode.includes("invalid_api_key")) {
    return "invalid_api_key";
  }
  if (
    providerCode.includes("insufficient_quota") ||
    providerCode.includes("billing_hard_limit") ||
    providerCode.includes("billing_not_active")
  ) {
    return "insufficient_quota";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 404 || providerCode.includes("model_not_found") || providerCode.includes("unsupported_model")) {
    return "model_unavailable";
  }
  if (status === 400 || status === 403 || status === 422) {
    return "request_rejected";
  }
  return "service_unavailable";
}

function extractOutputText(payload: OpenAIResponsesPayload) {
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n")
      .trim() ?? ""
  );
}
