"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckSquare,
  ChevronRight,
  Clock3,
  Eye,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoutineData } from "@/features/data/seed";
import { fetchAdminApi } from "@/lib/admin/browser-api";
import type { AdminRoutineOperation } from "@/lib/admin/routine-editor";
import type { AcademicActivity, Subject } from "@/types/academic";
import type { AdminRoutineDetail, AdminUserSummary } from "@/types/admin";
import type { Reminder, Task } from "@/types/domain";

const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-foreground outline-none focus:border-strong disabled:bg-slate-50 disabled:text-slate-500";

type LoadState = "loading" | "ready" | "signed-out" | "forbidden" | "unavailable";

export function AdminDashboard() {
  const [state, setState] = useState<LoadState>("loading");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [detail, setDetail] = useState<AdminRoutineDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setMessage("");
    try {
      const response = await fetchAdminApi("/api/admin/users");
      if (!response) {
        setState("signed-out");
        return;
      }
      if (response.status === 401) {
        setState("signed-out");
        return;
      }
      if (response.status === 403) {
        setState("forbidden");
        return;
      }
      if (!response.ok) {
        setState("unavailable");
        return;
      }

      const payload = (await response.json()) as { users?: AdminUserSummary[] };
      const nextUsers = payload.users ?? [];
      setUsers(nextUsers);
      setState("ready");
      setSelectedUserId((current) => (nextUsers.some((user) => user.userId === current) ? current : nextUsers[0]?.userId ?? ""));
    } catch {
      setState("unavailable");
    }
  }, []);

  const loadDetail = useCallback(async (userId: string) => {
    if (!userId) {
      setDetail(null);
      return;
    }

    setLoadingDetail(true);
    setMessage("");
    try {
      const response = await fetchAdminApi(`/api/admin/users/${encodeURIComponent(userId)}`);
      const payload = response ? ((await response.json().catch(() => null)) as AdminRoutineDetail | { error?: string } | null) : null;
      if (!response?.ok || !isAdminRoutineDetail(payload)) {
        if (response?.status === 403) {
          await loadUsers();
          setMessage("A autorizacao desta conta expirou ou foi revogada.");
          return;
        }
        throw new Error("Nao foi possivel abrir esta rotina.");
      }

      setDetail(payload);
    } catch (error) {
      setDetail(null);
      setMessage(error instanceof Error ? error.message : "Nao foi possivel abrir esta rotina.");
    } finally {
      setLoadingDetail(false);
    }
  }, [loadUsers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadDetail(selectedUserId);
  }, [loadDetail, selectedUserId]);

  async function saveOperation(operation: AdminRoutineOperation, saveKey: string) {
    if (!detail) return;

    setSaving(saveKey);
    setMessage("");
    try {
      const response = await fetchAdminApi(`/api/admin/users/${encodeURIComponent(detail.user.id)}`, {
        body: JSON.stringify({ expectedUpdatedAt: detail.updatedAt, operation }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = response
        ? ((await response.json().catch(() => null)) as { data?: RoutineData; error?: string; updatedAt?: string } | null)
        : null;

      if (response?.status === 409) {
        await loadDetail(detail.user.id);
        throw new Error("A rotina mudou em outro aparelho. Recarreguei os dados; revise antes de salvar novamente.");
      }
      if (!response?.ok || !payload?.data || !payload.updatedAt) {
        if (response?.status === 403) {
          await loadUsers();
          throw new Error("A permissao de edicao expirou ou foi revogada.");
        }
        throw new Error("Nao foi possivel salvar a alteracao.");
      }

      const nextDetail: AdminRoutineDetail = { ...detail, data: payload.data, updatedAt: payload.updatedAt };
      setDetail(nextDetail);
      setUsers((current) =>
        current.map((user) =>
          user.userId === detail.user.id
            ? { ...user, displayName: payload.data?.appPreference.displayName || user.displayName, lastUpdatedAt: payload.updatedAt }
            : user
        )
      );
      setMessage("Alteracao salva e registrada no historico do usuario.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar a alteracao.");
    } finally {
      setSaving("");
    }
  }

  if (state !== "ready") {
    return <AdminGate state={state} onRetry={() => void loadUsers()} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-mint">Administracao autorizada</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Suporte de contas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Apenas rotinas com consentimento ativo aparecem aqui. Logins, senhas e credenciais do Classroom nao podem ser alterados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button aria-label="Atualizar contas" onClick={() => void loadUsers()} size="icon" title="Atualizar contas" variant="secondary">
            <RefreshCw aria-hidden className="h-4 w-4" />
          </Button>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-foreground hover:bg-slate-50"
            href="/configuracoes"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Configuracoes
          </Link>
        </div>
      </header>

      {message ? <p className="border-l-2 border-mint bg-emerald-50/30 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

      {!users.length ? (
        <section className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
          <ShieldCheck aria-hidden className="mx-auto h-7 w-7 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-foreground">Nenhuma autorizacao ativa</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">As contas aparecem aqui somente depois que o proprio usuario libera o acesso nas configuracoes.</p>
        </section>
      ) : (
        <div className="grid overflow-hidden rounded-lg border border-line bg-white shadow-sm lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-line lg:border-b-0 lg:border-r">
            <div className="border-b border-line px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Contas autorizadas</p>
              <p className="mt-1 text-sm text-slate-600">{users.length} acesso(s) ativo(s)</p>
            </div>
            <div className="divide-y divide-line">
              {users.map((user) => (
                <button
                  className={`grid w-full grid-cols-[36px_minmax(0,1fr)_18px] items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 ${
                    selectedUserId === user.userId ? "bg-slate-50" : ""
                  }`}
                  key={user.userId}
                  onClick={() => setSelectedUserId(user.userId)}
                  type="button"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <UserRound aria-hidden className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{user.displayName}</span>
                    <span className="block truncate text-xs text-slate-500">{user.email ?? "Conta sem email disponivel"}</span>
                  </span>
                  <ChevronRight aria-hidden className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 p-4 sm:p-5">
            {loadingDetail ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
                <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
                Carregando rotina...
              </div>
            ) : detail ? (
              <RoutineEditor detail={detail} key={`${detail.user.id}:${detail.updatedAt}`} onSave={saveOperation} saving={saving} />
            ) : (
              <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Selecione uma conta autorizada.</div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function AdminGate({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  const content = {
    forbidden: {
      description: "Esta conta nao possui o papel de administrador do Gavium.",
      title: "Acesso restrito"
    },
    loading: {
      description: "Validando sua conta e as autorizacoes ativas.",
      title: "Abrindo painel"
    },
    ready: { description: "", title: "" },
    "signed-out": {
      description: "Entre no Gavium com a conta administrativa para continuar.",
      title: "Login necessario"
    },
    unavailable: {
      description: "Nao foi possivel carregar o painel agora. Verifique a conexao e tente novamente.",
      title: "Painel indisponivel"
    }
  }[state];

  return (
    <div className="mx-auto max-w-xl py-10">
      <section className="rounded-lg border border-line bg-white p-6 text-center shadow-sm">
        {state === "loading" ? (
          <LoaderCircle aria-hidden className="mx-auto h-7 w-7 animate-spin text-mint" />
        ) : (
          <ShieldCheck aria-hidden className="mx-auto h-7 w-7 text-slate-400" />
        )}
        <h1 className="mt-3 text-xl font-semibold text-foreground">{content.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{content.description}</p>
        {state === "signed-out" ? (
          <Link className="mt-4 inline-flex h-11 items-center rounded-lg bg-contrast px-4 text-sm font-medium text-white" href="/login">
            Entrar
          </Link>
        ) : null}
        {state === "unavailable" ? (
          <Button className="mt-4" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </section>
    </div>
  );
}

function RoutineEditor({
  detail,
  onSave,
  saving
}: {
  detail: AdminRoutineDetail;
  onSave: (operation: AdminRoutineOperation, saveKey: string) => Promise<void>;
  saving: string;
}) {
  const canEdit = detail.grant.canEdit;
  const activities = detail.data.subjects.flatMap((subject) =>
    subject.activities.map((activity) => ({ activity, subjectId: subject.id, subjectName: subject.name }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{detail.user.displayName}</h2>
          <p className="mt-1 text-sm text-slate-500">{detail.user.email ?? "Email nao disponivel"}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />
            Acesso ate {formatDateTime(detail.grant.expiresAt)}
          </p>
        </div>
        <Badge tone={canEdit ? "mint" : "sky"}>{canEdit ? "Edicao autorizada" : "Somente leitura"}</Badge>
      </div>

      <EditorSection icon={<UserRound aria-hidden className="h-4 w-4" />} title="Perfil">
        <ProfileForm canEdit={canEdit} data={detail.data} onSave={onSave} saving={saving} />
      </EditorSection>

      <EditorSection count={detail.data.subjects.length} icon={<BookOpen aria-hidden className="h-4 w-4" />} title="Disciplinas">
        <EditableRows empty="Nenhuma disciplina cadastrada." rows={detail.data.subjects.map((subject) => (
          <SubjectForm canEdit={canEdit} key={subject.id} onSave={onSave} saving={saving} subject={subject} />
        ))} />
      </EditorSection>

      <EditorSection count={detail.data.tasks.length} icon={<CheckSquare aria-hidden className="h-4 w-4" />} title="Tarefas">
        <EditableRows empty="Nenhuma tarefa cadastrada." rows={detail.data.tasks.map((task) => (
          <TaskForm canEdit={canEdit} key={task.id} onSave={onSave} saving={saving} task={task} />
        ))} />
      </EditorSection>

      <EditorSection count={detail.data.reminders.length} icon={<CalendarClock aria-hidden className="h-4 w-4" />} title="Lembretes">
        <EditableRows empty="Nenhum lembrete cadastrado." rows={detail.data.reminders.map((reminder) => (
          <ReminderForm canEdit={canEdit} key={reminder.id} onSave={onSave} reminder={reminder} saving={saving} />
        ))} />
      </EditorSection>

      <EditorSection count={activities.length} icon={<Pencil aria-hidden className="h-4 w-4" />} title="Atividades academicas">
        <EditableRows empty="Nenhuma atividade academica cadastrada." rows={activities.map(({ activity, subjectId, subjectName }) => (
          <ActivityForm
            activity={activity}
            canEdit={canEdit}
            key={`${subjectId}:${activity.id}`}
            onSave={onSave}
            saving={saving}
            subjectId={subjectId}
            subjectName={subjectName}
          />
        ))} />
      </EditorSection>
    </div>
  );
}

function EditorSection({ children, count, icon, title }: { children: ReactNode; count?: number; icon: ReactNode; title: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-mint">{icon}</span>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {typeof count === "number" ? <Badge>{count}</Badge> : null}
      </div>
      {children}
    </section>
  );
}

function EditableRows({ empty, rows }: { empty: string; rows: ReactNode[] }) {
  if (!rows.length) return <p className="rounded-lg border border-dashed border-line p-3 text-sm text-slate-500">{empty}</p>;
  return <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">{rows}</div>;
}

function ProfileForm({ canEdit, data, onSave, saving }: FormBaseProps & { data: RoutineData }) {
  const key = "profile";
  return (
    <form
      className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2"
      key={`${data.appPreference.displayName}:${data.appPreference.currentCurriculumPeriod}`}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onSave(
          {
            patch: {
              courseInstitution: textValue(form, "courseInstitution"),
              courseOrArea: textValue(form, "courseOrArea"),
              currentCurriculumPeriod: numberValue(form, "currentCurriculumPeriod", 1),
              displayName: textValue(form, "displayName"),
              profileLabel: textValue(form, "profileLabel")
            },
            type: "profile"
          },
          key
        );
      }}
    >
      <Field defaultValue={data.appPreference.displayName} disabled={!canEdit} label="Nome exibido" name="displayName" required />
      <Field defaultValue={data.appPreference.profileLabel} disabled={!canEdit} label="Descricao curta" name="profileLabel" />
      <Field defaultValue={data.appPreference.courseOrArea} disabled={!canEdit} label="Curso ou area" name="courseOrArea" />
      <Field defaultValue={data.appPreference.courseInstitution ?? ""} disabled={!canEdit} label="Instituicao" name="courseInstitution" />
      <Field
        defaultValue={String(data.appPreference.currentCurriculumPeriod ?? 1)}
        disabled={!canEdit}
        label="Periodo atual"
        min="1"
        name="currentCurriculumPeriod"
        type="number"
      />
      <SaveButton canEdit={canEdit} saving={saving === key} />
    </form>
  );
}

function SubjectForm({ canEdit, onSave, saving, subject }: FormBaseProps & { subject: Subject }) {
  const key = `subject:${subject.id}`;
  return (
    <details className="group" key={`${subject.id}:${subject.name}`}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{subject.name}</span>
          <span className="block truncate text-xs text-slate-500">{subject.code || subject.semester || "Sem codigo"}</span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
      </summary>
      <form
        className="grid gap-3 border-t border-line bg-slate-50/40 p-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSave(
            {
              id: subject.id,
              patch: {
                code: textValue(form, "code"),
                name: textValue(form, "name"),
                professor: textValue(form, "professor"),
                room: textValue(form, "room"),
                semester: textValue(form, "semester"),
                status: textValue(form, "status") as Subject["status"],
                workloadHours: numberValue(form, "workloadHours", 0)
              },
              type: "subject"
            },
            key
          );
        }}
      >
        <Field defaultValue={subject.name} disabled={!canEdit} label="Disciplina" name="name" required />
        <Field defaultValue={subject.code ?? ""} disabled={!canEdit} label="Codigo" name="code" />
        <Field defaultValue={subject.professor ?? ""} disabled={!canEdit} label="Professor" name="professor" />
        <Field defaultValue={subject.room ?? ""} disabled={!canEdit} label="Sala" name="room" />
        <Field defaultValue={subject.semester} disabled={!canEdit} label="Periodo letivo" name="semester" />
        <Field defaultValue={String(subject.workloadHours)} disabled={!canEdit} label="Carga horaria" min="0" name="workloadHours" type="number" />
        <SelectField disabled={!canEdit} label="Situacao" name="status" options={subjectStatusOptions} value={subject.status} />
        <SaveButton canEdit={canEdit} saving={saving === key} />
      </form>
    </details>
  );
}

function TaskForm({ canEdit, onSave, saving, task }: FormBaseProps & { task: Task }) {
  const key = `task:${task.id}`;
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{task.title}</span>
          <span className="block truncate text-xs text-slate-500">{task.dueDate || task.date || "Sem prazo"}{task.time ? ` as ${task.time}` : ""}</span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
      </summary>
      <form
        className="grid gap-3 border-t border-line bg-slate-50/40 p-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSave(
            {
              id: task.id,
              patch: {
                category: textValue(form, "category"),
                date: textValue(form, "date"),
                dueDate: textValue(form, "dueDate"),
                priority: textValue(form, "priority") as Task["priority"],
                status: textValue(form, "status") as Task["status"],
                time: textValue(form, "time"),
                title: textValue(form, "title")
              },
              type: "task"
            },
            key
          );
        }}
      >
        <Field defaultValue={task.title} disabled={!canEdit} label="Tarefa" name="title" required />
        <Field defaultValue={task.category ?? ""} disabled={!canEdit} label="Categoria" name="category" />
        <Field defaultValue={task.date ?? ""} disabled={!canEdit} label="Data" name="date" type="date" />
        <Field defaultValue={task.dueDate ?? ""} disabled={!canEdit} label="Prazo" name="dueDate" type="date" />
        <Field defaultValue={task.time ?? ""} disabled={!canEdit} label="Horario" name="time" type="time" />
        <SelectField disabled={!canEdit} label="Prioridade" name="priority" options={priorityOptions} value={task.priority} />
        <SelectField disabled={!canEdit} label="Situacao" name="status" options={taskStatusOptions} value={task.status} />
        <SaveButton canEdit={canEdit} saving={saving === key} />
      </form>
    </details>
  );
}

function ReminderForm({ canEdit, onSave, reminder, saving }: FormBaseProps & { reminder: Reminder }) {
  const key = `reminder:${reminder.id}`;
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{reminder.title}</span>
          <span className="block truncate text-xs text-slate-500">{formatDateTime(reminder.remindAt)}</span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
      </summary>
      <form
        className="grid gap-3 border-t border-line bg-slate-50/40 p-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSave(
            {
              id: reminder.id,
              patch: {
                remindAt: textValue(form, "remindAt"),
                status: textValue(form, "status") as Reminder["status"],
                title: textValue(form, "title")
              },
              type: "reminder"
            },
            key
          );
        }}
      >
        <Field defaultValue={reminder.title} disabled={!canEdit} label="Lembrete" name="title" required />
        <Field defaultValue={toDateTimeInput(reminder.remindAt)} disabled={!canEdit} label="Data e hora" name="remindAt" required type="datetime-local" />
        <SelectField disabled={!canEdit} label="Situacao" name="status" options={reminderStatusOptions} value={reminder.status} />
        <SaveButton canEdit={canEdit} saving={saving === key} />
      </form>
    </details>
  );
}

function ActivityForm({
  activity,
  canEdit,
  onSave,
  saving,
  subjectId,
  subjectName
}: FormBaseProps & { activity: AcademicActivity; subjectId: string; subjectName: string }) {
  const key = `activity:${subjectId}:${activity.id}`;
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{activity.title}</span>
          <span className="block truncate text-xs text-slate-500">{subjectName} - {activity.dueDate || "Sem prazo"}</span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
      </summary>
      <form
        className="grid gap-3 border-t border-line bg-slate-50/40 p-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSave(
            {
              id: activity.id,
              patch: {
                dueDate: textValue(form, "dueDate"),
                status: textValue(form, "status") as AcademicActivity["status"],
                time: textValue(form, "time"),
                title: textValue(form, "title")
              },
              subjectId,
              type: "activity"
            },
            key
          );
        }}
      >
        <Field defaultValue={activity.title} disabled={!canEdit} label="Atividade" name="title" required />
        <Field defaultValue={activity.dueDate} disabled={!canEdit} label="Prazo" name="dueDate" type="date" />
        <Field defaultValue={activity.time ?? ""} disabled={!canEdit} label="Horario" name="time" type="time" />
        <SelectField disabled={!canEdit} label="Situacao" name="status" options={activityStatusOptions} value={activity.status} />
        <SaveButton canEdit={canEdit} saving={saving === key} />
      </form>
    </details>
  );
}

