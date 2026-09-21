"use client";

import {
  AlertTriangle,
  Check,
  FileImage,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import { applyAcademicImport, findAcademicSubjectMatchIndex } from "@/lib/academic-import/merge";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SubjectStatus, Weekday } from "@/types/academic";
import type {
  AcademicDocumentKind,
  AcademicImportResult,
  AcademicImportSchedule,
  AcademicImportSubjectDraft,
  AcademicImportSummary
} from "@/types/academic-import";

const MAX_FILE_BYTES = 4_000_000;
const fieldClass =
  "mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-foreground outline-none transition focus:border-strong focus:ring-2 focus:ring-slate-200";
const kindOptions: Array<{ id: AcademicDocumentKind; label: string; detail: string }> = [
  { id: "auto", label: "Detectar", detail: "O Gavium identifica o documento" },
  { id: "schedule", label: "Horarios", detail: "Grade semanal de aulas" },
  { id: "transcript", label: "Historico ou matriz", detail: "Disciplinas e progresso" }
];
const weekdays: Array<{ id: Weekday; label: string }> = [
  { id: "monday", label: "Segunda" },
  { id: "tuesday", label: "Terca" },
  { id: "wednesday", label: "Quarta" },
  { id: "thursday", label: "Quinta" },
  { id: "friday", label: "Sexta" },
  { id: "saturday", label: "Sabado" },
  { id: "sunday", label: "Domingo" }
];
const statusOptions: Array<{ id: Exclude<SubjectStatus, "archived">; label: string }> = [
  { id: "planned", label: "Planejada" },
  { id: "active", label: "Em andamento" },
  { id: "completed", label: "Concluida" },
  { id: "failed", label: "Reprovada" },
  { id: "paused", label: "Trancada" }
];

interface AcademicImportDialogProps {
  onClose: () => void;
  onImported: (summary: AcademicImportSummary) => void;
  open: boolean;
}

interface AcademicImportApiResponse {
  error?: string;
  model?: string;
  result?: AcademicImportResult;
}

