"use client";

import { Calculator, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  calculateGradeAverage,
  calculateRequiredFinalExamGrade,
  getAcademicSituation,
  simulateGrade
} from "@/lib/academic-rules/grades";
import type { Grade, Subject } from "@/types/academic";

export function GradePanel({ subject }: { subject: Subject }) {
  const [grades, setGrades] = useState<Grade[]>(subject.grades);
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("10");
  const [weight, setWeight] = useState("");
  const [type, setType] = useState<Grade["type"]>("activity");
  const [simulationScore, setSimulationScore] = useState("");

  const average = useMemo(() => calculateGradeAverage(grades, subject.rules.gradingMethod), [grades, subject.rules.gradingMethod]);
  const situation = getAcademicSituation(average, subject.rules.directApprovalGrade, subject.rules.minimumFinalGrade);
  const neededPf = average === null ? null : calculateRequiredFinalExamGrade(average, subject.rules.minimumFinalGrade);
  const simulatedAverage = simulationScore
    ? simulateGrade(
        grades,
        {
          id: "simulated",
          subjectId: subject.id,
          name: "Simulacao",
          score: Number(simulationScore),
          maxScore: 10,
          weight: 1,
          type: "exam"
        },
        subject.rules.gradingMethod
      )
    : null;

  return (
    <section className="space-y-4" id="notas">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Notas</h2>
          <p className="mt-1 text-sm text-slate-500">Media calculada por regra interna, sem IA.</p>
        </div>
        <Badge tone="sky">{subject.rules.gradingMethod}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Media atual" value={average === null ? "--" : average.toFixed(1).replace(".", ",")} />
        <Metric label="Situacao" value={situation} compact />
        <Metric label="PF necessaria" value={neededPf === null ? "--" : neededPf.toFixed(1).replace(".", ",")} />
      </div>

      <form
        className="rounded-lg border border-line bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || !score) {
            return;
          }

          const grade: Grade = {
            id: `${subject.id}-grade-${Date.now()}`,
            subjectId: subject.id,
            name: name.trim(),
            score: Number(score),
            maxScore: Number(maxScore || 10),
            weight: weight ? Number(weight) : undefined,
            type
          };

          setGrades((current) => [grade, ...current]);
          setName("");
          setScore("");
          setMaxScore("10");
          setWeight("");
          setType("activity");
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_110px_110px_auto]">
          <label>
            <span className="text-sm font-medium text-slate-700">Nome</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setName(event.target.value)}
              placeholder="AV1, lista, projeto"
              value={name}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Nota</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              min={0}
              onChange={(event) => setScore(event.target.value)}
              step="0.1"
              type="number"
              value={score}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Maxima</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              min={0.1}
              onChange={(event) => setMaxScore(event.target.value)}
              step="0.1"
              type="number"
              value={maxScore}
            />
          </label>
          <Button className="mt-6" type="submit">
            <Plus aria-hidden className="h-4 w-4" />
            Salvar
          </Button>
        </div>

        <details className="mt-4 rounded-lg border border-dashed border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">Mais opcoes</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">Peso</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
                min={0}
                onChange={(event) => setWeight(event.target.value)}
                step="0.1"
                type="number"
                value={weight}
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
                onChange={(event) => setType(event.target.value as Grade["type"])}
                value={type}
              >
                <option value="activity">Atividade</option>
                <option value="exam">Prova</option>
                <option value="work">Trabalho</option>
                <option value="mee">MEE</option>
                <option value="pf">PF</option>
                <option value="other">Outro</option>
              </select>
            </label>
          </div>
        </details>
      </form>

      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Calculator aria-hidden className="h-4 w-4 text-mint" />
          <h3 className="text-sm font-semibold text-ink">Simular nota</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <input
            className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
            min={0}
            onChange={(event) => setSimulationScore(event.target.value)}
            placeholder="Ex.: 8"
            step="0.1"
            type="number"
            value={simulationScore}
          />
          <p className="text-sm leading-6 text-slate-600">
            {simulatedAverage === null
              ? "Digite uma nota para ver a MEE prevista e a necessidade de PF."
              : `Media prevista: ${simulatedAverage.toFixed(1).replace(".", ",")}. PF necessaria: ${calculateRequiredFinalExamGrade(
                  simulatedAverage,
                  subject.rules.minimumFinalGrade
                )
                  .toFixed(1)
                  .replace(".", ",")}.`}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Historico de notas</h3>
        </div>
        <div className="divide-y divide-line">
          {grades.map((grade) => (
            <div className="flex items-center justify-between gap-3 px-4 py-3" key={grade.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{grade.name}</p>
                <p className="text-xs text-slate-500">{grade.type ?? "nota"} {grade.weight ? `• peso ${grade.weight}` : ""}</p>
              </div>
              <p className="text-sm font-semibold text-ink">
                {grade.score.toString().replace(".", ",")} / {grade.maxScore.toString().replace(".", ",")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase text-slate-400">{label}</p>
      <p className={`mt-1 font-semibold text-ink ${compact ? "text-base" : "text-xl"}`}>{value}</p>
    </div>
  );
}
