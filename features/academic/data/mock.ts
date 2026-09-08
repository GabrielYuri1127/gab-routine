import { createUfamRules } from "@/lib/academic-rules/ufam";
import type { AcademicActivity, Subject, SubjectSchedule, Weekday } from "@/types/academic";

export const mockSubjects: Subject[] = [
  {
    id: "redes-de-computadores",
    name: "Redes de Computadores",
    code: "IEC041",
    professor: "Prof. Almeida",
    room: "Lab 3",
    semester: "2026/1",
    workloadHours: 60,
    color: "#0f9f7a",
    status: "active",
    rules: createUfamRules({
      totalExpectedClasses: 60,
      classesPerMeeting: 2
    }),
    schedules: [
      {
        id: "redes-segunda",
        subjectId: "redes-de-computadores",
        weekday: "monday",
        startTime: "08:00",
        endTime: "09:40",
        classesQuantity: 2
      },
      {
        id: "redes-quarta",
        subjectId: "redes-de-computadores",
        weekday: "wednesday",
        startTime: "08:00",
        endTime: "09:40",
        classesQuantity: 2
      }
    ],
    attendance: [
      {
        id: "redes-2026-08-27",
        subjectId: "redes-de-computadores",
        date: "2026-08-27",
        quantity: 2,
        status: "absence",
        notes: "Aula de roteamento"
      },
      {
        id: "redes-2026-08-20",
        subjectId: "redes-de-computadores",
        date: "2026-08-20",
        quantity: 2,
        status: "present"
      },
      {
        id: "redes-2026-08-18",
        subjectId: "redes-de-computadores",
        date: "2026-08-18",
        quantity: 2,
        status: "justified",
        notes: "Atestado enviado"
      },
      {
        id: "redes-2026-08-11",
        subjectId: "redes-de-computadores",
        date: "2026-08-11",
        quantity: 2,
        status: "absence"
      },
      {
        id: "redes-2026-08-04",
        subjectId: "redes-de-computadores",
        date: "2026-08-04",
        quantity: 2,
        status: "absence"
      }
    ],
    grades: [
      {
        id: "redes-av1",
        subjectId: "redes-de-computadores",
        name: "AV1",
        score: 7,
        maxScore: 10,
        weight: 1,
        type: "exam",
        date: "2026-08-15"
      },
      {
        id: "redes-av2",
        subjectId: "redes-de-computadores",
        name: "AV2",
        score: 7.8,
        maxScore: 10,
        weight: 1,
        type: "exam",
        date: "2026-08-29"
      }
    ],
    activities: [
      {
        id: "redes-relatorio",
        subjectId: "redes-de-computadores",
        title: "Finalizar relatorio de camada de rede",
        dueDate: "2026-08-31",
        time: "23:59",
        type: "report",
        status: "in_progress",
        maxScore: 10
      },
      {
        id: "redes-revisao",
        subjectId: "redes-de-computadores",
        title: "Revisar enderecamento IPv6",
        dueDate: "2026-09-03",
        type: "exercise",
        status: "not_started"
      }
    ],
    observations: "Prioridade alta neste semestre."
  },
  {
    id: "sistemas-operacionais",
    name: "Sistemas Operacionais",
    code: "ICC012",
    professor: "Profa. Camila",
    room: "Sala 204",
    semester: "2026/1",
    workloadHours: 72,
    color: "#2b7fff",
    status: "active",
    rules: createUfamRules({
      totalExpectedClasses: 72,
      classesPerMeeting: 2,
      gradingMethod: "weighted"
    }),
    schedules: [
      {
        id: "so-segunda",
        subjectId: "sistemas-operacionais",
        weekday: "monday",
        startTime: "10:00",
        endTime: "11:40",
        classesQuantity: 2
      },
      {
        id: "so-quinta",
        subjectId: "sistemas-operacionais",
        weekday: "thursday",
        startTime: "10:00",
        endTime: "11:40",
        classesQuantity: 2
      }
    ],
    attendance: [
      {
        id: "so-2026-08-21",
        subjectId: "sistemas-operacionais",
        date: "2026-08-21",
        quantity: 2,
        status: "absence"
      },
      {
        id: "so-2026-08-14",
        subjectId: "sistemas-operacionais",
        date: "2026-08-14",
        quantity: 2,
        status: "absence"
      }
    ],
    grades: [
      {
        id: "so-lista",
        subjectId: "sistemas-operacionais",
        name: "Lista de processos",
        score: 9,
        maxScore: 10,
        weight: 1,
        type: "activity"
      },
      {
        id: "so-prova",
        subjectId: "sistemas-operacionais",
        name: "Prova 1",
        score: 7.4,
        maxScore: 10,
        weight: 2,
        type: "exam"
      }
    ],
    activities: [
      {
        id: "so-lista-escalonamento",
        subjectId: "sistemas-operacionais",
        title: "Lista de escalonamento",
        dueDate: "2026-09-02",
        time: "22:00",
        type: "list",
        status: "in_progress",
        weight: 1
      }
    ]
  },
  {
    id: "engenharia-de-software",
    name: "Engenharia de Software",
    code: "ICC208",
    professor: "Prof. Bruno",
    room: "Sala 112",
    semester: "2026/1",
    workloadHours: 60,
    color: "#e35d45",
    status: "active",
    rules: createUfamRules({
      totalExpectedClasses: 60,
      classesPerMeeting: 2
    }),
    schedules: [
      {
        id: "eng-terca",
        subjectId: "engenharia-de-software",
        weekday: "tuesday",
        startTime: "14:00",
        endTime: "15:40",
        classesQuantity: 2
      }
    ],
    attendance: [],
    grades: [
      {
        id: "eng-projeto",
        subjectId: "engenharia-de-software",
        name: "Projeto parcial",
        score: 8.5,
        maxScore: 10,
        weight: 2,
        type: "project"
      }
    ],
    activities: [
      {
        id: "eng-backlog",
        subjectId: "engenharia-de-software",
        title: "Atualizar backlog do projeto",
        dueDate: "2026-09-06",
        type: "project",
        status: "not_started"
      }
    ]
  }
];

