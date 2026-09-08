import Link from "next/link";

export default function QuickReminderPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-slate-500">Fase 2</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Criar lembrete</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A tela esta reservada para lembretes reais. Notificacoes completas e push entram nas Fases 2 e 3.
        </p>
      </header>
      <Link className="flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-medium text-ink" href="/">
        Voltar para Hoje
      </Link>
    </div>
  );
}
