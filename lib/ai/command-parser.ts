import { addDays, formatShortDate, parseDateKey, toDateKey } from "../date";
import type { ActivityType, Subject } from "../../types/academic";
import type { Event, Priority, Reminder } from "../../types/domain";

export type AssistantCommandProposal =
  | AddActivityProposal
  | AddEventProposal
  | AddGradeProposal
  | AddReminderProposal
  | AddTaskProposal
  | RegisterAbsenceProposal;

export interface RegisterAbsenceProposal extends BaseProposal {
  date: string;
  dateLabel: string;
  intent: "register_absence";
  quantity: number;
  subject: SubjectReference;
}

export interface AddGradeProposal extends BaseProposal {
  date?: string;
  dateLabel?: string;
  intent: "add_grade";
  maxScore: number;
  name: string;
  score: number;
  subject: SubjectReference;
}

export interface AddActivityProposal extends BaseProposal {
  activityType: ActivityType;
  dueDate: string;
  dueDateLabel: string;
  intent: "add_activity";
  subject: SubjectReference;
  title: string;
}

export interface AddReminderProposal extends BaseProposal {
  intent: "add_reminder";
  remindAt: string;
  remindAtLabel: string;
  sourceType: NonNullable<Reminder["sourceType"]>;
  title: string;
}

export interface AddEventProposal extends BaseProposal {
  category: Event["category"];
  date: string;
  dateLabel: string;
  endsAt?: string;
  intent: "add_event";
  startsAt?: string;
  title: string;
}

export interface AddTaskProposal extends BaseProposal {
  category?: string;
  dueDate?: string;
  dueDateLabel?: string;
  intent: "add_task";
  priority: Priority;
  title: string;
}

interface BaseProposal {
  summary: string;
  warnings: string[];
}

interface CommandParserInput {
  question: string;
  subjects: Subject[];
  today: string;
}

interface DateParseResult {
  date: string;
  explicit: boolean;
}

type SubjectReference = Pick<Subject, "id" | "name">;

const numberWords: Record<string, number> = {
  dez: 10,
  duas: 2,
  dois: 2,
  nove: 9,
  oito: 8,
  sete: 7,
  seis: 6,
  cinco: 5,
  quatro: 4,
  tres: 3,
  três: 3,
  uma: 1,
  um: 1
};

const activityTypeLabels: Record<ActivityType, string> = {
  activity: "Atividade",
  exam: "Prova",
  exercise: "Exercicio",
  lab: "Laboratorio",
  list: "Lista",
  other: "Atividade",
  presentation: "Apresentacao",
  project: "Projeto",
  report: "Relatorio",
  seminar: "Seminario",
  work: "Trabalho"
};

export function buildAssistantCommandProposal(input: CommandParserInput): AssistantCommandProposal | null {
  return (
    buildAbsenceProposal(input) ??
    buildGradeProposal(input) ??
    buildActivityProposal(input) ??
    buildReminderProposal(input) ??
    buildEventProposal(input) ??
    buildTaskProposal(input)
  );
}

function buildAbsenceProposal(input: CommandParserInput): RegisterAbsenceProposal | null {
  const normalized = normalizeText(input.question);
  const wantsAbsenceRecord =
    includesAny(normalized, ["registre", "registrar", "marca", "marque", "coloca", "coloque", "adicione", "lance", "lancei", "faltei"]) &&
    includesAny(normalized, ["falta", "faltas", "faltei"]);

  if (!wantsAbsenceRecord) {
    return null;
  }

  const subject = findBestSubject(input.question, input.subjects);
  const parsedDate = parseCommandDate(input.question, input.today, { defaultToday: true });
  if (!subject || !parsedDate) {
    return null;
  }

  const quantity = getQuantity(input.question, subject.rules.classesPerMeeting, ["falta", "faltas", "aula", "aulas"]);
  const warnings = [
    quantity > subject.rules.classesPerMeeting
      ? `Quantidade maior que o padrao da area (${subject.rules.classesPerMeeting} registros por encontro).`
      : "",
    parsedDate.date > input.today ? "A data parece estar no futuro; confira antes de registrar." : "",
    !parsedDate.explicit ? "Nao encontrei data na frase, entao vou usar hoje." : ""
  ].filter(Boolean);

  return {
    date: parsedDate.date,
    dateLabel: formatShortDate(parsedDate.date),
    intent: "register_absence",
    quantity,
    subject: toSubjectReference(subject),
    summary: `${quantity} ${quantity === 1 ? "falta" : "faltas"} em ${subject.name} no dia ${formatShortDate(parsedDate.date)}`,
    warnings
  };
}

