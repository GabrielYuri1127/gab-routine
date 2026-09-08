"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenCheck, CalendarPlus, CheckSquare, GraduationCap, NotebookTabs, Plus, Timer } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface QuickOption {
  label: string;
  href?: string;
  helper: string;
  disabled?: boolean;
  icon: typeof CheckSquare;
}

export function MobileAddMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inSubject = pathname.startsWith("/faculdade/") && pathname !== "/faculdade";

  const options = useMemo<QuickOption[]>(() => {
    const subjectHref = inSubject ? pathname : "/faculdade";
    const academicOptions: QuickOption[] = [
      { label: "Falta", href: inSubject ? `${subjectHref}#faltas` : "/quick/absence", helper: "+1, +2 ou +3", icon: BookOpenCheck },
      { label: "Nota", href: inSubject ? `${subjectHref}#notas` : "/quick/grade", helper: "Adicionar nota", icon: GraduationCap },
      { label: "Atividade", href: `${subjectHref}#atividades`, helper: "Prazo academico", icon: NotebookTabs },
      { label: "Prova", href: `${subjectHref}#atividades`, helper: "Como atividade", icon: CalendarPlus }
    ];

    const dailyOptions: QuickOption[] = [
      { label: "Tarefa", href: "/quick/task", helper: "Criar agora", icon: CheckSquare },
      { label: "Lembrete", href: "/quick/reminder", helper: "Criar agora", icon: Bell },
      { label: "Compromisso", helper: "Fase 3", disabled: true, icon: CalendarPlus },
      { label: "Sessao de estudo", helper: "Fase 5", disabled: true, icon: Timer }
    ];

    return inSubject ? [...academicOptions, ...dailyOptions] : [dailyOptions[0], ...academicOptions, ...dailyOptions.slice(1)];
  }, [inSubject, pathname]);

  return (
    <div className="relative flex justify-center">
      {open ? (
        <div className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-line bg-white p-2 shadow-soft">
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
              const Icon = option.icon;
              const content = (
                <>
                  <Icon aria-hidden className="h-4 w-4" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    <span className="block truncate text-xs text-slate-500">{option.helper}</span>
                  </span>
                </>
              );

              if (option.disabled || !option.href) {
                return (
                  <button
                    aria-disabled
                    className="flex min-h-14 items-center gap-2 rounded-lg border border-dashed border-line px-3 text-slate-400"
                    key={option.label}
                    type="button"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  className="flex min-h-14 items-center gap-2 rounded-lg border border-line px-3 text-ink transition hover:bg-slate-50"
                  href={option.href}
                  key={option.label}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        aria-expanded={open}
        aria-label="Adicionar rapidamente"
        className={cn(
          "absolute -top-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-paper bg-ink text-white shadow-soft transition",
          open && "rotate-45 bg-coral"
        )}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Plus aria-hidden className="h-7 w-7" />
      </button>
    </div>
  );
}
