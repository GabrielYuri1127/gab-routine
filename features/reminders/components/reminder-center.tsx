"use client";

import { Bell, BellRing, Moon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ReminderForm } from "@/features/reminders/components/reminder-form";
import { ReminderList } from "@/features/reminders/components/reminder-list";
import { getReminderDateKey, getReminderState } from "@/lib/reminders/schedule";
import { getTodayInAppTimeZone } from "@/lib/date";
import { useRoutineData } from "@/features/data/routine-store";

export function ReminderCenter() {
  const { data } = useRoutineData();
  const today = getTodayInAppTimeZone();
  const scheduled = data.reminders.filter((reminder) => reminder.status === "scheduled");
  const due = scheduled.filter((reminder) => getReminderState(reminder) === "due");
  const todayReminders = scheduled.filter((reminder) => getReminderDateKey(reminder) === today);
  const prefs = data.notificationPreference;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Lembretes</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Central de lembretes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Nesta fase eles aparecem no app e ficam salvos localmente. Push no Android entra na fase de notificacoes.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo dos lembretes">
        <Metric icon={BellRing} label="Agora" value={due.length.toString()} tone="coral" />
        <Metric icon={Bell} label="Hoje" value={todayReminders.length.toString()} tone="gold" />
        <Metric icon={Moon} label="Silencio" value={`${prefs.quietHoursStart}-${prefs.quietHoursEnd}`} tone="sky" />
      </section>

      <ReminderForm />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Agendados</h2>
          <Badge tone="sky">{scheduled.length} ativos</Badge>
        </div>
        <ReminderList reminders={scheduled} />
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Bell;
  label: string;
  value: string;
  tone: "coral" | "gold" | "sky";
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <Icon aria-hidden className="h-5 w-5 text-slate-500" />
        <Badge tone={tone}>{label}</Badge>
      </div>
      <p className="text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
