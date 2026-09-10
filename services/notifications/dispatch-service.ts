import type { SupabaseClient } from "@supabase/supabase-js";

import { assignRoutineDataUser, normalizeRoutineData } from "@/features/data/routine-store";
import { APP_TIME_ZONE } from "@/lib/date";
import {
  isExpiredPushSubscriptionError,
  sendPushNotification,
  type StoredPushSubscription
} from "@/services/notifications/push-service";
import type { Reminder } from "@/types/domain";

const MAX_OVERDUE_MS = 3 * 24 * 60 * 60 * 1000;

interface RoutineSnapshotRow {
  data: unknown;
  updated_at: string;
  user_id: string;
}

export interface NotificationDispatchResult {
  expiredSubscriptions: number;
  failed: number;
  remindersMarkedSent: number;
  sent: number;
  usersChecked: number;
  usersWithDueReminders: number;
}

export async function dispatchDueReminderNotifications(client: SupabaseClient): Promise<NotificationDispatchResult> {
  const now = new Date();
  const result: NotificationDispatchResult = {
    expiredSubscriptions: 0,
    failed: 0,
    remindersMarkedSent: 0,
    sent: 0,
    usersChecked: 0,
    usersWithDueReminders: 0
  };

  const { data: snapshots, error: snapshotsError } = await client
    .from("routine_snapshots")
    .select("user_id,data,updated_at");

  if (snapshotsError) {
    throw snapshotsError;
  }

  const { data: subscriptions, error: subscriptionsError } = await client
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth");

  if (subscriptionsError) {
    throw subscriptionsError;
  }

  const subscriptionsByUser = groupSubscriptionsByUser((subscriptions ?? []) as StoredPushSubscription[]);

  for (const row of (snapshots ?? []) as RoutineSnapshotRow[]) {
    result.usersChecked += 1;
    const userSubscriptions = subscriptionsByUser.get(row.user_id) ?? [];
    if (userSubscriptions.length === 0) {
      continue;
    }

    const routineData = assignRoutineDataUser(normalizeRoutineData(row.data, row.user_id), row.user_id);
    const dueReminders = routineData.reminders.filter((reminder) => isDueReminder(reminder, now));
    if (dueReminders.length === 0) {
      continue;
    }

    result.usersWithDueReminders += 1;
    const payload = buildReminderPayload(dueReminders);
    let sentForUser = 0;

    for (const subscription of userSubscriptions) {
      try {
        await sendPushNotification(subscription, payload);
        sentForUser += 1;
        result.sent += 1;
      } catch (error) {
        if (isExpiredPushSubscriptionError(error)) {
          result.expiredSubscriptions += 1;
          if (subscription.id) {
            await client.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        } else {
          result.failed += 1;
        }
      }
    }

    if (sentForUser > 0) {
      const dueIds = new Set(dueReminders.map((reminder) => reminder.id));
      const nextData = {
        ...routineData,
        reminders: routineData.reminders.map((reminder) =>
          dueIds.has(reminder.id) ? { ...reminder, status: "sent" as const } : reminder
        )
      };

      const { error: updateError } = await client
        .from("routine_snapshots")
        .update({
          data: nextData,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", row.user_id);

      if (updateError) {
        throw updateError;
      }

      result.remindersMarkedSent += dueIds.size;
    }
  }

  return result;
}

function groupSubscriptionsByUser(subscriptions: StoredPushSubscription[]) {
  const grouped = new Map<string, StoredPushSubscription[]>();

  for (const subscription of subscriptions) {
    const list = grouped.get(subscription.user_id) ?? [];
    list.push(subscription);
    grouped.set(subscription.user_id, list);
  }

  return grouped;
}

function isDueReminder(reminder: Reminder, now: Date) {
  if (reminder.status !== "scheduled") {
    return false;
  }

  const reminderDate = parseReminderDate(reminder.remindAt);
  const diff = now.getTime() - reminderDate.getTime();
  return diff >= 0 && diff <= MAX_OVERDUE_MS;
}

function parseReminderDate(value: string) {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value);
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  return zonedTimeToUtcDate({
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    month: Number(month),
    second: Number(second),
    timeZone: APP_TIME_ZONE,
    year: Number(year)
  });
}

function zonedTimeToUtcDate({
  day,
  hour,
  minute,
  month,
  second,
  timeZone,
  year
}: {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  timeZone: string;
  year: number;
}) {
  const assumedUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric"
  });
  const parts = Object.fromEntries(formatter.formatToParts(assumedUtc).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = asUtc - assumedUtc.getTime();

  return new Date(assumedUtc.getTime() - offset);
}

function buildReminderPayload(reminders: Reminder[]) {
  if (reminders.length === 1) {
    const reminder = reminders[0];
    return {
      body: "Toque para abrir seus lembretes.",
      tag: `reminder-${reminder.id}`,
      title: reminder.title,
      url: "/lembretes"
    };
  }

  return {
    body: reminders
      .slice(0, 3)
      .map((reminder) => reminder.title)
      .join(" | "),
    tag: "gavium-reminders",
    title: `${reminders.length} lembretes pendentes`,
    url: "/lembretes"
  };
}