interface FormBaseProps {
  canEdit: boolean;
  onSave: (operation: AdminRoutineOperation, saveKey: string) => Promise<void>;
  saving: string;
}

function Field({ disabled, label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input className={inputClass} disabled={disabled} name={name} {...props} />
    </label>
  );
}

function SelectField({
  disabled,
  label,
  name,
  options,
  value
}: {
  disabled: boolean;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select className={inputClass} defaultValue={value} disabled={disabled} name={name}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function SaveButton({ canEdit, saving }: { canEdit: boolean; saving: boolean }) {
  if (!canEdit) {
    return (
      <p className="flex items-center gap-2 self-end text-xs text-slate-500">
        <Eye aria-hidden className="h-4 w-4" />
        Consulta autorizada; edicao bloqueada.
      </p>
    );
  }

  return (
    <Button className="self-end sm:justify-self-start" disabled={saving} size="sm" type="submit">
      {saving ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
      {saving ? "Salvando..." : "Salvar alteracao"}
    </Button>
  );
}

function textValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function numberValue(form: FormData, name: string, fallback: number) {
  const value = Number(form.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function toDateTimeInput(value: string) {
  const match = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  return match?.[0] ?? "";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function isAdminRoutineDetail(value: AdminRoutineDetail | { error?: string } | null): value is AdminRoutineDetail {
  return Boolean(value && "data" in value && "grant" in value && "user" in value && "updatedAt" in value);
}

const subjectStatusOptions = [
  { label: "Planejada", value: "planned" },
  { label: "Em andamento", value: "active" },
  { label: "Concluida", value: "completed" },
  { label: "Reprovada", value: "failed" },
  { label: "Pausada", value: "paused" },
  { label: "Arquivada", value: "archived" }
];

const priorityOptions = [
  { label: "Baixa", value: "low" },
  { label: "Media", value: "medium" },
  { label: "Alta", value: "high" },
  { label: "Urgente", value: "urgent" }
];

const taskStatusOptions = [
  { label: "Aberta", value: "open" },
  { label: "Bloqueada", value: "blocked" },
  { label: "Concluida", value: "done" },
  { label: "Adiada", value: "snoozed" },
  { label: "Cancelada", value: "cancelled" }
];

const reminderStatusOptions = [
  { label: "Agendado", value: "scheduled" },
  { label: "Enviado", value: "sent" },
  { label: "Dispensado", value: "dismissed" }
];

const activityStatusOptions = [
  { label: "Nao iniciada", value: "not_started" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Entregue", value: "submitted" },
  { label: "Corrigida", value: "corrected" },
  { label: "Atrasada", value: "late" }
];
