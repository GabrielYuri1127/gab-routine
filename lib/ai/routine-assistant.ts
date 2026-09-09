import { calculateAttendanceSummary } from "../academic-rules/attendance";
import { calculateGradeAverage, calculateRequiredFinalExamGrade, getAcademicSituation } from "../academic-rules/grades";
import { formatShortDate, getWeekdayFromDate, parseDateKey } from "../date";
import { getReminderDateKey, getReminderTime } from "../reminders/schedule";
import { getTaskDate, prioritizeTasks } from "../tasks/prioritization";
import type { AcademicActivity, Subject } from "@/types/academic";
import type { AppPreference, Event, Reminder, Task } from "@/types/domain";

export type AssistantIntent = "now" | "attendance" | "grades" | "deadlines" | "summary";
export type AssistantTone = "mint" | "sky" | "gold" | "coral" | "neutral";

export interface RoutineAssistantInput {
  appPreference?: AppPreference;
  events: Event[];
  question: string;
  reminders: Reminder[];
  subjects: Subject[];
  tasks: Task[];
  today: string;
}

export interface AssistantHighlight {
  label: string;
  tone: AssistantTone;
  value: string;
}

export interface AssistantQuickLink {
  href: string;
  label: string;
}

export interface RoutineAssistantResponse {
  answer: string;
  dataGaps: string[];
  evidence: string[];
  highlights: AssistantHighlight[];
  intent: AssistantIntent;
  quickLinks: AssistantQuickLink[];
  suggestions: string[];
}

interface PendingActivity {
  activity: AcademicActivity;
  subject: Subject;
}

interface DeadlineItem {
  date: string;
  href: string;
  id: string;
  priorityScore: number;
  source: "activity" | "task";
  subtitle: string;
  time?: string;
  title: string;
}

const pendingStatuses = new Set<AcademicActivity["status"]>(["not_started", "in_progress", "late"]);
const taskPriorityScore = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3
} as const;

export function buildRoutineAssistantResponse(input: RoutineAssistantInput): RoutineAssistantResponse {
  const safeInput = {
    ...input,
    subjects: input.subjects.filter((subject) => subject.status !== "archived")
  };
  const intent = detectIntent(input.question);
  const response =
    intent === "attendance"
      ? buildAttendanceAnswer(safeInput)
      : intent === "grades"
        ? buildGradeAnswer(safeInput)
        : intent === "deadlines"
          ? buildDeadlineAnswer(safeInput)
          : intent === "now"
            ? buildNowAnswer(safeInput)
            : buildSummaryAnswer(safeInput);

  return applyAnswerStyle(response, safeInput.appPreference?.assistantAnswerStyle ?? "balanced");
}

function detectIntent(question: string): AssistantIntent {
  const normalized = normalizeText(question);

  if (includesAny(normalized, ["falta", "faltas", "frequencia", "presenca", "reprovar por falta", "posso faltar"])) {
    return "attendance";
  }

  if (includesAny(normalized, ["nota", "media", "pf", "prova final", "passar", "aprovacao", "reprovar por nota"])) {
    return "grades";
  }

  if (includesAny(normalized, ["prazo", "atividade", "trabalho", "entrega", "prova", "vencendo", "atrasado", "pendente"])) {
    return "deadlines";
  }

  if (includesAny(normalized, ["agora", "hoje", "primeiro", "prioridade", "fazer", "comecar", "começar"])) {
    return "now";
  }

  return "summary";
}

function buildNowAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const todayTasks = prioritizeTasks(
    input.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && getTaskDate(task) === input.today),
    input.today
  );
  const overdueTasks = prioritizeTasks(
    input.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && isBeforeToday(task.dueDate ?? task.date, input.today)),
    input.today
  );
  const urgentTasks = todayTasks.filter((task) => task.priority === "urgent" || task.priority === "high");
  const todayEvents = input.events.filter((event) => event.date === input.today).sort(sortByOptionalTime);
  const todayReminders = input.reminders
    .filter((reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === input.today)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  const pendingActivities = getPendingActivities(input.subjects).sort(sortPendingActivity);
  const overdueActivities = pendingActivities.filter(({ activity }) => activity.dueDate < input.today);
  const todayActivities = pendingActivities.filter(({ activity }) => activity.dueDate === input.today);
  const todayClasses = getTodayClasses(
    input.subjects.filter((subject) => subject.status === "active"),
    input.today
  );
  const nextFocus = overdueActivities[0] ?? todayActivities[0] ?? undefined;

  const lead = nextFocus
    ? `Eu comecaria por "${nextFocus.activity.title}" em ${nextFocus.subject.name}, porque ${nextFocus.activity.dueDate < input.today ? `venceu em ${formatShortDate(nextFocus.activity.dueDate)}` : "vence hoje"}.`
    : overdueTasks[0]
      ? `Eu resolveria primeiro "${overdueTasks[0].title}", porque ja passou da data marcada.`
      : todayTasks[0]
        ? `Eu comecaria por "${todayTasks[0].title}", que aparece como a melhor prioridade de hoje.`
        : todayEvents[0]
          ? `Seu primeiro compromisso cadastrado hoje e "${todayEvents[0].title}"${todayEvents[0].startsAt ? ` as ${todayEvents[0].startsAt}` : ""}.`
          : "Hoje esta leve no app; bom momento para revisar prazos e organizar pendencias pequenas.";

  const detailParts = [
    todayClasses.length ? `${todayClasses.length} aula(s)` : "",
    todayEvents.length ? `${todayEvents.length} compromisso(s)` : "",
    todayTasks.length ? `${todayTasks.length} tarefa(s)` : "",
    todayReminders.length ? `${todayReminders.length} lembrete(s)` : "",
    todayActivities.length ? `${todayActivities.length} prazo(s) hoje` : "",
    overdueActivities.length || overdueTasks.length ? `${overdueActivities.length + overdueTasks.length} atraso(s)` : ""
  ].filter(Boolean);

  return {
    answer: `${lead} No total, vejo ${detailParts.length ? joinParts(detailParts) : "nenhum item com data marcada para hoje"}.`,
    dataGaps: buildGaps(input, {
      noSchedules: todayClasses.length === 0,
      noTasks: input.tasks.length === 0
    }),
    evidence: [
      overdueActivities.length ? `${overdueActivities.length} atividade(s) academica(s) vencida(s).` : "",
      overdueTasks.length ? `${overdueTasks.length} tarefa(s) vencida(s).` : "",
      todayTasks[0] ? `Primeira tarefa calculada: ${todayTasks[0].title}.` : "",
      todayEvents[0] ? `Proximo compromisso: ${todayEvents[0].title}.` : ""
    ].filter(Boolean),
    highlights: [
      { label: "Hoje", tone: "mint", value: String(todayClasses.length + todayEvents.length + todayTasks.length + todayReminders.length) },
      { label: "Prioridade alta", tone: urgentTasks.length ? "coral" : "neutral", value: String(urgentTasks.length) },
      { label: "Atrasos", tone: overdueActivities.length || overdueTasks.length ? "coral" : "neutral", value: String(overdueActivities.length + overdueTasks.length) }
    ],
    intent: "now",
    quickLinks: [
      { href: nextFocus ? `/faculdade/${nextFocus.subject.id}` : "/tarefas", label: nextFocus ? "Abrir materia" : "Tarefas" },
      { href: "/semana", label: "Semana" },
      { href: "/calendario", label: "Calendario" }
    ],
    suggestions: [
      nextFocus ? `Separar 25 minutos para ${nextFocus.activity.title}` : todayTasks[0] ? `Comecar por ${todayTasks[0].title}` : "Criar uma tarefa principal para hoje",
      overdueActivities.length || overdueTasks.length ? "Resolver atrasos antes de abrir tarefas novas" : "Conferir se existe algum prazo sem data",
      todayEvents.length ? "Olhar a agenda antes de encaixar estudo" : "Planejar o proximo bloco no calendario"
    ]
  };
}

function buildAttendanceAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const targetSubjects = getTargetSubjects(input);
  const summaries = targetSubjects
    .map((subject) => ({
      subject,
      summary: calculateAttendanceSummary(subject.attendance, subject.rules, subject.name)
    }))
    .sort((a, b) => b.summary.limitUsagePercent - a.summary.limitUsagePercent);
  const risks = summaries.filter(({ summary }) => summary.alertLevel !== "normal");
  const top = risks[0] ?? summaries[0];

  if (!top) {
    return emptyAnswer("attendance", "Ainda nao ha disciplinas para analisar faltas.", "/faculdade", "Faculdade", [
      "Cadastre pelo menos uma disciplina."
    ]);
  }

  const scoped = targetSubjects.length !== input.subjects.length;
  const answer = risks.length
    ? `${scoped ? "Nessa materia" : "Entre as materias cadastradas"}, a maior atencao e ${top.subject.name}: ${top.summary.usedAbsences}/${top.summary.absenceLimit} faltas usadas, ${Math.round(top.summary.frequency)}% de frequencia e ${top.summary.remainingAbsences} falta(s) livre(s).`
    : `${scoped ? `${top.subject.name} esta` : "As faltas estao"} sob controle. O limite atual permite mais ${top.summary.remainingAbsences} falta(s) em ${top.subject.name}, considerando ${top.summary.absenceLimit} falta(s) como teto.`;

  return {
    answer,
    dataGaps: top.subject.attendance.length === 0 ? ["Essa analise depende das faltas ja registradas. Se houve falta antiga, cadastre com a data correta."] : [],
    evidence: summaries.slice(0, 3).map(
      ({ subject, summary }) =>
        `${subject.name}: ${summary.usedAbsences}/${summary.absenceLimit} faltas, ${Math.round(summary.frequency)}% de frequencia.`
    ),
    highlights: summaries.slice(0, 3).map(({ subject, summary }) => ({
      label: subject.name,
      tone: summary.alertLevel === "normal" ? "mint" : summary.alertLevel === "attention" ? "gold" : "coral",
      value: `${summary.remainingAbsences} livres`
    })),
    intent: "attendance",
    quickLinks: [
      { href: "/faculdade", label: "Faculdade" },
      { href: `/faculdade/${top.subject.id}`, label: "Abrir faltas" }
    ],
    suggestions: [
      `Conferir o historico de faltas em ${top.subject.name}`,
      "Registrar faltas antigas que ainda nao entraram",
      "Verificar se a carga horaria da disciplina esta correta"
    ]
  };
}

function buildGradeAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const targetSubjects = getTargetSubjects(input);
  const summaries = targetSubjects
    .map((subject) => {
      const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);
      return {
        average,
        situation: getAcademicSituation(average, subject.rules.directApprovalGrade, subject.rules.minimumFinalGrade),
        subject
      };
    })
    .sort((a, b) => (a.average ?? Number.POSITIVE_INFINITY) - (b.average ?? Number.POSITIVE_INFINITY));
  const withGrades = summaries.filter((item) => item.average !== null);
  const lowest = withGrades[0];

  if (!lowest) {
    return emptyAnswer("grades", "Ainda nao ha notas suficientes para calcular medias.", "/faculdade", "Notas", [
      "Cadastre pelo menos uma nota por disciplina.",
      "Confira se a materia usa media simples, ponderada ou pontos."
    ]);
  }

  const lowestAverage = lowest.average ?? 0;
  const needsFinal = lowestAverage >= lowest.subject.rules.minimumFinalGrade && lowestAverage < lowest.subject.rules.directApprovalGrade;
  const finalExamText = needsFinal
    ? ` Se entrar em PF, a nota estimada para fechar ${lowest.subject.rules.minimumFinalGrade.toFixed(1).replace(".", ",")} seria ${formatNumber(calculateRequiredFinalExamGrade(lowestAverage, lowest.subject.rules.minimumFinalGrade))}.`
    : "";

  return {
    answer: `${lowest.subject.name} pede mais atencao: media ${formatNumber(lowestAverage)} e situacao "${lowest.situation}".${finalExamText}`,
    dataGaps: summaries.some((item) => item.average === null)
      ? ["Algumas disciplinas ainda nao tem notas cadastradas, entao a comparacao pode mudar."]
      : [],
    evidence: withGrades.slice(0, 3).map(
      (item) => `${item.subject.name}: media ${formatNumber(item.average)} com ${item.subject.grades.length} nota(s).`
    ),
    highlights: withGrades.slice(0, 3).map((item) => ({
      label: item.subject.name,
      tone: item.average !== null && item.average >= item.subject.rules.directApprovalGrade ? "mint" : "gold",
      value: formatNumber(item.average)
    })),
    intent: "grades",
    quickLinks: [
      { href: "/faculdade", label: "Faculdade" },
      { href: `/faculdade/${lowest.subject.id}`, label: "Abrir notas" }
    ],
    suggestions: [
      `Simular a proxima nota em ${lowest.subject.name}`,
      "Conferir pesos antes de confiar na media",
      "Priorizar materias abaixo da aprovacao direta"
    ]
  };
}

function buildDeadlineAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const deadlineItems = getDeadlineItems(input).sort(sortDeadlineItem);
  const upcoming = deadlineItems.filter((item) => item.date >= input.today).slice(0, 5);
  const late = deadlineItems.filter((item) => item.date < input.today);
  const first = late[0] ?? upcoming[0];

  if (!first) {
    return emptyAnswer("deadlines", "Nao encontrei prazos pendentes com data.", "/faculdade", "Atividades", [
      "Atividades sem data nao aparecem na agenda.",
      "Tarefas sem data ficam fora da lista de prazos."
    ]);
  }

  const dueText = first.date < input.today ? `venceu em ${formatShortDate(first.date)}` : `vence em ${formatShortDate(first.date)}`;

  return {
    answer: `O prazo que eu atacaria primeiro e "${first.title}" (${first.subtitle}), porque ${dueText}${first.time ? ` as ${first.time}` : ""}.`,
    dataGaps: deadlineItems.length === 0 ? ["Nao ha atividades ou tarefas pendentes com data."] : [],
    evidence: [
      late.length ? `${late.length} prazo(s) atrasado(s).` : "",
      upcoming.length ? `${upcoming.length} prazo(s) futuro(s) mais proximo(s).` : "",
      first.source === "activity" ? "Atividades academicas entram antes quando vencem na mesma data." : "Tarefas usam prioridade para desempate."
    ].filter(Boolean),
    highlights: [
      { label: "Proximos", tone: upcoming.length ? "gold" : "neutral", value: String(upcoming.length) },
      { label: "Atrasados", tone: late.length ? "coral" : "neutral", value: String(late.length) },
      { label: "Total", tone: "sky", value: String(deadlineItems.length) }
    ],
    intent: "deadlines",
    quickLinks: [
      { href: first.href, label: first.source === "activity" ? "Abrir materia" : "Abrir tarefas" },
      { href: "/calendario", label: "Calendario" }
    ],
    suggestions: [
      `Quebrar "${first.title}" em uma tarefa menor`,
      late.length ? "Resolver atrasados antes dos prazos novos" : "Reservar horario antes do vencimento",
      "Marcar como entregue quando finalizar"
    ]
  };
}

function buildSummaryAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const openTasks = input.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
  const pendingActivities = getPendingActivities(input.subjects);
  const attendanceRisks = input.subjects.filter(
    (subject) => calculateAttendanceSummary(subject.attendance, subject.rules, subject.name).alertLevel !== "normal"
  );
  const deadlineItems = getDeadlineItems(input).sort(sortDeadlineItem);
  const nextDeadline = deadlineItems[0];

  return {
    answer: `Resumo rapido: ${openTasks.length} tarefa(s) aberta(s), ${pendingActivities.length} atividade(s) academica(s) pendente(s) e ${attendanceRisks.length} materia(s) pedindo cuidado com faltas.${nextDeadline ? ` O proximo foco por prazo e "${nextDeadline.title}" em ${formatShortDate(nextDeadline.date)}.` : ""}`,
    dataGaps: buildGaps(input, {
      noGrades: input.subjects.every((subject) => subject.grades.length === 0),
      noSchedules: input.subjects.every((subject) => subject.schedules.length === 0)
    }),
    evidence: [
      `${input.subjects.length} disciplina(s) visiveis analisada(s).`,
      `${openTasks.length} tarefa(s) abertas e ${pendingActivities.length} atividade(s) pendentes.`,
      attendanceRisks.length ? `${attendanceRisks.length} disciplina(s) com alerta de falta.` : "Nenhum alerta de falta no momento."
    ],
    highlights: [
      { label: "Tarefas", tone: openTasks.length ? "coral" : "neutral", value: String(openTasks.length) },
      { label: "Atividades", tone: pendingActivities.length ? "gold" : "neutral", value: String(pendingActivities.length) },
      { label: "Faltas", tone: attendanceRisks.length ? "coral" : "mint", value: String(attendanceRisks.length) }
    ],
    intent: "summary",
    quickLinks: [
      { href: "/tarefas", label: "Tarefas" },
      { href: "/faculdade", label: "Faculdade" },
      { href: "/calendario", label: "Calendario" }
    ],
    suggestions: ["Pergunte o que fazer agora", "Pergunte por uma disciplina especifica", "Pergunte o que esta atrasado"]
  };
}

function emptyAnswer(intent: AssistantIntent, answer: string, href: string, label: string, dataGaps: string[] = []): RoutineAssistantResponse {
  return {
    answer,
    dataGaps,
    evidence: ["Nao havia dados suficientes para uma analise mais profunda."],
    highlights: [{ label: "Status", tone: "neutral", value: "0" }],
    intent,
    quickLinks: [{ href, label }],
    suggestions: ["Cadastrar mais dados", "Voltar para a tela Hoje", "Revisar as configuracoes"]
  };
}

