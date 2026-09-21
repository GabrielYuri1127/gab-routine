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

    const response = await fetch(`${this.baseUrl}/responses`, {
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

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as OpenAIResponsesPayload;

    return {
      content: payload.output_text ?? extractOutputText(payload),
      model: payload.model ?? this.model
    };
  }
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
