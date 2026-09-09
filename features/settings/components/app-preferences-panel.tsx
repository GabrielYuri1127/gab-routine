"use client";

import { Bot, CheckSquare, GraduationCap, Palette, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEFAULT_APP_PREFERENCE } from "@/features/data/seed";
import { useRoutineData } from "@/features/data/routine-store";
import type { AssistantAnswerStyle, EnabledModules } from "@/types/domain";

const inputClass = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-ink";
const colors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];

const answerStyleLabels: Record<AssistantAnswerStyle, string> = {
  balanced: "Equilibrada",
  coach: "Mais orientadora",
  direct: "Direta"
};

const moduleLabels: Array<{ id: keyof EnabledModules; label: string }> = [
  { id: "tasks", label: "Tarefas" },
  { id: "reminders", label: "Lembretes" },
  { id: "calendar", label: "Calendario" },
  { id: "assistant", label: "Assistente" },
  { id: "classroom", label: "Classroom" },
  { id: "tutorial", label: "Tutorial" }
];

export function AppPreferencesPanel() {
  const { data, updateAppPreference } = useRoutineData();
  const preferences = data.appPreference;

  function restoreDefaults() {
    updateAppPreference(DEFAULT_APP_PREFERENCE);
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UserRound aria-hidden className="h-5 w-5 text-mint" />
        <h2 className="text-lg font-semibold text-ink">Perfil do app</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-sm font-medium text-slate-700">Nome de quem usa</span>
          <input
            className={inputClass}
            onChange={(event) => updateAppPreference({ displayName: event.target.value })}
            placeholder="Seu nome"
            value={preferences.displayName}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Nome do app</span>
          <input
            className={inputClass}
            onChange={(event) => updateAppPreference({ appName: event.target.value })}
            placeholder="Gab routine"
            value={preferences.appName}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Descricao curta</span>
          <input
            className={inputClass}
            onChange={(event) => updateAppPreference({ profileLabel: event.target.value })}
            placeholder="rotina pessoal"
            value={preferences.profileLabel}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Jeito da IA responder</span>
          <select
            className={inputClass}
            onChange={(event) => updateAppPreference({ assistantAnswerStyle: event.target.value as AssistantAnswerStyle })}
            value={preferences.assistantAnswerStyle}
          >
            {Object.entries(answerStyleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="text-sm font-medium text-slate-700">Semestre padrao</span>
          <input
            className={inputClass}
            onChange={(event) => updateAppPreference({ defaultSemester: event.target.value })}
            value={preferences.defaultSemester}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Carga horaria padrao</span>
          <input
            className={inputClass}
            min={1}
            onChange={(event) => updateAppPreference({ defaultWorkloadHours: Number(event.target.value) || 60 })}
            type="number"
            value={preferences.defaultWorkloadHours}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Aulas por encontro</span>
          <input
            className={inputClass}
            min={1}
            onChange={(event) => updateAppPreference({ defaultClassesQuantity: Number(event.target.value) || 1 })}
            type="number"
            value={preferences.defaultClassesQuantity}
          />
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <Palette aria-hidden className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-medium text-slate-700">Cor principal</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              aria-label={`Usar cor ${color}`}
              className="h-9 w-9 rounded-full border-2"
              key={color}
              onClick={() => updateAppPreference({ accentColor: color })}
              style={{
                backgroundColor: color,
                borderColor: preferences.accentColor === color ? "#15161a" : "transparent"
              }}
              type="button"
            />
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-line p-3">
        <div className="mb-3 flex items-center gap-2">
          <CheckSquare aria-hidden className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-medium text-slate-700">Modulos no menu</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {moduleLabels.map((module) => (
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-slate-700" key={module.id}>
              <input
                checked={preferences.enabledModules[module.id]}
                className="h-4 w-4 rounded border-line"
                onChange={(event) =>
                  updateAppPreference({
                    enabledModules: {
                      [module.id]: event.target.checked
                    }
                  })
                }
                type="checkbox"
              />
              {module.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Bot aria-hidden className="h-4 w-4" />
          As escolhas ficam no backup local e acompanham a importacao/exportacao.
        </p>
        <Button onClick={restoreDefaults} variant="secondary">
          Restaurar perfil padrao
        </Button>
      </div>
    </section>
  );
}
