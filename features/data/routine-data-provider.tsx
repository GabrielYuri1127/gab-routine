"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { buildSeedData, LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";
import {
  LOCAL_CLOUD_STATE,
  assignRoutineDataUser,
  createEmptyRoutineData,
  createId,
  loadRoutineData,
  normalizeRoutineData,
  RoutineDataContext,
  saveRoutineData,
  type CloudSyncState,
  type RoutineDataContextValue
} from "@/features/data/routine-store";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchCloudRoutineData, upsertCloudRoutineData } from "@/services/persistence/supabase-repository";
import type { AcademicActivity, AttendanceRecord, Grade, Subject } from "@/types/academic";
import type { Reminder, Task } from "@/types/domain";

export function RoutineDataProvider({ children }: { children: ReactNode }) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [data, setData] = useState<RoutineData>(() => buildSeedData());
  const [cloud, setCloud] = useState<CloudSyncState>(LOCAL_CLOUD_STATE);
  const [hydrated, setHydrated] = useState(false);
  const cloudRef = useRef(cloud);

  useEffect(() => {
    cloudRef.current = cloud;
  }, [cloud]);

  useEffect(() => {
    let active = true;

    async function loadForUser(user: SupabaseUser | null) {
      if (!active) {
        return;
      }

      if (!user) {
        setData(loadRoutineData());
        setCloud({
          configured: isSupabaseConfigured(),
          email: null,
          status: "local",
          userId: null
        });
        setHydrated(true);
        return;
      }

      setHydrated(false);
      setCloud({
        configured: true,
        email: user.email ?? null,
        status: "loading",
        userId: user.id
      });

      try {
        const snapshot = await fetchCloudRoutineData(user.id);
        const nextData = snapshot?.data ?? createEmptyRoutineData(user.id, user.email);
        const synced = snapshot ?? (await upsertCloudRoutineData(nextData, user.id));

        if (!active) {
          return;
        }

        saveRoutineData(nextData, user.id);
        setData(nextData);
        setCloud({
          configured: true,
          email: user.email ?? null,
          lastSyncedAt: synced.updatedAt,
          status: "synced",
          userId: user.id
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const cached = assignRoutineDataUser(loadRoutineData(user.id), user.id);
        setData(cached);
        setCloud({
          configured: true,
          email: user.email ?? null,
          error: error instanceof Error ? error.message : "Nao consegui sincronizar com o Supabase.",
          status: "error",
          userId: user.id
        });
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    }

    if (!isSupabaseConfigured()) {
      setData(loadRoutineData());
      setCloud(LOCAL_CLOUD_STATE);
      setHydrated(true);
      return;
    }

    const client = createSupabaseBrowserClient();
    client.auth
      .getUser()
      .then(({ data: authData }) => loadForUser(authData.user ?? null))
      .catch(() => {
        if (!active) {
          return;
        }

        setData(loadRoutineData());
        setCloud({
          configured: true,
          email: null,
          error: "Nao consegui ler a sessao Supabase.",
          status: "error",
          userId: null
        });
        setHydrated(true);
      });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      void loadForUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const scheduleCloudSave = useCallback((nextData: RoutineData, userId: string) => {
    if (!isSupabaseConfigured()) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setCloud((current) =>
      current.userId === userId
        ? {
            ...current,
            error: undefined,
            status: "saving"
          }
        : current
    );

    saveTimerRef.current = setTimeout(() => {
      void upsertCloudRoutineData(nextData, userId)
        .then((synced) => {
          setCloud((current) =>
            current.userId === userId
              ? {
                  ...current,
                  error: undefined,
                  lastSyncedAt: synced.updatedAt,
                  status: "synced"
                }
              : current
          );
        })
        .catch((error) => {
          setCloud((current) =>
            current.userId === userId
              ? {
                  ...current,
                  error: error instanceof Error ? error.message : "Nao consegui salvar na nuvem.",
                  status: "error"
                }
              : current
          );
        });
    }, 700);
  }, []);

  const updateData = useCallback((updater: (current: RoutineData) => RoutineData) => {
    setData((current) => {
      const cloudUserId = cloudRef.current.userId;
      const ownerId = cloudUserId ?? current.userId ?? LOCAL_USER_ID;
      const next = assignRoutineDataUser(normalizeRoutineData(updater(current), ownerId), ownerId);
      saveRoutineData(next, cloudUserId);
      if (cloudUserId) {
        scheduleCloudSave(next, cloudUserId);
      }
      return next;
    });
  }, [scheduleCloudSave]);

  const value = useMemo<RoutineDataContextValue>(
    () => ({
      cloud,
      data,
      hydrated,
      replaceData: (newData) => {
        updateData((current) => normalizeRoutineData(newData, current.userId));
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
              userId: current.userId,
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
              userId: current.userId,
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
              userId: current.userId,
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
    [cloud, data, hydrated, updateData]
  );

  return <RoutineDataContext.Provider value={value}>{children}</RoutineDataContext.Provider>;
}
