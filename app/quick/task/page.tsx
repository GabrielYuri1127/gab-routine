import Link from "next/link";

import { TaskForm } from "@/features/tasks/components/task-form";

export default function QuickTaskPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Atalho rapido</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Nova tarefa</h1>
      </header>
      <TaskForm afterCreateHref="/" compact />
      <Link className="flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-medium text-ink" href="/">
        Voltar para Hoje
      </Link>
    </div>
  );
}
