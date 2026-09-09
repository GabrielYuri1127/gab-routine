"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { buildSeedData, LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";
import {
  createId,
  loadRoutineData,
  normalizeRoutineData,
  RoutineDataContext,
  saveRoutineData,
  type RoutineDataContextValue
} from "@/features/data/routine-store";
import type { AcademicActivity, AttendanceRecord, Grade, Subject } from "@/types/academic";
import type { Reminder, Task } from "@/types/domain";

export function RoutineDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RoutineData>(() => buildSeedData());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(loadRoutineData());
    setHydrated(true);
  }, []);

  const updateData = useCallback((updater: (current: RoutineData) => RoutineData) => {
    setData((current) => {
      const next = updater(current);
      saveRoutineData(next);
      return next;
    });
  }, []);

  const value = useMemo<RoutineDataContextValue>(
    () => ({
      data,
      hydrated,
      replaceData: (newData) => {
        updateData(() => normalizeRoutineData(newData));
      },
      resetData: () => {
        updateData(() => buildSeedData());
      },
      addSubject: (subject: Subject) => {
        updateData((current) => ({
          ...current,
          subjects: [subject, ...current.subjects]
        }));
      },
      updateSubject: (subjectId, patch) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) => (subject.id === subjectId ? { ...subject, ...patch } : subject))
        }));
      },
      removeSubject: (subjectId) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.filter((subject) => subject.id !== subjectId)
        }));
      },
      addTask: (task) => {
        updateData((current) => ({
          ...current,
          tasks: [
            {
              id: createId("task"),
              userId: LOCAL_USER_ID,
              status: "open",
              ...task
            },
            ...current.tasks
          ]
        }));
      },
      updateTask: (taskId, patch) => {
        updateData((current) => ({
          ...current,
          tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
        }));
      },
      completeTask: (taskId) => {
        updateData((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: task.status === "done" ? "open" : "done",
                  completedAt: task.status === "done" ? undefined : new Date().toISOString()
                }
              : task
          )
        }));
      },
      snoozeTask: (taskId, date) => {
        updateData((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  date,
                  dueDate: task.dueDate ?? date,
                  status: "snoozed",
                  snoozedUntil: `${date}T09:00:00`
                }
              : task
          )
        }));
      },
      removeTask: (taskId) => {
        updateData((current) => ({
          ...current,
          tasks: current.tasks.filter((task) => task.id !== taskId)
        }));
      },
      addReminder: (reminder) => {
        updateData((current) => ({
          ...current,
          reminders: [
            {
              id: createId("reminder"),
              userId: LOCAL_USER_ID,
              status: "scheduled",
              ...reminder
            },
            ...current.reminders
          ]
        }));
      },
      updateReminder: (reminderId, patch) => {
        updateData((current) => ({
          ...current,
          reminders: current.reminders.map((reminder) =>
            reminder.id === reminderId ? { ...reminder, ...patch } : reminder
          )
        }));
      },
      dismissReminder: (reminderId) => {
        updateData((current) => ({
          ...current,
          reminders: current.reminders.map((reminder) =>
            reminder.id === reminderId ? { ...reminder, status: "dismissed" } : reminder
          )
        }));
      },
      removeReminder: (reminderId) => {
        updateData((current) => ({
          ...current,
          reminders: current.reminders.filter((reminder) => reminder.id !== reminderId)
        }));
      },
      addEvent: (event) => {
        updateData((current) => ({
          ...current,
          events: [
            {
              id: createId("event"),
              userId: LOCAL_USER_ID,
              ...event
            },
            ...current.events
          ]
        }));
      },
      updateEvent: (eventId, patch) => {
        updateData((current) => ({
          ...current,
          events: current.events.map((event) => (event.id === eventId ? { ...event, ...patch } : event))
        }));
      },
      removeEvent: (eventId) => {
        updateData((current) => ({
          ...current,
          events: current.events.filter((event) => event.id !== eventId)
        }));
      },
      updateAppPreference: (patch) => {
        updateData((current) => ({
          ...current,
          appPreference: {
            ...current.appPreference,
            ...patch,
            enabledModules: {
              ...current.appPreference.enabledModules,
              ...(patch.enabledModules ?? {})
            }
          }
        }));
      },
      updateNotificationPreference: (patch) => {
        updateData((current) => ({
          ...current,
          notificationPreference: {
            ...current.notificationPreference,
            ...patch
          }
        }));
      },
      addAttendanceRecord: (subjectId, record) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId ? { ...subject, attendance: [record, ...subject.attendance] } : subject
          )
        }));
      },
      updateAttendanceRecord: (subjectId, recordId, patch) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId
              ? {
                  ...subject,
                  attendance: subject.attendance.map((record) =>
                    record.id === recordId ? { ...record, ...patch } : record
                  )
                }
              : subject
          )
        }));
      },
      removeAttendanceRecord: (subjectId, recordId) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId
              ? { ...subject, attendance: subject.attendance.filter((record) => record.id !== recordId) }
              : subject
          )
        }));
      },
      addGrade: (subjectId, grade: Grade) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId ? { ...subject, grades: [grade, ...subject.grades] } : subject
          )
        }));
      },
      updateGrade: (subjectId, gradeId, patch) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId
              ? {
                  ...subject,
                  grades: subject.grades.map((grade) => (grade.id === gradeId ? { ...grade, ...patch } : grade))
                }
              : subject
          )
        }));
      },
      removeGrade: (subjectId, gradeId) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId
              ? {
                  ...subject,
                  grades: subject.grades.filter((grade) => grade.id !== gradeId)
                }
              : subject
          )
        }));
      },
      addActivity: (subjectId, activity: AcademicActivity) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId ? { ...subject, activities: [activity, ...subject.activities] } : subject
          )
        }));
      },
      updateActivity: (subjectId, activityId, patch) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId
              ? {
                  ...subject,
                  activities: subject.activities.map((activity) =>
                    activity.id === activityId ? { ...activity, ...patch } : activity
                  )
                }
              : subject
          )
        }));
      },
      removeActivity: (subjectId, activityId) => {
        updateData((current) => ({
          ...current,
          subjects: current.subjects.map((subject) =>
            subject.id === subjectId
              ? { ...subject, activities: subject.activities.filter((activity) => activity.id !== activityId) }
              : subject
          )
        }));
      }
    }),
    [data, hydrated, updateData]
  );

  return <RoutineDataContext.Provider value={value}>{children}</RoutineDataContext.Provider>;
}
