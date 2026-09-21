"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setMode } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Ativar modo claro" : "Ativar modo escuro";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      aria-label={label}
      className={
        compact
          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-slate-600 transition hover:bg-slate-50 hover:text-foreground"
          : "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-foreground"
      }
      onClick={() => setMode(dark ? "light" : "dark")}
      title={label}
      type="button"
    >
      <Icon aria-hidden className="h-4 w-4" />
      {compact ? null : <span>{dark ? "Modo claro" : "Modo escuro"}</span>}
    </button>
  );
}
