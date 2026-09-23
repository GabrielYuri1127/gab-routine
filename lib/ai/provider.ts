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
  enableWebSearch?: boolean;
  messages: AIMessage[];
  maxOutputTokens?: number;
  promptCacheKey?: string;
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
  temperature?: number;
  responseFormat?: "json" | JsonSchemaResponseFormat;
  safetyIdentifier?: string;
  timeoutMs?: number;
}

export interface AIProviderSource {
  title: string;
  url: string;
}

export interface AIProviderResponse {
  content: string;
  model: string;
  provider?: AIProviderName;
  sources?: AIProviderSource[];
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

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const LEGACY_GEMINI_DEFAULTS = new Set(["gemini-2.5-flash-lite"]);
const PREFERRED_GEMINI_MODELS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash"
];

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
          reasoning:
            request.reasoningEffort && supportsOpenAIReasoning(this.model)
              ? { effort: request.reasoningEffort }
              : undefined,
          safety_identifier: request.safetyIdentifier,
          store: false,
          ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
          text: request.responseFormat ? { format: buildTextFormat(request.responseFormat) } : undefined,
          tools: request.enableWebSearch ? [{ type: "web_search" }] : undefined
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
      provider: "openai",
      sources: extractOpenAISources(payload)
    };
  }
}

