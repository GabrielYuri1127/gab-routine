"use client";

import { useRouter } from "next/navigation";
import { Archive, CheckCircle2, Copy, Palette, PauseCircle, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createId, useRoutineData } from "@/features/data/routine-store";
import { weekdayLabels } from "@/lib/date";
import type { GradingMethod, Subject, SubjectStatus, Weekday } from "@/types/academic";

const weekdayOptions: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const statusLabels: Record<SubjectStatus, string> = {
  active: "Ativa",
  archived: "Arquivada",
  completed: "Concluida",
  paused: "Pausada"
};

export function SubjectSettingsPanel({ subject }: { subject: Subject }) {
  const router = useRouter();
  const { addSubject, removeSubject, updateSubject } = useRoutineData();
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code ?? "");
  const [professor, setProfessor] = useState(subject.professor ?? "");
  const [room, setRoom] = useState(subject.room ?? "");
  const [semester, setSemester] = useState(subject.semester);
  const [color, setColor] = useState(subject.color);
  const [status, setStatus] = useState<SubjectStatus>(subject.status);
  const [observations, setObservations] = useState(subject.observations ?? "");
  const [workloadHours, setWorkloadHours] = useState(String(subject.workloadHours));
  const [minimumAttendance, setMinimumAttendance] = useState(String(subject.rules.minimumAttendance));
  const [totalExpectedClasses, setTotalExpectedClasses] = useState(String(subject.rules.totalExpectedClasses));
  const [classesPerMeeting, setClassesPerMeeting] = useState(String(subject.rules.classesPerMeeting));
  const [directApprovalGrade, setDirectApprovalGrade] = useState(String(subject.rules.directApprovalGrade));
  const [minimumFinalGrade, setMinimumFinalGrade] = useState(String(subject.rules.minimumFinalGrade));
  const [gradingMethod, setGradingMethod] = useState<GradingMethod>(subject.rules.gradingMethod);
  const [newWeekday, setNewWeekday] = useState<Weekday>("monday");
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newClassesQuantity, setNewClassesQuantity] = useState("2");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(subject.name);
    setCode(subject.code ?? "");
    setProfessor(subject.professor ?? "");
    setRoom(subject.room ?? "");
    setSemester(subject.semester);
    setColor(subject.color);
    setStatus(subject.status);
    setObservations(subject.observations ?? "");
    setWorkloadHours(String(subject.workloadHours));
    setMinimumAttendance(String(subject.rules.minimumAttendance));
    setTotalExpectedClasses(String(subject.rules.totalExpectedClasses));
    setClassesPerMeeting(String(subject.rules.classesPerMeeting));
    setDirectApprovalGrade(String(subject.rules.directApprovalGrade));
    setMinimumFinalGrade(String(subject.rules.minimumFinalGrade));
    setGradingMethod(subject.rules.gradingMethod);
  }, [subject]);

  function flashSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSubject(subject.id, {
      name: name.trim() || subject.name,
      code: code.trim() || undefined,
      professor: professor.trim() || undefined,
      room: room.trim() || undefined,
      semester: semester.trim() || subject.semester,
      color,
      observations: observations.trim() || undefined,
      status,
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
    flashSaved();
  }

  function setSubjectStatus(nextStatus: SubjectStatus) {
    setStatus(nextStatus);
    updateSubject(subject.id, { status: nextStatus });
    flashSaved();
  }

  function duplicateSubject() {
    const nextId = createId("subject");
    addSubject({
      ...subject,
      id: nextId,
      activities: [],
      attendance: [],
      grades: [],
      name: `${subject.name} copia`,
      schedules: subject.schedules.map((schedule) => ({
        ...schedule,
        id: createId("schedule"),
        subjectId: nextId
      })),
      status: "active"
    });
    router.push(`/faculdade/${nextId}`);
  }

  function deleteSubject() {
    if (!window.confirm(`Excluir ${subject.name} e todos os registros dela neste navegador?`)) {
      return;
    }

    removeSubject(subject.id);
    router.push("/faculdade");
  }

  function addSchedule() {
    const startTime = newStartTime || "08:00";
    updateSubject(subject.id, {
      schedules: [
        ...subject.schedules,
        {
          classesQuantity: Number(newClassesQuantity) || 1,
          endTime: newEndTime || startTime,
          id: createId("schedule"),
          startTime,
          subjectId: subject.id,
          weekday: newWeekday
        }
      ]
    });
    flashSaved();
  }

  function updateSchedule(scheduleId: string, patch: Partial<Subject["schedules"][number]>) {
    updateSubject(subject.id, {
      schedules: subject.schedules.map((schedule) => (schedule.id === scheduleId ? { ...schedule, ...patch } : schedule))
    });
  }

  function removeSchedule(scheduleId: string) {
    updateSubject(subject.id, {
      schedules: subject.schedules.filter((schedule) => schedule.id !== scheduleId)
    });
    flashSaved();
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm" id="editar">
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
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
                onChange={(event) => setStatus(event.target.value as SubjectStatus)}
                value={status}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
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

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Observacoes</span>
            <textarea
              className="mt-1 min-h-24 w-full resize-y rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink"
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Links, criterios, combinados com professor, conteudos importantes"
              value={observations}
            />
          </label>

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

          <div className="rounded-lg border border-dashed border-line p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Horarios de aula</h3>
              <Badge tone="neutral">{subject.schedules.length} encontros</Badge>
            </div>

            <div className="space-y-2">
              {subject.schedules.length === 0 ? <p className="text-sm text-slate-500">Nenhum horario cadastrado.</p> : null}
              {subject.schedules.map((schedule) => (
                <div className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_120px_120px_96px_44px]" key={schedule.id}>
                  <label>
                    <span className="text-xs font-medium text-slate-500">Dia</span>
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-ink"
                      onChange={(event) => updateSchedule(schedule.id, { weekday: event.target.value as Weekday })}
                      value={schedule.weekday}
                    >
                      {weekdayOptions.map((weekday) => (
                        <option key={weekday} value={weekday}>
                          {weekdayLabels[weekday]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-xs font-medium text-slate-500">Inicio</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-ink"
                      onChange={(event) => updateSchedule(schedule.id, { startTime: event.target.value })}
                      type="time"
                      value={schedule.startTime}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-slate-500">Fim</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-ink"
                      onChange={(event) => updateSchedule(schedule.id, { endTime: event.target.value })}
                      type="time"
                      value={schedule.endTime}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-medium text-slate-500">Aulas</span>
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-ink"
                      min={1}
                      onChange={(event) => updateSchedule(schedule.id, { classesQuantity: Number(event.target.value) || 1 })}
                      type="number"
                      value={schedule.classesQuantity}
                    />
                  </label>
                  <Button aria-label="Excluir horario" className="self-end" onClick={() => removeSchedule(schedule.id)} size="icon" variant="ghost">
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_120px_120px_96px_auto]">
              <label>
                <span className="text-xs font-medium text-slate-500">Novo dia</span>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-ink"
                  onChange={(event) => setNewWeekday(event.target.value as Weekday)}
                  value={newWeekday}
                >
                  {weekdayOptions.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {weekdayLabels[weekday]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">Inicio</span>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-ink"
                  onChange={(event) => setNewStartTime(event.target.value)}
                  type="time"
                  value={newStartTime}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">Fim</span>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-ink"
                  onChange={(event) => setNewEndTime(event.target.value)}
                  type="time"
                  value={newEndTime}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-500">Aulas</span>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-2 text-sm outline-none focus:border-ink"
                  min={1}
                  onChange={(event) => setNewClassesQuantity(event.target.value)}
                  type="number"
                  value={newClassesQuantity}
                />
              </label>
              <Button className="self-end" onClick={addSchedule} variant="secondary">
                <Plus aria-hidden className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-line p-3">
            <h3 className="text-sm font-semibold text-ink">Acoes da disciplina</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button onClick={() => setSubjectStatus("paused")} variant="secondary">
                <PauseCircle aria-hidden className="h-4 w-4" />
                Pausar
              </Button>
              <Button onClick={() => setSubjectStatus("completed")} variant="secondary">
                <CheckCircle2 aria-hidden className="h-4 w-4" />
                Concluir
              </Button>
              <Button onClick={() => setSubjectStatus("archived")} variant="secondary">
                <Archive aria-hidden className="h-4 w-4" />
                Arquivar
              </Button>
              <Button onClick={() => setSubjectStatus("active")} variant="secondary">
                <RotateCcw aria-hidden className="h-4 w-4" />
                Ativar
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button onClick={duplicateSubject} variant="secondary">
                <Copy aria-hidden className="h-4 w-4" />
                Copiar configuracao
              </Button>
              <Button onClick={deleteSubject} variant="danger">
                <Trash2 aria-hidden className="h-4 w-4" />
                Excluir disciplina
              </Button>
            </div>
          </div>

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
