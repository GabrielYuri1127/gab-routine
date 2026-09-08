import Link from "next/link";

import { ReminderForm } from "@/features/reminders/components/reminder-form";

export default function QuickReminderPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Atalho rapido</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Criar lembrete</h1>
      </header>
      <ReminderForm afterCreateHref="/" compact />
      <Link className="flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-medium text-ink" href="/">
        Voltar para Hoje
      </Link>
    </div>
  );
}