export interface DayBlock {
  id: string;
  title: string;
  time: string;
  type: "class" | "work" | "study";
  subjectId?: string;
}

export const extraTodayBlocks: DayBlock[] = [
  {
    id: "estagio",
    title: "Estagio",
    time: "12:00",
    type: "work"
  },
  {
    id: "estudo-noite",
    title: "Estudo",
    time: "19:00",
    type: "study"
  }
];

export function getSubjectById(id: string) {
  return mockSubjects.find((subject) => subject.id === id);
}

export function getSubjectScheduleLabel(schedules: SubjectSchedule[]) {
  return schedules
    .map((schedule) => `${weekdayShortLabel(schedule.weekday)} ${schedule.startTime}`)
    .join(" / ");
}

export function getPendingActivities(subjects = mockSubjects): AcademicActivity[] {
  return subjects
    .flatMap((subject) => subject.activities)
    .filter((activity) => activity.status !== "submitted" && activity.status !== "corrected")
    .sort((a, b) => `${a.dueDate}${a.time ?? ""}`.localeCompare(`${b.dueDate}${b.time ?? ""}`));
}

export function getClassBlocksForWeekday(weekday: Weekday, subjects = mockSubjects): DayBlock[] {
  return subjects.flatMap((subject) =>
    subject.schedules
      .filter((schedule) => schedule.weekday === weekday)
      .map((schedule) => ({
        id: schedule.id,
        title: subject.name,
        time: schedule.startTime,
        type: "class" as const,
        subjectId: subject.id
      }))
  );
}

function weekdayShortLabel(weekday: Weekday) {
  const labels: Record<Weekday, string> = {
    monday: "Seg",
    tuesday: "Ter",
    wednesday: "Qua",
    thursday: "Qui",
    friday: "Sex",
    saturday: "Sab",
    sunday: "Dom"
  };

  return labels[weekday];
}
