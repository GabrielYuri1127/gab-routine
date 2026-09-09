export type AIProviderName = "none" | "openrouter" | "gemini" | "groq" | "openai" | "local";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderRequest {
  messages: AIMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  responseFormat?: "json" | JsonSchemaResponseFormat;
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
      .map((message) => message.content)
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
        store: false,
        temperature: request.temperature ?? 0.2,
        text: request.responseFormat ? { format: buildTextFormat(request.responseFormat) } : undefined
      }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed with ${response.status}: ${errorText.slice(0, 180)}`);
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
