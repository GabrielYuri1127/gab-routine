import { addDays, getTodayInAppTimeZone, toDateKey } from "@/lib/date";
import type { AppPreference, Event, NotificationPreference, Reminder, Task } from "@/types/domain";
import type { Subject } from "@/types/academic";

export const LOCAL_USER_ID = "local-user";

export const DEFAULT_APP_PREFERENCE: AppPreference = {
  id: "local-app-preferences",
  userId: LOCAL_USER_ID,
  accentColor: "#0f9f7a",
  appName: "Gavium",
  assistantAnswerStyle: "balanced",
  birthDate: "",
  contextDetails: "",
  contexts: ["faculdade", "trabalho"],
  courseOrArea: "",
  courseInstitution: "",
  courseTotalSemesters: 10,
  courseTotalWorkloadHours: 0,
  currentCurriculumPeriod: 1,
  defaultClassesQuantity: 2,
  defaultSemester: "Atual",
  defaultWorkloadHours: 60,
  discoverySource: "",
  displayName: "Usuario",
  enabledModules: {
    assistant: true,
    calendar: true,
    classroom: true,
    reminders: true,
    tasks: true,
    tutorial: true
  },
  gender: "",
  primaryContext: "faculdade",
  profileLabel: "faculdade e trabalho",
  productivityGoal: "Organizar a vida acadêmica e o trabalho sem perder prazos."
};

export interface RoutineData {
  version: 4;
  userId: string;
  appPreference: AppPreference;
  subjects: Subject[];
  tasks: Task[];
  reminders: Reminder[];
  events: Event[];
  notificationPreference: NotificationPreference;
}

export function buildSeedData(today = getTodayInAppTimeZone()): RoutineData {
  const todayDate = new Date(`${today}T12:00:00`);
  const tomorrow = toDateKey(addDays(todayDate, 1));
  const nextWeek = toDateKey(addDays(todayDate, 7));

  return {
    version: 4,
    userId: LOCAL_USER_ID,
    appPreference: DEFAULT_APP_PREFERENCE,
    subjects: [],
    tasks: [
      {
        id: "configurar-curso",
        userId: LOCAL_USER_ID,
        title: "Configurar curso e periodo atual",
        description: "Informe instituicao, duracao e carga horaria total do curso.",
        priority: "high",
        category: "Faculdade",
        date: today,
        dueDate: today,
        time: "08:30",
        estimatedMinutes: 15,
        status: "open"
      },
      {
        id: "cadastrar-disciplinas",
        userId: LOCAL_USER_ID,
        title: "Cadastrar disciplinas atuais",
        description: "Adicione horarios, carga horaria e regras de faltas das disciplinas em andamento.",
        priority: "medium",
        category: "Faculdade",
        date: today,
        dueDate: tomorrow,
        estimatedMinutes: 20,
        status: "open"
      },
      {
        id: "registrar-entrega-trabalho",
        userId: LOCAL_USER_ID,
        title: "Registrar proxima entrega de trabalho",
        description: "Adicione o prazo e uma estimativa de tempo para a prioridade profissional mais proxima.",
        priority: "medium",
        category: "Trabalho",
        date: today,
        dueDate: tomorrow,
        estimatedMinutes: 20,
        status: "open"
      },
      {
        id: "revisar-semana",
        userId: LOCAL_USER_ID,
        title: "Revisar faculdade e trabalho da semana",
        priority: "low",
        category: "Faculdade",
        date: nextWeek,
        dueDate: nextWeek,
        estimatedMinutes: 30,
        status: "open"
      }
    ],
    reminders: [
      {
        id: "revisao-rapida",
        userId: LOCAL_USER_ID,
        title: "Revisar prioridades",
        remindAt: `${today}T09:00:00`,
        sourceType: "custom",
        status: "scheduled"
      },
      {
        id: "planejar-amanha",
        userId: LOCAL_USER_ID,
        title: "Planejar amanha",
        remindAt: `${today}T21:30:00`,
        sourceType: "custom",
        status: "scheduled"
      }
    ],
    events: [
      {
        id: "organizar-agenda",
        userId: LOCAL_USER_ID,
        title: "Organizar agenda",
        date: today,
        startsAt: "16:00",
        endsAt: "16:30",
        category: "personal"
      }
    ],
    notificationPreference: {
      id: "local-notification-preferences",
      userId: LOCAL_USER_ID,
      quietHoursStart: "23:00",
      quietHoursEnd: "07:00",
      dailySummaryTime: "07:00",
      tomorrowPlanningTime: "21:30"
    }
  };
}
