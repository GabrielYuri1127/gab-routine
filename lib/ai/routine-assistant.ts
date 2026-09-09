import { calculateAttendanceSummary } from "../academic-rules/attendance";
import { calculateGradeAverage, getAcademicSituation } from "../academic-rules/grades";
import { formatShortDate, getWeekdayFromDate, parseDateKey } from "../date";
import { getReminderDateKey, getReminderTime } from "../reminders/schedule";
import { getTaskDate, prioritizeTasks } from "../tasks/prioritization";
import type { AcademicActivity, Subject } from "@/types/academic";
import type { Event, Reminder, Task } from "@/types/domain";

export type AssistantIntent = "now" | "attendance" | "grades" | "deadlines" | "summary";
export type AssistantTone = "mint" | "sky" | "gold" | "coral" | "neutral";

export interface RoutineAssistantInput {
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
  highlights: AssistantHighlight[];
  intent: AssistantIntent;
  quickLinks: AssistantQuickLink[];
  suggestions: string[];
}

interface PendingActivity {
  activity: AcademicActivity;
  subject: Subject;
}

const pendingStatuses = new Set<AcademicActivity["status"]>(["not_started", "in_progress", "late"]);

export function buildRoutineAssistantResponse(input: RoutineAssistantInput): RoutineAssistantResponse {
  const intent = detectIntent(input.question);
  const safeInput = {
    ...input,
    subjects: input.subjects.filter((subject) => subject.status !== "archived")
  };

  if (intent === "attendance") {
    return buildAttendanceAnswer(safeInput);
  }

  if (intent === "grades") {
    return buildGradeAnswer(safeInput);
  }

  if (intent === "deadlines") {
    return buildDeadlineAnswer(safeInput);
  }

  if (intent === "now") {
    return buildNowAnswer(safeInput);
  }

  return buildSummaryAnswer(safeInput);
}

function detectIntent(question: string): AssistantIntent {
  const normalized = normalizeText(question);

  if (includesAny(normalized, ["falta", "faltas", "frequencia", "presenca", "reprovar por falta"])) {
    return "attendance";
  }

  if (includesAny(normalized, ["nota", "media", "pf", "prova final", "passar", "aprovacao"])) {
    return "grades";
  }

  if (includesAny(normalized, ["prazo", "atividade", "trabalho", "entrega", "prova", "vencendo"])) {
    return "deadlines";
  }

  if (includesAny(normalized, ["agora", "hoje", "primeiro", "prioridade", "fazer"])) {
    return "now";
  }

  return "summary";
}

function buildNowAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const todayTasks = prioritizeTasks(
    input.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled" && getTaskDate(task) === input.today),
    input.today
  );
  const urgentTasks = todayTasks.filter((task) => task.priority === "urgent" || task.priority === "high");
  const todayEvents = input.events.filter((event) => event.date === input.today).sort(sortByOptionalTime);
  const todayReminders = input.reminders
    .filter((reminder) => reminder.status === "scheduled" && getReminderDateKey(reminder) === input.today)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  const todayActivities = getPendingActivities(input.subjects)
    .filter(({ activity }) => activity.dueDate === input.today)
    .sort(sortPendingActivity);
  const todayClasses = getTodayClasses(
    input.subjects.filter((subject) => subject.status === "active"),
    input.today
  );
  const firstTask = todayTasks[0];
  const firstEvent = todayEvents[0];
  const firstActivity = todayActivities[0];

  const lead = firstTask
    ? `Eu comecaria por "${firstTask.title}", porque esta entre as prioridades de hoje.`
    : firstActivity
      ? `Eu olharia primeiro para "${firstActivity.activity.title}" em ${firstActivity.subject.name}.`
      : firstEvent
        ? `O proximo compromisso cadastrado e "${firstEvent.title}".`
        : "Hoje esta leve no app; bom momento para organizar pendencias pequenas.";

  const detailParts = [
    todayClasses.length ? `${todayClasses.length} aula(s)` : "",
    todayEvents.length ? `${todayEvents.length} compromisso(s)` : "",
    todayTasks.length ? `${todayTasks.length} tarefa(s)` : "",
    todayReminders.length ? `${todayReminders.length} lembrete(s)` : "",
    todayActivities.length ? `${todayActivities.length} prazo(s)` : ""
  ].filter(Boolean);

  return {
    answer: `${lead} Para hoje vejo ${detailParts.length ? joinParts(detailParts) : "nenhum item com data marcada"}.`,
    highlights: [
      { label: "Hoje", tone: "mint", value: String(todayClasses.length + todayEvents.length + todayTasks.length + todayReminders.length) },
      { label: "Prioridade alta", tone: urgentTasks.length ? "coral" : "neutral", value: String(urgentTasks.length) },
      { label: "Prazos hoje", tone: todayActivities.length ? "gold" : "neutral", value: String(todayActivities.length) }
    ],
    intent: "now",
    quickLinks: [
      { href: "/tarefas", label: "Tarefas" },
      { href: "/semana", label: "Semana" },
      { href: "/calendario", label: "Calendario" }
    ],
    suggestions: ["Organize por horario", "Finalize o que vence hoje", "Adie apenas o que nao depende de prazo"]
  };
}

function buildAttendanceAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const summaries = input.subjects
    .map((subject) => ({
      subject,
      summary: calculateAttendanceSummary(subject.attendance, subject.rules, subject.name)
    }))
    .sort((a, b) => b.summary.limitUsagePercent - a.summary.limitUsagePercent);
  const risks = summaries.filter(({ summary }) => summary.alertLevel !== "normal");
  const top = risks[0] ?? summaries[0];

  if (!top) {
    return emptyAnswer("attendance", "Ainda nao ha disciplinas para analisar faltas.", "/faculdade", "Faculdade");
  }

  const answer = risks.length
    ? `Maior atencao em ${top.subject.name}: ${top.summary.usedAbsences}/${top.summary.absenceLimit} faltas usadas e ${Math.round(
        top.summary.frequency
      )}% de frequencia.`
    : `As faltas estao controladas. A disciplina mais proxima do limite e ${top.subject.name}, com ${top.summary.remainingAbsences} falta(s) restante(s).`;

  return {
    answer,
    highlights: summaries.slice(0, 3).map(({ subject, summary }) => ({
      label: subject.name,
      tone: summary.alertLevel === "normal" ? "mint" : summary.alertLevel === "attention" ? "gold" : "coral",
      value: `${summary.remainingAbsences} livres`
    })),
    intent: "attendance",
    quickLinks: [
      { href: "/faculdade", label: "Faculdade" },
      { href: top ? `/faculdade/${top.subject.id}` : "/faculdade", label: "Disciplina" }
    ],
    suggestions: ["Registre faltas no dia certo", "Compare faltas justificadas e comuns", "Confira o total de aulas da materia"]
  };
}

function buildGradeAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const summaries = input.subjects
    .map((subject) => {
      const average = calculateGradeAverage(subject.grades, subject.rules.gradingMethod);
      return {
        average,
        situation: getAcademicSituation(average, subject.rules.directApprovalGrade, subject.rules.minimumFinalGrade),
        subject
      };
    })
    .sort((a, b) => (a.average ?? -1) - (b.average ?? -1));
  const withGrades = summaries.filter((item) => item.average !== null);
  const lowest = withGrades[0];

  if (!lowest) {
    return emptyAnswer("grades", "Ainda nao ha notas suficientes para calcular medias.", "/faculdade", "Notas");
  }

  return {
    answer: `${lowest.subject.name} pede mais atencao: media ${formatNumber(lowest.average)} e situacao "${lowest.situation}".`,
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
    suggestions: ["Simule a proxima nota", "Priorize materias abaixo da aprovacao direta", "Revise pesos antes da PF"]
  };
}

function buildDeadlineAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const pendingActivities = getPendingActivities(input.subjects).sort(sortPendingActivity);
  const upcoming = pendingActivities.filter(({ activity }) => activity.dueDate >= input.today).slice(0, 4);
  const late = pendingActivities.filter(({ activity }) => activity.dueDate < input.today);
  const first = upcoming[0] ?? late[0];

  if (!first) {
    return emptyAnswer("deadlines", "Nao encontrei atividades academicas pendentes.", "/faculdade", "Atividades");
  }

  const dueText = first.activity.dueDate < input.today ? "atrasada" : `para ${formatShortDate(first.activity.dueDate)}`;

  return {
    answer: `O prazo mais importante agora e "${first.activity.title}" em ${first.subject.name}, ${dueText}.`,
    highlights: [
      { label: "Proximos", tone: upcoming.length ? "gold" : "neutral", value: String(upcoming.length) },
      { label: "Atrasados", tone: late.length ? "coral" : "neutral", value: String(late.length) },
      { label: "Materias", tone: "sky", value: String(new Set(pendingActivities.map(({ subject }) => subject.id)).size) }
    ],
    intent: "deadlines",
    quickLinks: [
      { href: "/faculdade", label: "Faculdade" },
      { href: `/faculdade/${first.subject.id}`, label: "Abrir atividade" }
    ],
    suggestions: ["Quebre o prazo em tarefas menores", "Coloque horario no calendario", "Marque como entregue quando finalizar"]
  };
}

function buildSummaryAnswer(input: RoutineAssistantInput): RoutineAssistantResponse {
  const openTasks = input.tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
  const pendingActivities = getPendingActivities(input.subjects);
  const attendanceRisks = input.subjects.filter(
    (subject) => calculateAttendanceSummary(subject.attendance, subject.rules, subject.name).alertLevel !== "normal"
  );

  return {
    answer: `Resumo rapido: ${openTasks.length} tarefa(s) aberta(s), ${pendingActivities.length} atividade(s) academica(s) pendente(s) e ${attendanceRisks.length} materia(s) pedindo cuidado com faltas.`,
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
    suggestions: ["Pergunte o que fazer agora", "Pergunte sobre faltas", "Pergunte sobre medias ou prazos"]
  };
}

function emptyAnswer(intent: AssistantIntent, answer: string, href: string, label: string): RoutineAssistantResponse {
  return {
    answer,
    highlights: [{ label: "Status", tone: "neutral", value: "0" }],
    intent,
    quickLinks: [{ href, label }],
    suggestions: ["Cadastre mais dados", "Volte para a tela Hoje", "Revise as configuracoes"]
  };
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

function sortByOptionalTime(a: Event, b: Event) {
  return (a.startsAt ?? "23:59").localeCompare(b.startsAt ?? "23:59");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
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
