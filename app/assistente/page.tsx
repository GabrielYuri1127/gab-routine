import { AssistantPanel } from "@/features/assistant/components/assistant-panel";

export default function AssistantPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Inteligencia artificial</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Assistente do Gab routine</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Pergunte sobre prioridades, faltas, notas e prazos usando os dados cadastrados no app.
        </p>
      </header>

      <AssistantPanel />
    </div>
  );
}