function buildGradeProposal(input: CommandParserInput): AddGradeProposal | null {
  const normalized = normalizeText(input.question);
  const wantsGrade =
    includesAny(normalized, ["nota", "tirei", "pontuacao", "media"]) &&
    !includesAny(normalized, ["o que", "como estao", "como estão", "calcule", "preciso tirar"]);

  if (!wantsGrade) {
    return null;
  }

  const subject = findBestSubject(input.question, input.subjects);
  const scoreInfo = parseScore(input.question);
  if (!subject || !scoreInfo) {
    return null;
  }

  const parsedDate = parseCommandDate(input.question, input.today, { defaultToday: false });
  const name = inferGradeName(input.question);
  const warnings = [
    scoreInfo.score > scoreInfo.maxScore ? "A nota ficou maior que a nota maxima detectada." : "",
    !scoreInfo.explicitMax ? `Nao encontrei nota maxima, entao vou usar ${scoreInfo.maxScore}.` : ""
  ].filter(Boolean);

  return {
    date: parsedDate?.date,
    dateLabel: parsedDate ? formatShortDate(parsedDate.date) : undefined,
    intent: "add_grade",
    maxScore: scoreInfo.maxScore,
    name,
    score: scoreInfo.score,
    subject: toSubjectReference(subject),
    summary: `${name} em ${subject.name}: ${formatScore(scoreInfo.score)}/${formatScore(scoreInfo.maxScore)}`,
    warnings
  };
}

function buildActivityProposal(input: CommandParserInput): AddActivityProposal | null {
  const normalized = normalizeText(input.question);
  const activityType = inferActivityType(input.question);
  const hasActivityWord = includesAny(normalized, [
    "atividade",
    "trabalho",
    "lista",
    "prova",
    "seminario",
    "apresentacao",
    "relatorio",
    "projeto",
    "laboratorio"
  ]);

  if (!hasActivityWord) {
    return null;
  }

  const subject = findBestSubject(input.question, input.subjects);
  const parsedDate = parseCommandDate(input.question, input.today, { defaultToday: false, preferFuture: true });
  const hasActionVerb = includesAny(normalized, [
    "adicione",
    "adicionar",
    "agende",
    "agenda",
    "coloca",
    "coloque",
    "crie",
    "criar",
    "marque",
    "registrar",
    "registre",
    "tenho"
  ]);
  const directAcademicCommand = Boolean(subject && parsedDate && !isQuestionLike(normalized));

  if (!(hasActionVerb || directAcademicCommand) || !subject || !parsedDate) {
    return null;
  }

  const title = extractQuotedText(input.question) ?? buildActivityTitle(activityType);
  const warnings = [
    parsedDate.date < input.today ? "A data detectada ja passou; confira antes de criar o prazo." : ""
  ].filter(Boolean);

  return {
    activityType,
    dueDate: parsedDate.date,
    dueDateLabel: formatShortDate(parsedDate.date),
    intent: "add_activity",
    subject: toSubjectReference(subject),
    summary: `${title} em ${subject.name} para ${formatShortDate(parsedDate.date)}`,
    title,
    warnings
  };
}

