"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Bot, CalendarDays, CheckSquare, Home, MoreHorizontal, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { MobileAddMenu } from "@/components/mobile-add-menu";
import { RoutineDataProvider } from "@/features/data/routine-data-provider";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Hoje", href: "/", icon: Home },
  { label: "Faculdade", href: "/faculdade", icon: BookOpen },
  { label: "Semana", href: "/semana", icon: CalendarDays },
  { label: "Mais", href: "/mais", icon: MoreHorizontal }
];

const secondaryNav = [
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
  { label: "Tarefas", href: "/tarefas", icon: CheckSquare },
  { label: "Lembretes", href: "/lembretes", icon: Bell },
  { label: "Assistente", href: "/assistente", icon: Bot },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings }
];

const futureModules = ["Estudos", "Projetos", "Habitos"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <RoutineDataProvider>
      <div className="min-h-screen bg-paper">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
          <Link className="mb-8 flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-lg font-semibold text-white">G</span>
            <span>
              <span className="block font-semibold text-ink">Gab routine</span>
              <span className="block text-xs text-slate-500">rotina pessoal</span>
            </span>
          </Link>

          <nav className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-ink",
                    active && "bg-slate-100 text-ink"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="mt-6 space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href);

              return (
                <Link
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-ink",
                    active && "bg-slate-100 text-ink"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-line pt-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Proximas fases</p>
            <div className="mt-2 space-y-1">
              {futureModules.map((module) => (
                <div className="flex h-9 items-center justify-between rounded-lg px-3 text-sm text-slate-400" key={module}>
                  <span>{module}</span>
                  <span className="text-[11px]">em breve</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-2 pb-2 pt-2 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5 items-end">
            <MobileNavItem href="/" icon={Home} label="Hoje" pathname={pathname} />
            <MobileNavItem href="/faculdade" icon={BookOpen} label="Faculdade" pathname={pathname} />
            <MobileAddMenu />
            <MobileNavItem href="/semana" icon={CalendarDays} label="Semana" pathname={pathname} />
            <MobileNavItem href="/mais" icon={MoreHorizontal} label="Mais" pathname={pathname} />
          </div>
        </nav>
      </div>
    </RoutineDataProvider>
  );
}

function MobileNavItem({
  href,
  icon: Icon,
  label,
  pathname
}: {
  href: string;
  icon: typeof Home;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-slate-500",
        active && "text-ink"
      )}
      href={href}
    >
      <Icon aria-hidden className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span>{label}</span>
    </Link>
  );
}
