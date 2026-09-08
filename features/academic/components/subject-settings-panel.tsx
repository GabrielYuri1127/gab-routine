"use client";

import { Palette, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import type { GradingMethod, Subject } from "@/types/academic";

export function SubjectSettingsPanel({ subject }: { subject: Subject }) {
  const { updateSubject } = useRoutineData();
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code ?? "");
  const [professor, setProfessor] = useState(subject.professor ?? "");
  const [room, setRoom] = useState(subject.room ?? "");
  const [semester, setSemester] = useState(subject.semester);
  const [color, setColor] = useState(subject.color);
  const [workloadHours, setWorkloadHours] = useState(String(subject.workloadHours));
  const [minimumAttendance, setMinimumAttendance] = useState(String(subject.rules.minimumAttendance));
  const [totalExpectedClasses, setTotalExpectedClasses] = useState(String(subject.rules.totalExpectedClasses));
  const [classesPerMeeting, setClassesPerMeeting] = useState(String(subject.rules.classesPerMeeting));
  const [directApprovalGrade, setDirectApprovalGrade] = useState(String(subject.rules.directApprovalGrade));
  const [minimumFinalGrade, setMinimumFinalGrade] = useState(String(subject.rules.minimumFinalGrade));
  const [gradingMethod, setGradingMethod] = useState<GradingMethod>(subject.rules.gradingMethod);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(subject.name);
    setCode(subject.code ?? "");
    setProfessor(subject.professor ?? "");
    setRoom(subject.room ?? "");
    setSemester(subject.semester);
    setColor(subject.color);
    setWorkloadHours(String(subject.workloadHours));
    setMinimumAttendance(String(subject.rules.minimumAttendance));
    setTotalExpectedClasses(String(subject.rules.totalExpectedClasses));
    setClassesPerMeeting(String(subject.rules.classesPerMeeting));
    setDirectApprovalGrade(String(subject.rules.directApprovalGrade));
    setMinimumFinalGrade(String(subject.rules.minimumFinalGrade));
    setGradingMethod(subject.rules.gradingMethod);
  }, [subject]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSubject(subject.id, {
      name: name.trim() || subject.name,
      code: code.trim() || undefined,
      professor: professor.trim() || undefined,
      room: room.trim() || undefined,
      semester: semester.trim() || subject.semester,
      color,
      workloadHours: Number(workloadHours) || subject.workloadHours,
      rules: {
        ...subject.rules,
        minimumAttendance: Number(minimumAttendance) || subject.rules.minimumAttendance,
        totalExpectedClasses: Number(totalExpectedClasses) || subject.rules.totalExpectedClasses,
        classesPerMeeting: Number(classesPerMeeting) || subject.rules.classesPerMeeting,
        directApprovalGrade: Number(directApprovalGrade) || subject.rules.directApprovalGrade,
        minimumFinalGrade: Number(minimumFinalGrade) || subject.rules.minimumFinalGrade,
        gradingMethod
      }
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Palette aria-hidden className="h-5 w-5 text-mint" />
            <span className="text-lg font-semibold text-ink">Personalizar disciplina</span>
          </span>
          <Badge tone={saved ? "mint" : "neutral"}>{saved ? "salvo" : "regras"}</Badge>
        </summary>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Nome" onChange={setName} value={name} />
            <TextField label="Codigo" onChange={setCode} value={code} />
            <TextField label="Professor" onChange={setProfessor} value={professor} />
            <TextField label="Sala" onChange={setRoom} value={room} />
            <TextField label="Semestre" onChange={setSemester} value={semester} />
            <label>
              <span className="text-sm font-medium text-slate-700">Cor</span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-ink"
                onChange={(event) => setColor(event.target.value)}
                type="color"
                value={color}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField label="Carga horaria" onChange={setWorkloadHours} value={workloadHours} />
            <NumberField label="Total de aulas" onChange={setTotalExpectedClasses} value={totalExpectedClasses} />
            <NumberField label="Aulas por encontro" onChange={setClassesPerMeeting} value={classesPerMeeting} />
            <NumberField label="Frequencia minima" onChange={setMinimumAttendance} value={minimumAttendance} />
            <NumberField label="Aprovacao direta" onChange={setDirectApprovalGrade} step="0.1" value={directApprovalGrade} />
            <NumberField label="Media final minima" onChange={setMinimumFinalGrade} step="0.1" value={minimumFinalGrade} />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Metodo de media</span>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
              onChange={(event) => setGradingMethod(event.target.value as GradingMethod)}
              value={gradingMethod}
            >
              <option value="simple">Media simples</option>
              <option value="weighted">Media ponderada</option>
              <option value="points">Pontos</option>
              <option value="custom">Customizado</option>
            </select>
          </label>

          <Button type="submit">
            <Save aria-hidden className="h-4 w-4" />
            Salvar personalizacao
          </Button>
        </form>
      </details>
    </section>
  );
}

function TextField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function NumberField({
  label,
  onChange,
  step = "1",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  step?: string;
  value: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
        min={0}
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}
