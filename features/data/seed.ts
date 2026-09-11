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
  contexts: ["produtividade"],
  courseOrArea: "",
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
  primaryContext: "produtividade",
  profileLabel: "rotina inteligente",
  productivityGoal: ""
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
        id: "definir-prioridades",
        userId: LOCAL_USER_ID,
        title: "Definir prioridades do dia",
        description: "Escolha ate 3 coisas importantes para hoje.",
        priority: "high",
        category: "Produtividade",
        date: today,
        dueDate: today,
        time: "08:30",
        estimatedMinutes: 15,
        status: "open"
      },
      {
        id: "organizar-rotina",
        userId: LOCAL_USER_ID,
        title: "Adicionar compromissos fixos",
        description: "Cadastre aulas, trabalho, treino, estudos ou qualquer rotina recorrente.",
        priority: "medium",
        category: "Rotina",
        date: today,
        dueDate: tomorrow,
        estimatedMinutes: 20,
        status: "open"
      },
      {
        id: "planejar-amanha",
        userId: LOCAL_USER_ID,
        title: "Planejar amanha",
        priority: "medium",
        category: "Rotina",
        date: today,
        time: "21:30",
        estimatedMinutes: 15,
        status: "open"
      },
      {
        id: "revisar-semana",
        userId: LOCAL_USER_ID,
        title: "Revisar semana",
        priority: "low",
        category: "Produtividade",
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