export class GeminiGenerateContentProvider implements AIProvider {
  name: AIProviderName = "gemini";
  private resolvedModel: string | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta"
  ) {}

  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const configuredModel = normalizeGeminiModelId(this.model);
    const initialModel = this.resolvedModel ?? migrateLegacyGeminiDefault(configuredModel);

    try {
      const completion = await this.completeWithModel(request, initialModel);
      this.resolvedModel = initialModel;
      return completion;
    } catch (error) {
      if (!(error instanceof AIProviderError) || error.code !== "model_unavailable") {
        throw error;
      }

      const fallbackModel = await this.resolveAvailableModel(new Set([initialModel]), request.timeoutMs);
      if (!fallbackModel) {
        throw error;
      }

      const completion = await this.completeWithModel(request, fallbackModel);
      this.resolvedModel = fallbackModel;
      return completion;
    }
  }

  private async completeWithModel(request: AIProviderRequest, model: string): Promise<AIProviderResponse> {
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
      response = await fetch(`${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: request.maxOutputTokens ?? 500,
            ...buildGeminiThinkingConfig(model, request.reasoningEffort),
            ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
            ...(request.responseFormat
              ? {
                  responseJsonSchema: buildGeminiResponseSchema(request.responseFormat),
                  responseMimeType: "application/json"
                }
              : {})
          },
          systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
          tools: request.enableWebSearch ? [{ google_search: {} }] : undefined
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
      model: payload?.modelVersion ?? model,
      provider: "gemini",
      sources: extractGeminiSources(payload)
    };
  }

  private async resolveAvailableModel(excludedModels: Set<string>, timeoutMs = 20_000) {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/models?pageSize=1000`, {
        headers: { "x-goog-api-key": this.apiKey },
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as GeminiModelListPayload | null;
    return selectAvailableGeminiModel(payload, excludedModels);
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
    const totalTimeoutMs = request.timeoutMs ?? 20_000;
    const deadline = Date.now() + totalTimeoutMs;

    for (const [index, provider] of this.providers.entries()) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new AIProviderError("timeout");
      }

      const providersAfterThis = this.providers.length - index - 1;
      const reserveMs =
        providersAfterThis > 0 ? Math.min(15_000, Math.max(5_000, Math.floor(totalTimeoutMs / 3))) : 0;
      const attemptTimeoutMs = Math.max(1_000, remainingMs - reserveMs);

      try {
        return await provider.complete({ ...request, timeoutMs: attemptTimeoutMs });
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
  const geminiModel = env.GEMINI_MODEL?.trim() || (providerName === "gemini" ? env.AI_MODEL?.trim() : undefined) || DEFAULT_GEMINI_MODEL;

  if (providerName === "none" || !["auto", "gemini", "openai"].includes(providerName)) {
    return new DisabledAIProvider();
  }

  const providers: AIProvider[] = [];
  if (providerName === "auto") {
    if (geminiKey) {
      providers.push(new GeminiGenerateContentProvider(geminiKey, geminiModel));
    }
    if (openAIKey) {
      providers.push(new OpenAIResponsesProvider(openAIKey, openAIModel));
    }
  } else if (providerName === "openai") {
    if (openAIKey) {
      providers.push(new OpenAIResponsesProvider(openAIKey, openAIModel));
    }
    if (geminiKey) {
      providers.push(new GeminiGenerateContentProvider(geminiKey, geminiModel));
    }
  } else if (geminiKey) {
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
      annotations?: Array<{
        title?: string;
        type?: string;
        url?: string;
      }>;
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
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          title?: string;
          uri?: string;
        };
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

interface GeminiModelListPayload {
  models?: Array<{
    baseModelId?: string;
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
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
  if (
    status === 404 ||
    providerCode.includes("not_found") ||
    providerCode.includes("not found") ||
    providerCode.includes("not supported for generatecontent")
  ) {
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

function extractOpenAISources(payload: OpenAIResponsesPayload) {
  return normalizeSources(
    (payload.output ?? [])
      .flatMap((item) => item.content ?? [])
      .flatMap((content) => content.annotations ?? [])
      .filter((annotation) => annotation.type === "url_citation")
      .map((annotation) => ({
        title: annotation.title ?? "Fonte consultada",
        url: annotation.url ?? ""
      }))
  );
}

function extractGeminiSources(payload: GeminiGenerateContentPayload | null) {
  return normalizeSources(
    (payload?.candidates ?? [])
      .flatMap((candidate) => candidate.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => ({
        title: chunk.web?.title ?? "Fonte consultada",
        url: chunk.web?.uri ?? ""
      }))
  );
}

function normalizeSources(sources: AIProviderSource[]) {
  const seen = new Set<string>();

  return sources
    .filter((source) => {
      try {
        const url = new URL(source.url);
        if (!(["http:", "https:"] as string[]).includes(url.protocol) || seen.has(url.href)) {
          return false;
        }
        seen.add(url.href);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 5)
    .map((source) => ({
      title: source.title.trim() || new URL(source.url).hostname,
      url: source.url
    }));
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

function buildGeminiThinkingConfig(model: string, effort: AIProviderRequest["reasoningEffort"]) {
  if (!effort) {
    return {};
  }

  if (/^gemini-3(?:\.|-)/i.test(model)) {
    const thinkingLevel = effort === "minimal" && /gemini-(?:3\.1-pro|3\.[78]-flash)/i.test(model) ? "low" : effort;
    return { thinkingConfig: { thinkingLevel } };
  }

  if (/^gemini-2\.5-(?:flash|flash-lite)/i.test(model)) {
    const thinkingBudget = effort === "minimal" ? 0 : effort === "low" ? 512 : -1;
    return { thinkingConfig: { thinkingBudget } };
  }

  return {};
}

function supportsOpenAIReasoning(model: string) {
  return /^(?:gpt-5|o[134])(?:[.-]|$)/i.test(model);
}

function migrateLegacyGeminiDefault(model: string) {
  return LEGACY_GEMINI_DEFAULTS.has(model) ? DEFAULT_GEMINI_MODEL : model;
}

function selectAvailableGeminiModel(payload: GeminiModelListPayload | null, excludedModels: Set<string>) {
  const candidates = [
    ...new Set(
      (payload?.models ?? [])
        .filter((model) =>
          model.supportedGenerationMethods?.some((method) => method.toLowerCase() === "generatecontent")
        )
        .map((model) => normalizeGeminiModelId(model.baseModelId || model.name || ""))
        .filter((model) => model.startsWith("gemini-") && !excludedModels.has(model) && isGeneralGeminiModel(model))
    )
  ];

  for (const preferredModel of PREFERRED_GEMINI_MODELS) {
    if (candidates.includes(preferredModel)) {
      return preferredModel;
    }
  }

  return candidates.sort((left, right) => scoreGeminiModel(right) - scoreGeminiModel(left))[0] ?? null;
}

function isGeneralGeminiModel(model: string) {
  return !/(?:aqa|audio|embedding|image|imagen|live|lyria|native-audio|robotics|tts|veo)/i.test(model);
}

function scoreGeminiModel(model: string) {
  const versionMatch = model.match(/^gemini-(\d+)(?:\.(\d+))?/);
  const versionScore = versionMatch ? Number(versionMatch[1]) * 10 + Number(versionMatch[2] ?? 0) : 0;
  const familyScore = model.includes("flash-lite") ? 400 : model.includes("flash") ? 300 : 100;
  const stabilityScore = /(?:exp|experimental|preview)/i.test(model) ? 0 : 100;
  return familyScore + stabilityScore + versionScore;
}