function buildTaskProposal(input: CommandParserInput): AddTaskProposal | null {
  const normalized = normalizeText(input.question);
  const parsedDate = parseCommandDate(input.question, input.today, { defaultToday: false, preferFuture: true });
  const hasTaskCommand = includesAny(normalized, [
    "adicione tarefa",
    "adicionar tarefa",
    "crie tarefa",
    "criar tarefa",
    "me lembre de",
    "nova tarefa",
    "preciso fazer"
  ]);
  const directTaskCommand = Boolean(parsedDate && !isQuestionLike(normalized) && !hasAcademicCommandKeyword(normalized));
  const wantsTask = (hasTaskCommand || directTaskCommand) && !includesAny(normalized, ["nota", "falta", "faltas"]);

  if (!wantsTask) {
    return null;
  }

  const title = extractTaskTitle(input.question);
  if (!title) {
    return null;
  }

  const priority = inferPriority(input.question);
  const warnings = [parsedDate ? "" : "Sem data detectada; a tarefa vai ficar sem prazo."].filter(Boolean);

  return {
    category: inferTaskCategory(input.question),
    dueDate: parsedDate?.date,
    dueDateLabel: parsedDate ? formatShortDate(parsedDate.date) : undefined,
    intent: "add_task",
    priority,
    summary: parsedDate ? `${title} para ${formatShortDate(parsedDate.date)}` : title,
    title,
    warnings
  };
}

function buildReminderProposal(input: CommandParserInput): AddReminderProposal | null {
  const normalized = normalizeText(input.question);
  const wantsReminder = includesAny(normalized, [
    "avise",
    "crie lembrete",
    "criar lembrete",
    "lembrete",
    "lembrar",
    "me lembre",
    "me lembra",
    "notifique"
  ]);

  if (!wantsReminder) {
    return null;
  }

  const parsedDate = parseCommandDate(input.question, input.today, { defaultToday: true, preferFuture: true });
  const parsedTime = parseCommandTime(input.question);
  const title = extractReminderTitle(input.question);

  if (!parsedDate || !title) {
    return null;
  }

  const time = parsedTime ?? "09:00";
  const warnings = [
    !parsedDate.explicit ? "Nao encontrei data na frase, entao vou usar hoje." : "",
    !parsedTime ? "Nao encontrei horario, entao vou usar 09:00." : "",
    parsedDate.date < input.today ? "A data detectada ja passou; confira antes de salvar." : ""
  ].filter(Boolean);

  return {
    intent: "add_reminder",
    remindAt: `${parsedDate.date}T${time}:00`,
    remindAtLabel: `${formatShortDate(parsedDate.date)} as ${time}`,
    sourceType: "custom",
    summary: `${title} em ${formatShortDate(parsedDate.date)} as ${time}`,
    title,
    warnings
  };
}

function buildEventProposal(input: CommandParserInput): AddEventProposal | null {
  const normalized = normalizeText(input.question);
  const parsedDate = parseCommandDate(input.question, input.today, { defaultToday: false, preferFuture: true });
  const parsedTime = parseCommandTime(input.question);
  const wantsEvent = includesAny(normalized, [
    "compromisso",
    "consulta",
    "dentista",
    "evento",
    "medico",
    "médico",
    "reuniao",
    "reunião",
    "tenho"
  ]);

  if (!wantsEvent || !parsedDate || isQuestionLike(normalized)) {
    return null;
  }

  const title = extractEventTitle(input.question);
  if (!title) {
    return null;
  }

  const warnings = [
    !parsedTime ? "Nao encontrei horario, entao criei o compromisso sem hora." : "",
    parsedDate.date < input.today ? "A data detectada ja passou; confira antes de salvar." : ""
  ].filter(Boolean);

  return {
    category: inferEventCategory(input.question),
    date: parsedDate.date,
    dateLabel: formatShortDate(parsedDate.date),
    endsAt: parsedTime ? addMinutesToTime(parsedTime, 60) : undefined,
    intent: "add_event",
    startsAt: parsedTime ?? undefined,
    summary: parsedTime ? `${title} em ${formatShortDate(parsedDate.date)} as ${parsedTime}` : `${title} em ${formatShortDate(parsedDate.date)}`,
    title,
    warnings
  };
}

