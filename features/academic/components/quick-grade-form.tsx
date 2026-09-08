"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { calculateGradeAverage } from "@/lib/academic-rules/grades";
import type { Grade } from "@/types/academic";

export function QuickGradeForm() {
  const { data, addGrade } = useRoutineData();
  const subjects = data.subjects;
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("10");
  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? subjects[0];
  const average = useMemo(
    () => selectedSubject ? calculateGradeAverage(selectedSubject.grades, selectedSubject.rules.gradingMethod) : null,
    [selectedSubject]
  );

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(subjects[0].id);
    }
  }, [subjectId, subjects]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Acao rapida</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Adicionar nota</h1>
        <p className="mt-2 text-sm text-slate-600">Nome, nota, nota maxima e salvar. O resto fica dentro da disciplina.</p>
      </header>

      <form
        className="rounded-lg border border-line bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedSubject || !name.trim() || !score) {
            return;
          }

          const grade: Grade = {
            id: `${selectedSubject.id}-quick-grade-${Date.now()}`,
            subjectId: selectedSubject.id,
            name: name.trim(),
            score: Number(score),
            maxScore: Number(maxScore || 10),
            type: "activity"
          };

          addGrade(selectedSubject.id, grade);
          setName("");
          setScore("");
          setMaxScore("10");
        }}
      >
        <div className="space-y-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Disciplina</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setSubjectId(event.target.value)}
              value={subjectId}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Nome</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: AV2"
              value={name}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-sm font-medium text-slate-700">Nota</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
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
                onChange={(event) => setMaxScore(event.target.value)}
                step="0.1"
                type="number"
                value={maxScore}
              />
            </label>
          </div>
        </div>

        <Button className="mt-4 w-full" type="submit">
          <Plus aria-hidden className="h-4 w-4" />
          Salvar nota
        </Button>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase text-slate-400">Media atual</p>
          <p className="mt-1 text-xl font-semibold text-ink">{average === null ? "--" : average.toFixed(1).replace(".", ",")}</p>
        </div>

        {selectedSubject ? (
          <Link className="mt-4 flex items-center justify-between rounded-lg border border-line px-3 py-3 text-sm font-medium text-ink" href={`/faculdade/${selectedSubject.id}#notas`}>
            Abrir notas da disciplina
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </form>
    </div>
  );
}
