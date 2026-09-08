import Link from "next/link";

import { DataTools } from "@/features/settings/components/data-tools";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Configuracoes</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Controle do Gab routine</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Ajuste horarios importantes e guarde um backup antes de publicar ou trocar de aparelho.
        </p>
      </header>

      <DataTools />

      <Link className="flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-medium text-ink" href="/mais">
        Voltar para Mais
      </Link>
    </div>
  );
}