export function AcademicImportDialog({ onClose, onImported, open }: AcademicImportDialogProps) {
  const { data, replaceData } = useRoutineData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AcademicDocumentKind>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AcademicImportResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const matches = useMemo(
    () => result?.subjects.map((subject) => findAcademicSubjectMatchIndex(data.subjects, subject)) ?? [],
    [data.subjects, result]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setKind("auto");
    setFile(null);
    setResult(null);
    setSelected(new Set());
    setAnalyzing(false);
    setDragging(false);
    setError("");
    setModel("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !analyzing) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [analyzing, onClose, open]);

  if (!open) {
    return null;
  }

  function chooseFile(nextFile: File | null) {
    if (!nextFile) {
      return;
    }
    if (!isSupportedFile(nextFile)) {
      setError("Use um arquivo PDF, JPG, PNG ou WebP.");
      return;
    }
    setFile(nextFile);
    setResult(null);
    setSelected(new Set());
    setError("");
    setModel("");
  }

  async function analyzeDocument() {
    if (!file || analyzing) {
      return;
    }

    setAnalyzing(true);
    setError("");
    try {
      const preparedFile = await prepareAcademicFile(file);
      const formData = new FormData();
      formData.set("file", preparedFile);
      formData.set("kind", kind);
      const headers: Record<string, string> = {};
      if (isSupabaseConfigured()) {
        const { data: sessionData } = await createSupabaseBrowserClient().auth.getSession();
        if (sessionData.session?.access_token) {
          headers.Authorization = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 60_000);
      let response: Response;
      try {
        response = await fetch("/api/academic/import", {
          body: formData,
          headers,
          method: "POST",
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeout);
      }
      const payload = (await response.json().catch(() => ({}))) as AcademicImportApiResponse;
      if (!response.ok || !payload.result) {
        throw new Error(payload.error || "Nao consegui analisar esse documento.");
      }

      setResult(payload.result);
      setSelected(new Set(payload.result.subjects.map((_, index) => index)));
      setModel(payload.model ?? "");
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "A leitura demorou demais. Tente novamente com uma imagem menor ou um PDF mais simples."
          : caught instanceof Error
            ? caught.message
            : "Nao consegui analisar esse documento."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function applyImport() {
    if (!result) {
      return;
    }
    const merged = applyAcademicImport(data, result, { selectedIndexes: selected });
    replaceData(merged.data);
    onImported(merged.summary);
    onClose();
  }

  function updateCourse<Key extends keyof AcademicImportResult["course"]>(
    key: Key,
    value: AcademicImportResult["course"][Key]
  ) {
    setResult((current) =>
      current
        ? {
            ...current,
            course: { ...current.course, [key]: value }
          }
        : current
    );
  }

  function updateSubject(index: number, patch: Partial<AcademicImportSubjectDraft>) {
    setResult((current) =>
      current
        ? {
            ...current,
            subjects: current.subjects.map((subject, subjectIndex) =>
              subjectIndex === index ? { ...subject, ...patch } : subject
            )
          }
        : current
    );
  }

  function updateSchedule(subjectIndex: number, scheduleIndex: number, patch: Partial<AcademicImportSchedule>) {
    if (!result) {
      return;
    }
    const subject = result.subjects[subjectIndex];
    updateSubject(subjectIndex, {
      schedules: subject.schedules.map((schedule, index) =>
        index === scheduleIndex ? { ...schedule, ...patch } : schedule
      )
    });
  }

  function addSchedule(subjectIndex: number) {
    if (!result) {
      return;
    }
    updateSubject(subjectIndex, {
      schedules: [
        ...result.subjects[subjectIndex].schedules,
        { classesQuantity: data.appPreference.defaultClassesQuantity, endTime: "", startTime: "", weekday: "monday" }
      ]
    });
  }

  function removeSchedule(subjectIndex: number, scheduleIndex: number) {
    if (!result) {
      return;
    }
    updateSubject(subjectIndex, {
      schedules: result.subjects[subjectIndex].schedules.filter((_, index) => index !== scheduleIndex)
    });
  }

  function toggleSelected(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const hasCourseData = result
    ? Boolean(
        result.course.courseName ||
          result.course.institution ||
          result.course.totalPeriods ||
          result.course.totalWorkloadHours ||
          result.course.currentPeriod
      )
    : false;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-5" role="presentation">
      <section
        aria-labelledby="academic-import-title"
        aria-modal="true"
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-soft sm:max-h-[92vh] sm:max-w-5xl sm:rounded-lg"
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-mint">
              <Sparkles aria-hidden className="h-4 w-4" />
              Leitura inteligente
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground" id="academic-import-title">
              {result ? "Revise antes de importar" : "Importar documento academico"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {result
                ? "Corrija qualquer informacao e escolha o que deve entrar no Gavium."
                : "Envie seu horario, historico, analitico ou matriz curricular."}
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-foreground disabled:opacity-40"
            disabled={analyzing}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!result ? (
            <div className="space-y-6 p-4 sm:p-6">
              <section>
                <h3 className="text-sm font-semibold text-foreground">O que voce esta enviando?</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {kindOptions.map((option) => (
                    <button
                      className={cn(
                        "min-h-[72px] rounded-md border p-3 text-left transition",
                        kind === option.id
                          ? "border-strong bg-slate-50 ring-1 ring-strong"
                          : "border-line bg-white hover:border-slate-400"
                      )}
                      key={option.id}
                      onClick={() => setKind(option.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border",
                            kind === option.id ? "border-contrast bg-contrast text-white" : "border-slate-300"
                          )}
                        >
                          {kind === option.id ? <Check className="h-3 w-3" /> : null}
                        </span>
                        {option.label}
                      </span>
                      <span className="mt-1 block pl-6 text-xs text-slate-500">{option.detail}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <input
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                  ref={inputRef}
                  type="file"
                />
                <button
                  className={cn(
                    "grid min-h-[230px] w-full place-items-center rounded-md border-2 border-dashed px-5 py-10 text-center transition",
                    dragging ? "border-mint bg-emerald-50/30" : "border-line bg-slate-50 hover:border-slate-400"
                  )}
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragging(false);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    chooseFile(event.dataTransfer.files?.[0] ?? null);
                  }}
                  type="button"
                >
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-mint shadow-sm">
                      {file?.type.startsWith("image/") ? (
                        <FileImage aria-hidden className="h-6 w-6" />
                      ) : (
                        <Upload aria-hidden className="h-6 w-6" />
                      )}
                    </div>
                    {file ? (
                      <>
                        <p className="mt-4 break-all text-sm font-semibold text-foreground">{file.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatFileSize(file.size)} · clique para trocar</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-4 text-sm font-semibold text-foreground">Solte o documento aqui ou escolha um arquivo</p>
                        <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG ou WebP · ate 4 MB</p>
                      </>
                    )}
                  </div>
                </button>
                <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  O documento e enviado ao provedor de IA somente para esta analise e nao fica armazenado pelo Gavium. Revise os dados antes de salvar.
                </div>
              </section>

              {error ? <ErrorMessage message={error} /> : null}
            </div>
          ) : (
            <div className="space-y-7 p-4 sm:p-6">
              <section className="border-b border-line pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="mint">{documentTypeLabel(result.documentType)}</Badge>
                      {model ? <span className="text-xs text-slate-400">Analise concluida</span> : null}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {result.documentTitle || file?.name || "Documento academico"}
                    </h3>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      {result.summary || `${result.subjects.length} disciplinas reconhecidas.`}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setResult(null);
                      setSelected(new Set());
                      setError("");
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    Trocar documento
                  </Button>
                </div>
                {result.warnings.length ? (
                  <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle aria-hidden className="h-4 w-4" />
                      Pontos para conferir
                    </div>
                    <ul className="mt-2 space-y-1 pl-6 text-xs leading-5">
                      {result.warnings.map((warning, index) => (
                        <li className="list-disc" key={`${warning}-${index}`}>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Perfil academico</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">Dados do curso</h3>
                  </div>
                  <span className="text-xs text-slate-500 sm:text-right">Campos vazios preservam o cadastro atual</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Curso</span>
                    <input
                      className={fieldClass}
                      onChange={(event) => updateCourse("courseName", event.target.value)}
                      placeholder="Nome do curso"
                      value={result.course.courseName}
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Instituicao</span>
                    <input
                      className={fieldClass}
                      onChange={(event) => updateCourse("institution", event.target.value)}
                      placeholder="Nome da instituicao"
                      value={result.course.institution}
                    />
                  </label>
                  <NumberField
                    label="Periodo atual"
                    onChange={(value) => updateCourse("currentPeriod", value)}
                    value={result.course.currentPeriod}
                  />
                  <NumberField
                    label="Total de periodos"
                    onChange={(value) => updateCourse("totalPeriods", value)}
                    value={result.course.totalPeriods}
                  />
                  <NumberField
                    label="Carga total (h)"
                    onChange={(value) => updateCourse("totalWorkloadHours", value)}
                    value={result.course.totalWorkloadHours}
                  />
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Revisao</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">
                      {result.subjects.length} {result.subjects.length === 1 ? "disciplina encontrada" : "disciplinas encontradas"}
                    </h3>
                  </div>
                  {result.subjects.length ? (
                    <div className="flex gap-2">
                      <Button onClick={() => setSelected(new Set(result.subjects.map((_, index) => index)))} size="sm" variant="ghost">
                        Selecionar todas
                      </Button>
                      <Button onClick={() => setSelected(new Set())} size="sm" variant="ghost">
                        Limpar
                      </Button>
                    </div>
                  ) : null}
                </div>

                {result.subjects.length ? (
                  <div className="mt-3 space-y-3">
                    {result.subjects.map((subject, index) => (
                      <SubjectReview
                        checked={selected.has(index)}
                        existing={matches[index] >= 0}
                        index={index}
                        key={index}
                        onAddSchedule={() => addSchedule(index)}
                        onRemoveSchedule={(scheduleIndex) => removeSchedule(index, scheduleIndex)}
                        onToggle={() => toggleSelected(index)}
                        onUpdate={(patch) => updateSubject(index, patch)}
                        onUpdateSchedule={(scheduleIndex, patch) => updateSchedule(index, scheduleIndex, patch)}
                        subject={subject}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 border-y border-dashed border-line py-8 text-center text-sm text-slate-500">
                    Nenhuma disciplina foi reconhecida. Confira os dados do curso ou tente outro documento.
                  </div>
                )}
              </section>

              {error ? <ErrorMessage message={error} /> : null}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500">
            {result ? `${selected.size} selecionada(s) · cadastros existentes serao atualizados sem apagar notas ou faltas` : "Voce sempre revisa antes de salvar"}
          </p>
          <div className="flex gap-2 sm:justify-end">
            <Button className="flex-1 sm:flex-none" disabled={analyzing} onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            {result ? (
              <Button className="flex-1 sm:flex-none" disabled={!selected.size && !hasCourseData} onClick={applyImport}>
                <Check aria-hidden className="h-4 w-4" />
                Aplicar importacao
              </Button>
            ) : (
              <Button className="flex-1 sm:flex-none" disabled={!file || analyzing} onClick={() => void analyzeDocument()}>
                {analyzing ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden className="h-4 w-4" />}
                {analyzing ? "Lendo documento..." : "Analisar documento"}
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function SubjectReview({
  checked,
  existing,
  index,
  onAddSchedule,
  onRemoveSchedule,
  onToggle,
  onUpdate,
  onUpdateSchedule,
  subject
}: {
  checked: boolean;
  existing: boolean;
  index: number;
  onAddSchedule: () => void;
  onRemoveSchedule: (scheduleIndex: number) => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<AcademicImportSubjectDraft>) => void;
  onUpdateSchedule: (scheduleIndex: number, patch: Partial<AcademicImportSchedule>) => void;
  subject: AcademicImportSubjectDraft;
}) {
  const [expanded, setExpanded] = useState(index < 4);

  return (
    <details
      className={cn("rounded-md border bg-white", checked ? "border-line" : "border-line opacity-60")}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 sm:px-4">
        <input
          aria-label={`Importar ${subject.name}`}
          checked={checked}
          className="h-5 w-5 shrink-0 accent-emerald-600"
          onChange={onToggle}
          onClick={(event) => event.stopPropagation()}
          type="checkbox"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{subject.name || "Disciplina sem nome"}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[subject.code, statusLabel(subject.status), subject.recommendedPeriod ? `${subject.recommendedPeriod}o periodo` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {subject.confidence < 0.7 ? <Badge tone="gold">Conferir</Badge> : null}
          <Badge tone={existing ? "sky" : "mint"}>{existing ? "Atualiza" : "Nova"}</Badge>
        </div>
      </summary>
      <div className="border-t border-line px-3 py-4 sm:px-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Nome da disciplina</span>
            <input className={fieldClass} onChange={(event) => onUpdate({ name: event.target.value })} value={subject.name} />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Codigo</span>
            <input className={fieldClass} onChange={(event) => onUpdate({ code: event.target.value })} value={subject.code} />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Situacao</span>
            <select
              className={fieldClass}
              onChange={(event) => onUpdate({ status: event.target.value as AcademicImportSubjectDraft["status"] })}
              value={subject.status}
            >
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Periodo recomendado</span>
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => onUpdate({ recommendedPeriod: Math.max(0, Number(event.target.value) || 0) })}
              type="number"
              value={subject.recommendedPeriod || ""}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Carga horaria</span>
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => onUpdate({ workloadHours: Math.max(0, Number(event.target.value) || 0) })}
              type="number"
              value={subject.workloadHours || ""}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Semestre</span>
            <input className={fieldClass} onChange={(event) => onUpdate({ semester: event.target.value })} value={subject.semester} />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Professor</span>
            <input className={fieldClass} onChange={(event) => onUpdate({ professor: event.target.value })} value={subject.professor} />
          </label>
          <label>
            <span className="text-xs font-medium text-slate-600">Sala</span>
            <input className={fieldClass} onChange={(event) => onUpdate({ room: event.target.value })} value={subject.room} />
          </label>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Horarios semanais</p>
              <p className="text-xs text-slate-500">Apenas horarios completos serao salvos.</p>
            </div>
            <Button onClick={onAddSchedule} size="sm" variant="ghost">
              <Plus aria-hidden className="h-4 w-4" />
              Horario
            </Button>
          </div>
          {subject.schedules.length ? (
            <div className="mt-3 divide-y divide-line border-y border-line">
              {subject.schedules.map((schedule, scheduleIndex) => (
                <div className="grid gap-2 py-3 sm:grid-cols-[1.2fr_1fr_1fr_90px_40px] sm:items-end" key={`${scheduleIndex}-${schedule.weekday}`}>
                  <label>
                    <span className="text-xs text-slate-500">Dia</span>
                    <select
                      className={fieldClass}
                      onChange={(event) => onUpdateSchedule(scheduleIndex, { weekday: event.target.value as Weekday })}
                      value={schedule.weekday}
                    >
                      {weekdays.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-xs text-slate-500">Inicio</span>
                    <input
                      className={fieldClass}
                      onChange={(event) => onUpdateSchedule(scheduleIndex, { startTime: event.target.value })}
                      type="time"
                      value={schedule.startTime}
                    />
                  </label>
                  <label>
                    <span className="text-xs text-slate-500">Fim</span>
                    <input
                      className={fieldClass}
                      onChange={(event) => onUpdateSchedule(scheduleIndex, { endTime: event.target.value })}
                      type="time"
                      value={schedule.endTime}
                    />
                  </label>
                  <label>
                    <span className="text-xs text-slate-500">Aulas</span>
                    <input
                      className={fieldClass}
                      min="1"
                      onChange={(event) =>
                        onUpdateSchedule(scheduleIndex, { classesQuantity: Math.max(1, Number(event.target.value) || 1) })
                      }
                      type="number"
                      value={schedule.classesQuantity}
                    />
                  </label>
                  <button
                    aria-label="Remover horario"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onRemoveSchedule(scheduleIndex)}
                    type="button"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 border-y border-dashed border-line py-3 text-xs text-slate-500">Nenhum horario reconhecido.</p>
          )}
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-600">Observacao extraida</span>
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-strong focus:ring-2 focus:ring-slate-200"
            onChange={(event) => onUpdate({ notes: event.target.value })}
            value={subject.notes}
          />
        </label>
      </div>
    </details>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        className={fieldClass}
        min="0"
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        type="number"
        value={value || ""}
      />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-950" role="alert">
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

async function prepareAcademicFile(file: File) {
  if (!file.type.startsWith("image/")) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("O PDF passa de 4 MB. Exporte uma versao menor e tente novamente.");
    }
    return file;
  }
  if (file.size <= 1_500_000 || typeof createImageBitmap !== "function") {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("A imagem passa de 4 MB. Reduza o tamanho e tente novamente.");
    }
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Nao consegui preparar essa imagem.");
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await canvasToBlob(canvas, 0.86);
    if (blob.size > MAX_FILE_BYTES) {
      blob = await canvasToBlob(canvas, 0.7);
    }
    if (blob.size > MAX_FILE_BYTES) {
      throw new Error("A imagem continua grande demais. Recorte a parte importante e tente novamente.");
    }
    return new File([blob], replaceExtension(file.name, "jpg"), { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Nao consegui preparar essa imagem."))), "image/jpeg", quality);
  });
}

function replaceExtension(name: string, extension: string) {
  return `${name.replace(/\.[^.]+$/, "")}.${extension}`;
}

function isSupportedFile(file: File) {
  return ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type) || /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
}

function formatFileSize(size: number) {
  return size >= 1_000_000 ? `${(size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1_000))} KB`;
}

function documentTypeLabel(type: AcademicImportResult["documentType"]) {
  const labels = {
    curriculum: "Matriz curricular",
    schedule: "Horario de aulas",
    transcript: "Historico academico",
    unknown: "Documento academico"
  };
  return labels[type];
}

function statusLabel(status: AcademicImportSubjectDraft["status"]) {
  return statusOptions.find((option) => option.id === status)?.label ?? status;
}
