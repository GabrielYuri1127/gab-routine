"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  GraduationCap,
  Home,
  Settings,
  SlidersHorizontal,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { MobileAddMenu } from "@/components/mobile-add-menu";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoutineDataProvider } from "@/features/data/routine-data-provider";
import { useRoutineData } from "@/features/data/routine-store";
import { cn } from "@/lib/utils";
import type { EnabledModules } from "@/types/domain";

const primaryNav = [
  { label: "Hoje", href: "/", icon: Home },
  { label: "Faculdade", href: "/faculdade", icon: GraduationCap },
  { label: "Trabalho", href: "/trabalho", icon: BriefcaseBusiness },
  { label: "Agenda", href: "/semana", icon: CalendarRange },
  { label: "Assistente", href: "/assistente", icon: Bot }
];

const utilityNav: Array<{ label: string; href: string; icon: LucideIcon; module: keyof EnabledModules | null }> = [
  { label: "Tarefas", href: "/tarefas", icon: CheckSquare, module: "tasks" },
  { label: "Calendário", href: "/calendario", icon: CalendarDays, module: "calendar" },
  { label: "Lembretes", href: "/lembretes", icon: Bell, module: "reminders" },
  { label: "Ferramentas", href: "/mais", icon: SlidersHorizontal, module: null },
  { label: "Configurações", href: "/configuracoes", icon: Settings, module: null }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RoutineDataProvider>
      <AppShellContent>{children}</AppShellContent>
    </RoutineDataProvider>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { cloud, data } = useRoutineData();
  const preferences = data.appPreference;
  const appName = preferences.appName.trim() || "Gavium";
  const courseLabel = preferences.courseOrArea.trim() || "Faculdade e trabalho";
  const utilityItems = utilityNav.filter((item) => !item.module || preferences.enabledModules[item.module]);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-white lg:flex lg:flex-col">
        <Link className="flex h-20 items-center gap-3 border-b border-line px-5" href="/">
          <img alt="" aria-hidden className="h-10 w-10 rounded-md shadow-sm" src="/brand/gavium-mark.svg" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">{appName}</span>
            <span className="block truncate text-xs text-slate-500">{courseLabel}</span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 text-[11px] font-semibold uppercase text-slate-400">Principal</p>
          <nav className="mt-2 space-y-1">
            {primaryNav.map((item) => (
              <DesktopNavItem accentColor={preferences.accentColor} item={item} key={item.href} pathname={pathname} />
            ))}
          </nav>

          <p className="mt-7 px-3 text-[11px] font-semibold uppercase text-slate-400">Organização</p>
          <nav className="mt-2 space-y-1">
            {utilityItems.map((item) => (
              <DesktopNavItem accentColor={preferences.accentColor} item={item} key={item.href} pathname={pathname} />
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-line p-4">
          <ThemeToggle />
          <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
            <span className="relative shrink-0">
              <ProfileAvatar displayName={preferences.displayName} photo={preferences.profilePhoto} size="sm" />
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-50",
                  cloud.status === "error" ? "bg-coral" : cloud.configured ? "bg-mint" : "bg-slate-300"
                )}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-foreground">
                {cloud.configured ? "Dados sincronizados" : "Dados neste dispositivo"}
              </span>
              <span className="block truncate text-[11px] text-slate-500">{cloud.email ?? "Backup local ativo"}</span>
            </span>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 w-full min-w-0 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden" href="/">
          <img alt="" aria-hidden className="h-9 w-9 rounded-md shadow-sm" src="/brand/gavium-mark.svg" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{appName}</span>
            <span className="block truncate text-xs text-slate-500">{courseLabel}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle compact />
          <Link
            aria-label="Abrir assistente"
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            href="/assistente"
          >
            <Bot aria-hidden className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Abrir perfil e configurações"
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            href="/configuracoes"
          >
            <ProfileAvatar displayName={preferences.displayName} photo={preferences.profilePhoto} size="sm" />
          </Link>
        </div>
      </header>

      <main className="min-h-screen w-full min-w-0 max-w-full px-4 pb-28 pt-5 sm:px-6 lg:ml-60 lg:w-[calc(100%-15rem)] lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-2 pb-2 pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-end">
          <MobileNavItem accentColor={preferences.accentColor} href="/" icon={Home} label="Hoje" pathname={pathname} />
          <MobileNavItem
            accentColor={preferences.accentColor}
            href="/faculdade"
            icon={GraduationCap}
            label="Faculdade"
            pathname={pathname}
          />
          <MobileAddMenu />
          <MobileNavItem
            accentColor={preferences.accentColor}
            href="/trabalho"
            icon={BriefcaseBusiness}
            label="Trabalho"
            pathname={pathname}
          />
          <MobileNavItem
            accentColor={preferences.accentColor}
            href="/semana"
            icon={CalendarRange}
            label="Agenda"
            pathname={pathname}
          />
        </div>
      </nav>
    </div>
  );
}

function DesktopNavItem({
  accentColor,
  item,
  pathname
}: {
  accentColor: string;
  item: { href: string; icon: LucideIcon; label: string };
  pathname: string;
}) {
  const Icon = item.icon;
  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Link
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-foreground",
        active && "bg-slate-100 text-foreground"
      )}
      href={item.href}
      style={active ? { color: accentColor } : undefined}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full" style={{ backgroundColor: accentColor }} /> : null}
      <Icon aria-hidden className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MobileNavItem({
  accentColor,
  href,
  icon: Icon,
  label,
  pathname
}: {
  accentColor: string;
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      className={cn("flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium text-slate-500", active && "text-foreground")}
      href={href}
      style={active ? { color: accentColor } : undefined}
    >
      <Icon aria-hidden className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span>{label}</span>
    </Link>
  );
}
