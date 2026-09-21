"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { useTheme, type ThemeMode } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const themeOptions: Array<{ description: string; icon: LucideIcon; label: string; value: ThemeMode }> = [
  { description: "Interface clara e leve durante o dia.", icon: Sun, label: "Claro", value: "light" },
  { description: "Contraste confortável para ambientes escuros.", icon: Moon, label: "Escuro", value: "dark" },
  { description: "Acompanha automaticamente este dispositivo.", icon: Monitor, label: "Sistema", value: "system" }
];

export function ThemeSettingsPanel() {
  const { mode, setMode } = useTheme();

  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-400">Aparência</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Tema do Gavium</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">A escolha fica salva neste navegador.</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-label="Tema da interface">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const active = mode === option.value;

          return (
            <button
              aria-pressed={active}
              className={cn(
                "flex min-h-24 items-start gap-3 rounded-md border p-3 text-left transition",
                active
                  ? "border-strong bg-slate-100 text-foreground"
                  : "border-line bg-surface text-slate-600 hover:bg-slate-50 hover:text-foreground"
              )}
              key={option.value}
              onClick={() => setMode(option.value)}
              type="button"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", active ? "bg-contrast text-white" : "bg-slate-100")}>
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
