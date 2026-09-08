import Link from "next/link";

import { EventForm } from "@/features/calendar/components/event-form";

export default function QuickEventPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Atalho rapido</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Novo compromisso</h1>
      </header>
      <EventForm afterCreateHref="/" compact />
      <Link className="flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-medium text-ink" href="/">
        Voltar para Hoje
      </Link>
    </div>
  );
}
