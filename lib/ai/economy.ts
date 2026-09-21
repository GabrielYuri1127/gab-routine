import type { AssistantIntent, RoutineAssistantResponse } from "./routine-assistant";

const locallySolvedIntents = new Set<AssistantIntent>([
  "attendance",
  "command",
  "course_progress",
  "date_time",
  "deadlines",
  "grades",
  "now",
  "readiness",
  "resources",
  "summary",
  "work"
]);

export function shouldUseLocalAssistant(question: string, response: RoutineAssistantResponse) {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (/\b(use|chame|responda com|pergunte para) (a )?ia online\b/.test(normalized)) {
    return false;
  }
  if (response.commandProposal || locallySolvedIntents.has(response.intent)) {
    return true;
  }

  return /^(oi|ola|bom dia|boa tarde|boa noite|ajuda|o que voce (faz|consegue fazer))[!?. ]*$/.test(normalized);
}
