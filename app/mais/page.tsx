import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  Bot,
  CalendarDays,
  CheckSquare,
  Cloud,
  GraduationCap,
  Settings
} from "lucide-react";

import { SupportWhatsAppCard } from "@/components/support-whatsapp-card";

const organizationLinks = [
  { description: "Quadro completo e prioridades", href: "/tarefas", icon: CheckSquare, title: "Tarefas" },
  { description: "Compromissos e visão mensal", href: "/calendario", icon: CalendarDays, title: "Calendário" },
  { description: "Alertas programados", href: "/lembretes", icon: Bell, title: "Lembretes" },
  { description: "Planejamento com contexto", href: "/assistente", icon: Bot, title: "Assistente" }
];

const systemLinks = [
  { description: "Classroom, nuvem, push e IA", href: "/configuracoes#integracoes", icon: Cloud, title: "Integrações" },
  { description: "Perfil acadêmico e preferências", href: "/configuracoes", icon: Settings, title: "Configurações" },
  { description: "Conheça os fluxos principais", href: "/tutorial", icon: BookOpenCheck, title: "Guia rápido" },
  { description: "Disciplinas, faltas e matriz", href: "/faculdade", icon: GraduationCap, title: "Faculdade" }
];

export default function MorePage() {
  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-mint">Ferramentas</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Organização e conexões</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Recursos de apoio ficam aqui para a navegação principal continuar focada em faculdade e trabalho.
        </p>
      </header>

      <ToolSection items={organizationLinks} title="Organizar" />
      <ToolSection items={systemLinks} title="Sistema" />
      <SupportWhatsAppCard compact />
    </div>
  );
}

function ToolSection({ items, title }: { items: typeof organizationLinks; title: string }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase text-slate-400">{title}</h2>
      <div className="overflow-hidden rounded-md border border-line bg-white sm:grid sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="group grid min-h-20 grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-slate-50 sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(2n)]:border-r-0"
              href={item.href}
              key={item.title}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:text-foreground">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</span>
              </span>
              <ArrowRight aria-hidden className="h-4 w-4 text-slate-400" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