function findBestSubject(question: string, subjects: Subject[]) {
  const normalizedQuestion = normalizeText(question);
  return subjects
    .map((subject) => ({
      score: getSubjectScore(subject, normalizedQuestion),
      subject
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.subject;
}

function getSubjectScore(subject: Subject, normalizedQuestion: string) {
  const normalizedName = normalizeText(subject.name);
  if (normalizedQuestion.includes(normalizedName)) {
    return 100;
  }

  if (subject.code && normalizedQuestion.includes(normalizeText(subject.code))) {
    return 90;
  }

  const tokens = normalizedName.split(/\s+/).filter((token) => token.length >= 4);
  const matchedTokens = tokens.filter((token) => normalizedQuestion.includes(token));
  return matchedTokens.length * 10;
}

function getQuantity(question: string, fallbackQuantity: number, units: string[]) {
  const normalized = normalizeText(question);
  const unitPattern = units.join("|");
  const numericMatch = normalized.match(new RegExp(`(\\d+)\\s*(${unitPattern})`));
  if (numericMatch?.[1]) {
    return clampNumber(Number(numericMatch[1]), fallbackQuantity, 12);
  }

  const wordMatch = Object.entries(numberWords).find(([word]) =>
    units.some((unit) => normalized.includes(`${word} ${normalizeText(unit)}`))
  );
  if (wordMatch) {
    return clampNumber(wordMatch[1], fallbackQuantity, 12);
  }

  return clampNumber(fallbackQuantity, 1, 12);
}

function parseScore(question: string) {
  const normalized = normalizeText(question).replace(/,/g, ".");
  const fractionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:\/|de)\s*(\d+(?:\.\d+)?)/);
  if (fractionMatch?.[1] && fractionMatch[2]) {
    return {
      explicitMax: true,
      maxScore: Number(fractionMatch[2]),
      score: Number(fractionMatch[1])
    };
  }

  const scoreMatch = normalized.match(/(?:nota|tirei|pontuacao|fiquei com)\s*(\d+(?:\.\d+)?)/);
  if (scoreMatch?.[1]) {
    const score = Number(scoreMatch[1]);
    return {
      explicitMax: false,
      maxScore: score > 10 ? 100 : 10,
      score
    };
  }

  return null;
}

function parseCommandDate(
  question: string,
  today: string,
  options: { defaultToday: boolean; preferFuture?: boolean }
): DateParseResult | null {
  const normalized = normalizeText(question);
  const todayDate = parseDateKey(today);

  if (normalized.includes("depois de amanha") || normalized.includes("depois de amanhã")) {
    return { date: toDateKey(addDays(todayDate, 2)), explicit: true };
  }

  if (normalized.includes("amanha") || normalized.includes("amanhã")) {
    return { date: toDateKey(addDays(todayDate, 1)), explicit: true };
  }

  if (normalized.includes("anteontem")) {
    return { date: toDateKey(addDays(todayDate, -2)), explicit: true };
  }

  if (normalized.includes("ontem")) {
    return { date: toDateKey(addDays(todayDate, -1)), explicit: true };
  }

  if (normalized.includes("hoje")) {
    return { date: today, explicit: true };
  }

  if (normalized.includes("semana que vem") || normalized.includes("proxima semana") || normalized.includes("próxima semana")) {
    return { date: toDateKey(addDays(todayDate, 7)), explicit: true };
  }

  const weekdayDate = parseWeekdayDate(normalized, todayDate, Boolean(options.preferFuture));
  if (weekdayDate) {
    return { date: toDateKey(weekdayDate), explicit: true };
  }

  const isoMatch = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch?.[1]) {
    return { date: isoMatch[1], explicit: true };
  }

  const slashMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch?.[1] && slashMatch[2]) {
    const date = buildDateKey(Number(slashMatch[1]), Number(slashMatch[2]), slashMatch[3], today, options.preferFuture);
    return date ? { date, explicit: true } : null;
  }

  const dayMatch = normalized.match(/\bdia\s+(\d{1,2})\b/);
  if (dayMatch?.[1]) {
    const [, month, year] = today.split("-").map(Number);
    const date = buildDateKey(Number(dayMatch[1]), month, String(year), today, options.preferFuture);
    return date ? { date, explicit: true } : null;
  }

  return options.defaultToday ? { date: today, explicit: false } : null;
}

