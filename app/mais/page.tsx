import Link from "next/link";
import { Bell, Bot, CalendarDays, CheckCircle2, CheckSquare, Database, Settings, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const implemented = [
  "Tela Hoje mobile-first",
  "Modulo Faculdade",
  "Faltas com registros individuais",
  "Notas e simulador",
  "Atividades por prazo",
  "Compromissos editaveis no calendario",
  "Assistente de IA local para rotina",
  "Preset UFAM",
  "PWA base",
  "Tarefas com persistencia local",
  "Lembretes dentro do app",
  "Calendario mensal",
  "Backup e preferencias locais",
  "Login Supabase preparado"
];

const next = [
  { icon: Bell, title: "Push completo e central", phase: "Fase 3" },
  { icon: Bot, title: "IA por API e comandos com confirmacao", phase: "Fase 4" },
  { icon: Smartphone, title: "Widget Android", phase: "Fase 6" }
];

const links = [
  { href: "/faculdade", title: "Abrir Faculdade", icon: Database },
  { href: "/tarefas", title: "Abrir Tarefas", icon: CheckSquare },
  { href: "/lembretes", title: "Abrir Lembretes", icon: Bell },
  { href: "/calendario", title: "Abrir Calendario", icon: CalendarDays },
  { href: "/assistente", title: "Abrir Assistente", icon: Bot },
  { href: "/configuracoes", title: "Configuracoes e backup", icon: Settings }
];

export default function MorePage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Mais</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Estado do Gab routine</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Esta tela evita botoes falsos: o que existe aparece como pronto, e o restante fica marcado por fase.
        </p>
      </header>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Implementado</h2>
        <div className="mt-3 space-y-2">
          {implemented.map((item) => (
            <div className="flex items-center gap-2 text-sm text-slate-700" key={item}>
              <CheckCircle2 aria-hidden className="h-4 w-4 text-mint" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {next.map((item) => {
          const Icon = item.icon;

          return (
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={item.title}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Icon aria-hidden className="h-5 w-5 text-slate-500" />
                <Badge>{item.phase}</Badge>
              </div>
              <h2 className="text-sm font-semibold text-ink">{item.title}</h2>
            </div>
          );
        })}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 text-sm font-medium text-ink shadow-sm"
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden className="h-4 w-4 text-mint" />
              {item.title}
            </Link>
          );
        })}
      </section>

      <Link className="block rounded-lg border border-line bg-white p-4 text-sm font-medium text-ink shadow-sm" href="/login">
        Conta e Supabase
      </Link>
    </div>
  );
}
