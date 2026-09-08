import { parseAIIntent } from "@/lib/ai/structured-output";

export function validateNaturalLanguageResult(rawJson: string) {
  return parseAIIntent(rawJson);
}
