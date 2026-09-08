export type AIProviderName = "none" | "openrouter" | "gemini" | "groq" | "openai" | "local";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderRequest {
  messages: AIMessage[];
  temperature?: number;
  responseFormat?: "json";
}

export interface AIProviderResponse {
  content: string;
  model: string;
}

export interface AIProvider {
  name: AIProviderName;
  complete(request: AIProviderRequest): Promise<AIProviderResponse>;
}

export class DisabledAIProvider implements AIProvider {
  name: AIProviderName = "none";

  async complete(): Promise<AIProviderResponse> {
    throw new Error("AI provider is disabled. The app should keep working without AI.");
  }
}

export function getConfiguredAIProvider(): AIProvider {
  return new DisabledAIProvider();
}
