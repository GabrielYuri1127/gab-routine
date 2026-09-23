export type AIProviderName = "none" | "auto" | "openrouter" | "gemini" | "groq" | "openai" | "local";

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
  provider?: AIProviderName;
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

    const content = payload.output_text ?? extractOutputText(payload);
    if (!content.trim()) {
      throw new AIProviderError("invalid_response", response.status);
    }

    return {
      content,
      model: payload.model ?? this.model,
      provider: "openai"
    };
  }
}

export class GeminiGenerateContentProvider implements AIProvider {
  name: AIProviderName = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta"
  ) {}

  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const systemText = request.messages
      .filter((message) => message.role === "system")
      .map((message) => extractMessageText(message.content))
      .filter(Boolean)
      .join("\n\n");
    const contents = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        parts: toGeminiParts(message.content),
        role: message.role === "assistant" ? "model" : "user"
      }));

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/models/${encodeURIComponent(normalizeGeminiModelId(this.model))}:generateContent`, {
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: request.maxOutputTokens ?? 500,
            ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
            ...(request.responseFormat
              ? {
                  responseJsonSchema: buildGeminiResponseSchema(request.responseFormat),
                  responseMimeType: "application/json"
                }
              : {})
          },
          systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined
        }),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        method: "POST",
        signal: AbortSignal.timeout(request.timeoutMs ?? 20_000)
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      throw new AIProviderError(name === "AbortError" || name === "TimeoutError" ? "timeout" : "service_unavailable");
    }

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as GeminiErrorPayload | null;
      throw new AIProviderError(classifyGeminiError(response.status, errorPayload), response.status);
    }

    const payload = (await response.json().catch(() => null)) as GeminiGenerateContentPayload | null;
    const content = extractGeminiOutputText(payload);
    if (!content) {
      throw new AIProviderError("invalid_response", response.status);
    }

    return {
      content,
      model: payload?.modelVersion ?? this.model,
      provider: "gemini"
    };
  }
}

export class FailoverAIProvider implements AIProvider {
  name: AIProviderName = "auto";

  constructor(private readonly providers: AIProvider[]) {
    if (providers.length < 2) {
      throw new Error("FailoverAIProvider requires at least two providers.");
    }
  }

  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof AIProviderError ? lastError : new AIProviderError("service_unavailable");
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

type AIProviderEnv = Record<string, string | undefined>;

export function getConfiguredAIProvider(env: AIProviderEnv = process.env): AIProvider {
  const configuredProviderName = env.AI_PROVIDER?.trim().toLowerCase();
  const providerName =
    configuredProviderName || (env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.AI_API_KEY ? "auto" : "none");
  const legacyKey = env.AI_API_KEY?.trim();
  const openAIKey = env.OPENAI_API_KEY?.trim() || (providerName !== "gemini" ? legacyKey : undefined);
  const geminiKey = env.GEMINI_API_KEY?.trim() || (providerName === "gemini" ? legacyKey : undefined);
  const openAIModel = env.OPENAI_MODEL?.trim() || (providerName !== "gemini" ? env.AI_MODEL?.trim() : undefined) || "gpt-5";
  const geminiModel = env.GEMINI_MODEL?.trim() || (providerName === "gemini" ? env.AI_MODEL?.trim() : undefined) || "gemini-2.5-flash-lite";

  if (providerName === "none" || !["auto", "gemini", "openai"].includes(providerName)) {
    return new DisabledAIProvider();
  }

  const providers: AIProvider[] = [];
  if ((providerName === "openai" || providerName === "auto") && openAIKey) {
    providers.push(new OpenAIResponsesProvider(openAIKey, openAIModel));
  }
  if ((providerName === "gemini" || providerName === "auto" || providerName === "openai") && geminiKey) {
    providers.push(new GeminiGenerateContentProvider(geminiKey, geminiModel));
  }

  if (providers.length === 0) {
    return new DisabledAIProvider();
  }

  return providers.length === 1 ? providers[0] : new FailoverAIProvider(providers);
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

interface GeminiGenerateContentPayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  modelVersion?: string;
}

interface GeminiErrorPayload {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const failureDetails: Record<AIProviderFailureCode, string> = {
  invalid_api_key: "A chave da IA foi recusada. Confira OPENAI_API_KEY ou GEMINI_API_KEY na Vercel e faca um novo deploy.",
  insufficient_quota: "A conta principal de IA esta sem creditos. Adicione saldo na OpenAI ou configure GEMINI_API_KEY como contingencia.",
  rate_limited: "Os provedores de IA limitaram temporariamente as chamadas. Aguarde alguns minutos e tente novamente.",
  model_unavailable: "O modelo configurado nao esta disponivel para esta chave. Confira OPENAI_MODEL ou GEMINI_MODEL e faca um novo deploy.",
  request_rejected: "O provedor de IA recusou o formato da solicitacao. Revise a configuracao e tente novamente.",
  timeout: "A IA demorou mais que o limite para responder. Tente novamente em alguns instantes.",
  invalid_response: "A IA respondeu, mas o conteudo veio incompleto. Tente novamente.",
  service_unavailable: "Nao foi possivel conectar aos provedores de IA agora. Tente novamente em alguns instantes."
};

function classifyOpenAIError(status: number, payload: OpenAIErrorPayload | null): AIProviderFailureCode {
  const providerCode = `${payload?.error?.code ?? ""} ${payload?.error?.type ?? ""}`.toLowerCase();

  if (status === 401 || providerCode.includes("invalid_api_key")) {
    return "invalid_api_key";
  }
  if (
    providerCode.includes("insufficient_quota") ||
    providerCode.includes("credit_balance_exhausted") ||
    providerCode.includes("organization_spend_limit_exceeded") ||
    providerCode.includes("project_spend_limit_exceeded") ||
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

function classifyGeminiError(status: number, payload: GeminiErrorPayload | null): AIProviderFailureCode {
  const providerCode = `${payload?.error?.status ?? ""} ${payload?.error?.message ?? ""}`.toLowerCase();

  if (status === 401 || status === 403 || providerCode.includes("api key not valid")) {
    return "invalid_api_key";
  }
  if (status === 404 || providerCode.includes("not_found")) {
    return "model_unavailable";
  }
  if (status === 429 || providerCode.includes("resource_exhausted")) {
    return "rate_limited";
  }
  if (status === 400 || status === 422 || providerCode.includes("invalid_argument")) {
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

function extractGeminiOutputText(payload: GeminiGenerateContentPayload | null) {
  return (
    payload?.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text)
      .filter((text): text is string => Boolean(text))
      .join("\n")
      .trim() ?? ""
  );
}

function extractMessageText(content: AIMessage["content"]) {
  if (typeof content === "string") {
    return content;
  }

  return content
    .filter((part): part is Extract<AIInputContentPart, { type: "input_text" }> => part.type === "input_text")
    .map((part) => part.text)
    .join("\n");
}

function toGeminiParts(content: AIMessage["content"]) {
  if (typeof content === "string") {
    return [{ text: content }];
  }

  return content.map((part) => {
    if (part.type === "input_text") {
      return { text: part.text };
    }

    const dataUrl = part.type === "input_image" ? part.image_url : part.file_data;
    return { inlineData: parseInlineData(dataUrl) };
  });
}

function parseInlineData(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=_-]+)$/);
  if (!match) {
    throw new AIProviderError("request_rejected");
  }

  return {
    data: match[2].replace(/-/g, "+").replace(/_/g, "/"),
    mimeType: match[1]
  };
}

function buildGeminiResponseSchema(format: NonNullable<AIProviderRequest["responseFormat"]>) {
  const schema = format === "json" ? { type: "object" } : format.schema;
  return sanitizeGeminiJsonSchema(schema);
}

function sanitizeGeminiJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeGeminiJsonSchema);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const supportedKeys = new Set([
    "$ref",
    "$defs",
    "anyOf",
    "description",
    "enum",
    "format",
    "items",
    "nullable",
    "oneOf",
    "properties",
    "propertyOrdering",
    "required",
    "type"
  ]);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => supportedKeys.has(key))
      .map(([key, child]) => {
        if ((key === "properties" || key === "$defs") && child && typeof child === "object" && !Array.isArray(child)) {
          return [
            key,
            Object.fromEntries(
              Object.entries(child as Record<string, unknown>).map(([propertyName, propertySchema]) => [
                propertyName,
                sanitizeGeminiJsonSchema(propertySchema)
              ])
            )
          ];
        }

        return [key, sanitizeGeminiJsonSchema(child)];
      })
  );
}

function normalizeGeminiModelId(model: string) {
  return model.replace(/^models\//, "");
}
