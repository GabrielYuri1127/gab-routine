import { mockSubjects } from "@/features/academic/data/mock";
import { addDays, getTodayInAppTimeZone, toDateKey } from "@/lib/date";
import type { AppPreference, Event, NotificationPreference, Reminder, Task } from "@/types/domain";
import type { Subject } from "@/types/academic";

export const LOCAL_USER_ID = "local-user";

export const DEFAULT_APP_PREFERENCE: AppPreference = {
  id: "local-app-preferences",
  userId: LOCAL_USER_ID,
  accentColor: "#0f9f7a",
  appName: "GAB ROUTINE",
  assistantAnswerStyle: "balanced",
  defaultClassesQuantity: 2,
  defaultSemester: "2026/1",
  defaultWorkloadHours: 60,
  displayName: "Gabriel",
  enabledModules: {
    assistant: true,
    calendar: true,
    classroom: true,
    reminders: true,
    tasks: true,
    tutorial: true
  },
  profileLabel: "rotina pessoal"
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
    subjects: mockSubjects,
    tasks: [
      {
        id: "finalizar-relatorio",
        userId: LOCAL_USER_ID,
        title: "Finalizar relatorio",
        description: "Fechar versao final antes de enviar.",
        priority: "urgent",
        category: "Faculdade",
        date: today,
        dueDate: today,
        time: "20:00",
        estimatedMinutes: 45,
        status: "open"
      },
      {
        id: "revisar-redes",
        userId: LOCAL_USER_ID,
        title: "Revisar Redes",
        priority: "high",
        category: "Estudo",
        date: today,
        dueDate: tomorrow,
        estimatedMinutes: 35,
        status: "open"
      },
      {
        id: "organizar-amanha",
        userId: LOCAL_USER_ID,
        title: "Organizar amanha",
        priority: "medium",
        category: "Rotina",
        date: today,
        time: "21:30",
        estimatedMinutes: 15,
        status: "open"
      },
      {
        id: "limpar-backlog",
        userId: LOCAL_USER_ID,
        title: "Limpar backlog do projeto",
        priority: "low",
        category: "Trabalho",
        date: nextWeek,
        dueDate: nextWeek,
        estimatedMinutes: 30,
        status: "open"
      }
    ],
    reminders: [
      {
        id: "levar-relatorio",
        userId: LOCAL_USER_ID,
        title: "Levar relatorio",
        remindAt: `${tomorrow}T08:00:00`,
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
        id: "resolver-pendencias",
        userId: LOCAL_USER_ID,
        title: "Resolver pendencias",
        date: today,
        startsAt: "16:00",
        endsAt: "17:00",
        category: "appointment"
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