function getTargetSubjects(input: RoutineAssistantInput) {
  const mentionedSubjects = findMentionedSubjects(input.question, input.subjects);
  return mentionedSubjects.length ? mentionedSubjects : input.subjects;
}

function findMentionedSubjects(question: string, subjects: Subject[]) {
  const normalizedQuestion = normalizeText(question);
  return subjects.filter((subject) => {
    const candidates = [subject.name, subject.code ?? "", subject.professor ?? ""]
      .flatMap((value) => [value, ...normalizeText(value).split(/\s+/).filter((part) => part.length >= 4)])
      .map(normalizeText)
      .filter(Boolean);

    return candidates.some((candidate) => normalizedQuestion.includes(candidate));
  });
}

function getDeadlineItems(input: RoutineAssistantInput): DeadlineItem[] {
  const activities = getPendingActivities(getTargetSubjects(input)).map(({ activity, subject }) => ({
    date: activity.dueDate,
    href: `/faculdade/${subject.id}`,
    id: activity.id,
    priorityScore: activity.dueDate < input.today ? -2 : 1,
    source: "activity" as const,
    subtitle: subject.name,
    time: activity.time,
    title: activity.title
  }));

  const tasks = input.tasks
    .filter((task) => task.status !== "done" && task.status !== "cancelled")
    .map((task) => ({
      date: task.dueDate ?? task.date ?? "",
      href: "/tarefas",
      id: task.id,
      priorityScore: taskPriorityScore[task.priority],
      source: "task" as const,
      subtitle: task.category ?? "Tarefa",
      time: task.time,
      title: task.title
    }))
    .filter((item) => item.date);

  return [...activities, ...tasks];
}

function getPendingActivities(subjects: Subject[]): PendingActivity[] {
  return subjects.flatMap((subject) =>
    subject.activities.filter((activity) => pendingStatuses.has(activity.status)).map((activity) => ({ activity, subject }))
  );
}

function getTodayClasses(subjects: Subject[], today: string) {
  const weekday = getWeekdayFromDate(parseDateKey(today));
  return subjects.flatMap((subject) =>
    subject.schedules
      .filter((schedule) => schedule.weekday === weekday)
      .map((schedule) => ({
        subject,
        time: schedule.startTime
      }))
  );
}

function sortPendingActivity(a: PendingActivity, b: PendingActivity) {
  const dateDelta = a.activity.dueDate.localeCompare(b.activity.dueDate);
  if (dateDelta !== 0) {
    return dateDelta;
  }

  return (a.activity.time ?? "23:59").localeCompare(b.activity.time ?? "23:59");
}

function sortDeadlineItem(a: DeadlineItem, b: DeadlineItem) {
  const dateDelta = a.date.localeCompare(b.date);
  if (dateDelta !== 0) {
    return dateDelta;
  }

  const priorityDelta = a.priorityScore - b.priorityScore;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return (a.time ?? "23:59").localeCompare(b.time ?? "23:59");
}

function sortByOptionalTime(a: Event, b: Event) {
  return (a.startsAt ?? "23:59").localeCompare(b.startsAt ?? "23:59");
}

function isBeforeToday(date: string | undefined, today: string) {
  return Boolean(date && date < today);
}

function buildGaps(input: RoutineAssistantInput, options: Partial<Record<"noGrades" | "noSchedules" | "noTasks", boolean>>) {
  return [
    options.noGrades ? "Notas ainda estao incompletas, entao a IA nao consegue comparar medias com seguranca." : "",
    options.noSchedules ? "Horarios de aula ainda estao incompletos, entao a agenda do dia pode ficar parcial." : "",
    options.noTasks ? "Sem tarefas cadastradas, a prioridade fica concentrada em aulas e prazos." : "",
    input.subjects.length === 0 ? "Cadastre disciplinas para a IA entender a parte academica." : ""
  ].filter(Boolean);
}

function applyAnswerStyle(response: RoutineAssistantResponse, style: AppPreference["assistantAnswerStyle"]) {
  if (style === "direct") {
    return {
      ...response,
      suggestions: response.suggestions.slice(0, 2)
    };
  }

  if (style === "coach") {
    return {
      ...response,
      answer: `${response.answer} Meu conselho: escolha uma acao pequena e termine antes de abrir outra.`,
      suggestions: response.suggestions.map((suggestion) => `Fazer: ${suggestion}`)
    };
  }

  return response;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(normalizeText(candidate)));
}

function joinParts(parts: string[]) {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

function formatNumber(value: number | null) {
  return value === null ? "--" : value.toFixed(1).replace(".", ",");
}