function parseCommandTime(question: string) {
  const normalized = normalizeText(question);

  if (normalized.includes("meio dia")) {
    return "12:00";
  }

  if (normalized.includes("meia noite")) {
    return "00:00";
  }

  const timeMatch = normalized.match(/\b(?:as|a|às)?\s*(\d{1,2})(?::|h)(\d{2})?\b/);
  const looseHourMatch = normalized.match(/\b(?:as|a|às)\s+(\d{1,2})\b/);
  const match = timeMatch ?? looseHourMatch;

  if (!match?.[1]) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;

  if (includesAny(normalized, ["da tarde", "de tarde", "tarde", "da noite", "de noite", "noite"]) && hour >= 1 && hour <= 11) {
    hour += 12;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildDateKey(day: number, month: number, rawYear: string | undefined, today: string, preferFuture = false) {
  const fallbackYear = Number(today.slice(0, 4));
  const year = rawYear ? normalizeYear(rawYear) : fallbackYear;
  const date = new Date(year, month - 1, day, 12);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  if (preferFuture && !rawYear && toDateKey(date) < today) {
    date.setMonth(date.getMonth() + 1);
  }

  return toDateKey(date);
}

function inferGradeName(question: string) {
  const normalized = normalizeText(question);
  if (normalized.includes("pf") || normalized.includes("prova final")) return "Prova final";
  if (normalized.includes("prova")) return "Prova";
  if (normalized.includes("trabalho")) return "Trabalho";
  if (normalized.includes("lista")) return "Lista";
  return "Nota";
}

function inferActivityType(question: string): ActivityType {
  const normalized = normalizeText(question);
  if (normalized.includes("prova")) return "exam";
  if (normalized.includes("seminario")) return "seminar";
  if (normalized.includes("apresentacao")) return "presentation";
  if (normalized.includes("relatorio")) return "report";
  if (normalized.includes("projeto")) return "project";
  if (normalized.includes("laboratorio") || normalized.includes("lab")) return "lab";
  if (normalized.includes("lista")) return "list";
  if (normalized.includes("trabalho")) return "work";
  if (normalized.includes("exercicio")) return "exercise";
  return "activity";
}

function buildActivityTitle(type: ActivityType) {
  return activityTypeLabels[type];
}

function inferPriority(question: string): Priority {
  const normalized = normalizeText(question);
  if (includesAny(normalized, ["urgente", "urgentissimo", "urgentissima", "pra hoje"])) return "urgent";
  if (includesAny(normalized, ["importante", "alta prioridade"])) return "high";
  if (includesAny(normalized, ["baixa prioridade", "quando der"])) return "low";
  return "medium";
}

function inferTaskCategory(question: string) {
  const normalized = normalizeText(question);
  if (includesAny(normalized, ["faculdade", "aula", "prova", "trabalho"])) return "Faculdade";
  if (includesAny(normalized, ["academia", "treino", "corrida"])) return "Saude";
  if (includesAny(normalized, ["projeto", "codigo", "programar"])) return "Projeto";
  return undefined;
}

function inferEventCategory(question: string): Event["category"] {
  const normalized = normalizeText(question);
  if (includesAny(normalized, ["aula", "faculdade"])) return "class";
  if (includesAny(normalized, ["entrega", "prazo"])) return "deadline";
  if (includesAny(normalized, ["estagio", "trabalho", "reuniao"])) return "work";
  if (includesAny(normalized, ["estudar", "estudo"])) return "study";
  if (includesAny(normalized, ["dentista", "medico", "consulta"])) return "appointment";
  return "personal";
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutesToAdd;
  const normalizedTotal = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(normalizedTotal / 60);
  const nextMinute = normalizedTotal % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function extractReminderTitle(question: string) {
  const cleaned = cleanCommandTitle(question)
    .replace(/^(avise|notifique|lembrar|lembrete)\s*(de|para)?\s*/i, "")
    .replace(/^me\s+lembr[ae]\s+de\s*/i, "")
    .replace(/^crie\s+lembrete\s*(de|para)?\s*/i, "")
    .replace(/^criar\s+lembrete\s*(de|para)?\s*/i, "")
    .trim();

  return cleaned.length >= 3 ? capitalize(cleaned) : "";
}

function extractEventTitle(question: string) {
  const cleaned = cleanCommandTitle(question)
    .replace(/^tenho\s+/i, "")
    .replace(/^marque\s+(um\s+)?compromisso\s*(de|para)?\s*/i, "")
    .replace(/^crie\s+(um\s+)?compromisso\s*(de|para)?\s*/i, "")
    .replace(/^criar\s+(um\s+)?compromisso\s*(de|para)?\s*/i, "")
    .replace(/^compromisso\s*(de|para)?\s*/i, "")
    .trim();

  return cleaned.length >= 3 ? capitalize(cleaned) : "";
}

function extractTaskTitle(question: string) {
  const quoted = extractQuotedText(question);
  if (quoted) {
    return quoted;
  }

  const cleaned = cleanCommandTitle(question)
    .replace(/^(crie|criar|adicione|adicionar|nova)\s+tarefa\s*/i, "")
    .replace(/^preciso\s+fazer\s*/i, "")
    .replace(/\b(urgente|importante|alta prioridade|baixa prioridade|quando der)\b/gi, "")
    .trim();

  return cleaned.length >= 3 ? capitalize(cleaned) : "";
}

function cleanCommandTitle(question: string) {
  return question
    .replace(/\b(hoje|amanh[ãa]|depois de amanh[ãa]|semana que vem|pr[oó]xima semana)\b/gi, "")
    .replace(/\b(domingo|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado)\b/gi, "")
    .replace(/\bdia\s+\d{1,2}\b/gi, "")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "")
    .replace(/\b(?:as|a|às)\s+\d{1,2}(?:(?::|h)\d{0,2})?\b/gi, "")
    .replace(/\b\d{1,2}h\d{0,2}\b/gi, "")
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    .replace(/\b(meio dia|meia noite|da manh[ãa]|de manh[ãa]|manh[ãa]|da tarde|de tarde|tarde|da noite|de noite|noite)\b/gi, "")
    .replace(/\b(pra|para|pro|ate|até|em)\s*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractQuotedText(question: string) {
  const match = question.match(/["“”']([^"“”']{3,80})["“”']/);
  return match?.[1]?.trim();
}

function clampNumber(value: number, fallbackQuantity: number, max: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return Math.max(1, fallbackQuantity);
  }

  return Math.min(max, Math.max(1, Math.floor(value)));
}

function normalizeYear(rawYear: string) {
  const year = Number(rawYear);
  return rawYear.length === 2 ? 2000 + year : year;
}

function toSubjectReference(subject: Subject): SubjectReference {
  return {
    id: subject.id,
    name: subject.name
  };
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function parseWeekdayDate(normalized: string, todayDate: Date, preferFuture: boolean) {
  const weekdays = [
    { index: 0, pattern: /\bdomingo\b/ },
    { index: 1, pattern: /\bsegunda(?:-feira)?\b/ },
    { index: 2, pattern: /\bterca(?:-feira)?\b/ },
    { index: 3, pattern: /\bquarta(?:-feira)?\b/ },
    { index: 4, pattern: /\bquinta(?:-feira)?\b/ },
    { index: 5, pattern: /\bsexta(?:-feira)?\b/ },
    { index: 6, pattern: /\bsabado\b/ }
  ];
  const match = weekdays.find((weekday) => weekday.pattern.test(normalized));

  if (!match) {
    return null;
  }

  const currentWeekday = todayDate.getDay();
  let dayDelta = match.index - currentWeekday;
  const nextExplicit = /\b(proxima|proximo|que vem)\b/.test(normalized);

  if (nextExplicit || preferFuture) {
    dayDelta = (dayDelta + 7) % 7;
    if (dayDelta === 0 && nextExplicit) {
      dayDelta = 7;
    }
  }

  if (!preferFuture && !nextExplicit && dayDelta > 0) {
    dayDelta -= 7;
  }

  return addDays(todayDate, dayDelta);
}

function hasAcademicCommandKeyword(normalized: string) {
  return includesAny(normalized, [
    "atividade",
    "falta",
    "faltas",
    "faltei",
    "laboratorio",
    "lista",
    "nota",
    "projeto",
    "prova",
    "relatorio",
    "seminario",
    "trabalho"
  ]);
}

function isQuestionLike(normalized: string) {
  return /\?|\b(como|mostre|o que|posso|qual|quais|quando|quanto|quantas)\b/.test(normalized);
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(normalizeText(candidate)));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
