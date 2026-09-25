"use client";

import { AlertCircle, CheckCircle2, ExternalLink, GraduationCap, RefreshCw, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOCAL_USER_ID, type RoutineData } from "@/features/data/seed";
import { createId, useRoutineData } from "@/features/data/routine-store";
import { createUfamRules } from "@/lib/academic-rules/ufam";
import {
  mapClassroomCourseWorkType,
  toDateKeyFromClassroomDueDate,
  toTimeFromClassroomDueTime
} from "@/lib/classroom/google-classroom";
import { getSupabaseAccessToken, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AcademicActivity, AcademicResource } from "@/types/academic";
import type {
  ClassroomAccount,
  ClassroomConnectionVerification,
  ClassroomConnectionSummary,
  ClassroomCourse,
  ClassroomCourseWork,
  ClassroomImportPayload
} from "@/types/classroom";

const CLASSROOM_IMPORT_STORAGE_KEY = "gab-routine:classroom:last-import";
const CLASSROOM_IMPORTS_STORAGE_KEY = "gab-routine:classroom:imports";
const GOOGLE_OAUTH_AUDIENCE_URL = "https://console.cloud.google.com/auth/audience?project=gavium";
const GOOGLE_OAUTH_BRANDING_URL = "https://console.cloud.google.com/auth/branding?project=gavium";

interface ClassroomStatus {
  callbackPath: string;
  configured: boolean;
  oauthStatus?: "invalid_client" | "not_configured" | "ready" | "redirect_mismatch" | "unverified";
  persistenceStatus?: "not_configured" | "ready" | "schema_missing" | "unavailable";
  persistentConfigured: boolean;
  scopes: string[];
}

interface ImportResult {
  activities: number;
  resources: number;
  skipped: number;
  subjects: number;
}

const subjectColors = ["#0f9f7a", "#2b7fff", "#e35d45", "#b7791f", "#7c3aed", "#0891b2"];

export function ClassroomImportPanel() {
  const { cloud, data, hydrated, replaceData } = useRoutineData();
  const storageUserId = cloud.userId ?? data.userId ?? LOCAL_USER_ID;
  const [status, setStatus] = useState<ClassroomStatus | null>(null);
  const [connections, setConnections] = useState<ClassroomConnectionSummary[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [imports, setImports] = useState<ClassroomImportPayload[]>([]);
  const [message, setMessage] = useState("");
  const [verifications, setVerifications] = useState<Record<string, ClassroomConnectionVerification>>({});
  const [verifying, setVerifying] = useState(false);
  const [workingId, setWorkingId] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/classroom/status")
      .then((response) => response.json())
      .then((nextStatus: ClassroomStatus) => {
        if (active) {
          setStatus(nextStatus);
        }
      })
      .catch(() => {
        if (active) {
          setStatus({
            callbackPath: "/api/classroom/callback",
            configured: false,
            oauthStatus: "unverified",
            persistentConfigured: false,
            scopes: []
          });
        }
      });

    if (!hydrated) {
      return () => {
        active = false;
      };
    }

    if (isSupabaseConfigured()) {
      setConnectionsLoaded(false);
      void fetchClassroomApi("/api/classroom/connections")
        .then((response) => (response?.ok ? response.json() : null))
        .then((payload: { connections?: ClassroomConnectionSummary[] } | null) => {
          if (active) {
            const nextConnections = payload?.connections ?? [];
            setConnections(nextConnections);
            setConnectionsLoaded(true);
            if (nextConnections.length) {
              void verifyConnections(nextConnections, false);
            } else {
              setVerifications({});
            }
          }
        })
        .catch(() => {
          if (active) {
            setConnectionsLoaded(true);
            setMessage("A conexao continua salva, mas nao consegui consulta-la agora. Tente novamente em instantes.");
          }
        });
    }

    const storedImports = readStoredImports(storageUserId);
    saveStoredImports(storageUserId, storedImports);
    setImports(storedImports);

    const query = new URLSearchParams(window.location.search).get("classroom");
    if (query === "import-ready") {
      setMessage("Conta conectada e salva. Revise a previa ou sincronize novamente quando precisar.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "storage-schema") {
      setMessage("A previa foi carregada, mas falta criar a tabela classroom_connections no Supabase para salvar a conexao.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "storage-config") {
      setMessage("A previa foi carregada, mas o armazenamento seguro do Classroom ainda nao esta configurado.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "token-missing") {
      setMessage("O Google nao entregou a chave de renovacao. Remova o acesso antigo do Gavium no Google e conecte novamente uma vez.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "account-error") {
      setMessage("O Google autorizou o acesso, mas nao informou qual conta foi conectada. Tente novamente.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "storage-error" || query === "import-ready-local") {
      setMessage("A previa foi carregada, mas a conexao permanente nao foi salva. Tente conectar novamente.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "missing") {
      setMessage("Configure as chaves do Google Classroom antes de conectar.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "access-denied") {
      setMessage(
        "O Google bloqueou essa conta. Adicione exatamente a conta escolhida em Publico-alvo > Usuarios de teste e tente novamente."
      );
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "scope-error") {
      setMessage("O Google recusou as permissoes do Classroom. Revise os escopos em Acesso a dados.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "oauth-error") {
      setMessage("O Google nao autorizou a conexao. Revise o publico e os usuarios de teste do app OAuth.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (query === "error" || query === "invalid-state") {
      setMessage("Nao consegui concluir a conexao com o Google Classroom.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      active = false;
    };
  }, [hydrated, storageUserId]);

  const totals = useMemo(() => {
    const courses = imports.reduce((total, item) => total + item.courses.length, 0);
    const courseWork = imports.reduce((total, item) => total + item.courses.reduce((sum, course) => sum + course.courseWork.length, 0), 0);
    const datedCourseWork = imports.reduce(
      (total, item) =>
        total +
        item.courses.reduce(
          (sum, course) => sum + course.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length,
          0
        ),
      0
    );

    return { courses, courseWork, datedCourseWork };
  }, [imports]);

  function clearImport(target: ClassroomImportPayload) {
    const nextImports = imports.filter((item) => getImportKey(item) !== getImportKey(target));
    saveStoredImports(storageUserId, nextImports);
    setImports(nextImports);
    setMessage("Previa dessa conta removida.");
  }

  function importOne(target: ClassroomImportPayload) {
    const result = mergeClassroomPayload(data, target);
    replaceData(result.data);
    setMessage(formatImportMessage(result.summary, getAccountLabel(target)));
  }

  function importAll() {
    const total: ImportResult = { activities: 0, resources: 0, skipped: 0, subjects: 0 };
    const mergedData = imports.reduce((currentData, item) => {
      const result = mergeClassroomPayload(currentData, item);
      total.activities += result.summary.activities;
      total.resources += result.summary.resources;
      total.skipped += result.summary.skipped;
      total.subjects += result.summary.subjects;
      return result.data;
    }, data);

    replaceData(mergedData);
    setMessage(formatImportMessage(total, "todas as contas"));
  }

  async function connectAccount() {
    setWorkingId("connect");
    setMessage("");

    try {
      const token = await getSupabaseAccessToken();
      if (!token) {
        setMessage("Entre na sua conta do Gavium antes de conectar o Google Classroom.");
        window.location.assign("/login");
        return;
      }

      const response = await fetchClassroomApi("/api/classroom/connect", { method: "POST" });
      const payload = response
        ? ((await response.json().catch(() => null)) as { error?: string; url?: string } | null)
        : null;

      if (!response?.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Nao foi possivel iniciar a conexao.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel iniciar a conexao.");
      setWorkingId("");
    }
  }

  async function syncConnection(connection: ClassroomConnectionSummary) {
    setWorkingId(connection.connectionId);
    setMessage("");

    try {
      const token = await getSupabaseAccessToken();
      if (!token) {
        throw new Error("Entre novamente no Gavium para sincronizar esta conta.");
      }

      const response = await fetchClassroomApi("/api/classroom/sync", {
        body: JSON.stringify({ connectionId: connection.connectionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = response
        ? ((await response.json().catch(() => null)) as { error?: string; import?: ClassroomImportPayload } | null)
        : null;

      if (!response?.ok || !payload?.import) {
        throw new Error(payload?.error ?? "Nao foi possivel sincronizar esta conta.");
      }

      const nextImports = [
        payload.import,
        ...imports.filter((item) => getImportKey(item) !== getImportKey(payload.import as ClassroomImportPayload))
      ].slice(0, 8);
      saveStoredImports(storageUserId, nextImports);
      setImports(nextImports);
      setConnections((current) =>
        current.map((item) =>
          item.connectionId === connection.connectionId ? { ...item, lastSyncedAt: new Date().toISOString() } : item
        )
      );
      setVerifications((current) => ({
        ...current,
        [connection.connectionId]: {
          activeCourses: payload.import?.courses.length ?? 0,
          checkedAt: new Date().toISOString(),
          connectionId: connection.connectionId,
          courseworkReadable: true,
          coursesReadable: true,
          detail: `Conexao ativa: ${payload.import?.courses.length ?? 0} turma(s) sincronizada(s) e leitura de atividades confirmada.`,
          status: "ready"
        }
      }));
      setMessage(`Sincronizei ${getAccountLabel(payload.import)}. A previa esta pronta para importar.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel sincronizar esta conta.");
    } finally {
      setWorkingId("");
    }
  }

  async function removeConnection(connection: ClassroomConnectionSummary) {
    setWorkingId(connection.connectionId);
    setMessage("");

    try {
      const token = await getSupabaseAccessToken();
      if (!token) {
        throw new Error("Entre novamente no Gavium para desconectar esta conta.");
      }

      const response = await fetchClassroomApi("/api/classroom/connections", {
        body: JSON.stringify({ connectionId: connection.connectionId }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE"
      });
      const payload = response
        ? ((await response.json().catch(() => null)) as { error?: string; removed?: boolean } | null)
        : null;

      if (!response?.ok || !payload?.removed) {
        throw new Error(payload?.error ?? "Nao foi possivel desconectar esta conta.");
      }

      const nextImports = imports.filter((item) => item.account?.id !== connection.id);
      saveStoredImports(storageUserId, nextImports);
      setImports(nextImports);
      setConnections((current) => current.filter((item) => item.connectionId !== connection.connectionId));
      setVerifications((current) => {
        const next = { ...current };
        delete next[connection.connectionId];
        return next;
      });
      setMessage(`${connection.email ?? connection.name ?? "Conta Google"} foi desconectada.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel desconectar esta conta.");
    } finally {
      setWorkingId("");
    }
  }

  async function verifyConnections(targetConnections = connections, announce = true) {
    if (!targetConnections.length) {
      return;
    }

    setVerifying(true);
    if (announce) {
      setMessage("");
    }

    try {
      const token = await getSupabaseAccessToken();
      if (!token) {
        throw new Error("Entre novamente no Gavium para verificar o Google Classroom.");
      }

      const response = await fetchClassroomApi("/api/classroom/verify", {
        cache: "no-store",
      });
      const payload = response
        ? ((await response.json().catch(() => null)) as {
            error?: string;
            verifications?: ClassroomConnectionVerification[];
          } | null)
        : null;

      if (!response?.ok || !payload?.verifications) {
        throw new Error(payload?.error ?? "Nao foi possivel verificar o Google Classroom.");
      }

      setVerifications(
        Object.fromEntries(payload.verifications.map((verification) => [verification.connectionId, verification]))
      );
      if (announce) {
        const failures = payload.verifications.filter((verification) => verification.status === "reconnect").length;
        const unavailable = payload.verifications.filter((verification) => verification.status === "unavailable").length;
        setMessage(
          failures
            ? `${failures} conta(s) precisam ser reconectadas; veja o diagnostico abaixo.`
            : unavailable
              ? "As contas continuam salvas. O Google nao respondeu agora e o Gavium tentara novamente."
              : "Conexao com o Google Classroom verificada: turmas e atividades estao acessiveis."
        );
      }
    } catch (error) {
      if (announce) {
        setMessage(error instanceof Error ? error.message : "Nao foi possivel verificar o Google Classroom.");
      }
    } finally {
      setVerifying(false);
    }
  }

  const connectionVerifications = connections.map((connection) => verifications[connection.connectionId]).filter(Boolean);
  const hasVerificationError = connectionVerifications.some((verification) => verification.status === "reconnect");
  const hasTemporaryVerificationError = connectionVerifications.some((verification) => verification.status === "unavailable");
  const allConnectionsVerified =
    connections.length > 0 &&
    connectionVerifications.length === connections.length &&
    connectionVerifications.every((verification) => verification.status === "ready");
  const oauthNeedsRepair = status?.oauthStatus === "invalid_client" || status?.oauthStatus === "redirect_mismatch";
  const connectionBadge = !status
    ? "Verificando"
    : oauthNeedsRepair
      ? "Conexao indisponivel"
      : !status.configured
        ? "Indisponivel"
          : !status.persistentConfigured
            ? "Importacao pronta"
            : !connectionsLoaded
              ? "Carregando conexoes"
              : !connections.length
            ? "Credencial pronta"
            : verifying
              ? "Verificando conexoes"
              : hasVerificationError
                ? "Reconexao necessaria"
                  : hasTemporaryVerificationError
                    ? "Conta salva"
                    : allConnectionsVerified
                  ? "Conexoes verificadas"
                  : "Sincronizacao pronta";
  const connectionBadgeTone = oauthNeedsRepair ? "coral" : !status?.configured || hasVerificationError ? "gold" : "mint";

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap aria-hidden className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-foreground">Google Classroom</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Conecte uma ou mais contas institucionais. Cada conta fica separada na previa e pode ser importada sem misturar origem.
          </p>
        </div>
        <Badge tone={connectionBadgeTone}>{connectionBadge}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Mini label="Contas" value={Math.max(connections.length, imports.length).toString()} />
        <Mini label="Turmas" value={totals.courses.toString()} />
        <Mini label="Itens com prazo" value={totals.datedCourseWork.toString()} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {status?.configured ? (
          <Button disabled={Boolean(workingId)} onClick={connectAccount}>
            <ExternalLink aria-hidden className="h-4 w-4" />
            {workingId === "connect" ? "Abrindo Google..." : "Adicionar conta Classroom"}
          </Button>
        ) : (
          <Button disabled>
            <AlertCircle aria-hidden className="h-4 w-4" />
            Conexao indisponivel
          </Button>
        )}

        {connections.length ? (
          <Button disabled={verifying || Boolean(workingId)} onClick={() => void verifyConnections()} variant="secondary">
            <ShieldCheck aria-hidden className={`h-4 w-4 ${verifying ? "animate-pulse" : ""}`} />
            {verifying ? "Verificando..." : "Verificar conexoes"}
          </Button>
        ) : null}

        <Button disabled={imports.length < 2 || totals.datedCourseWork === 0} onClick={importAll} variant="secondary">
          <UploadCloud aria-hidden className="h-4 w-4" />
          Importar todas
        </Button>
      </div>

      {!status?.configured ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          {getClassroomUnavailableMessage(status?.oauthStatus)}
        </div>
      ) : null}

      {status?.configured && connectionsLoaded && !connections.length ? (
        <div className="mt-4 border-l-2 border-gold bg-gold/5 px-3 py-3 text-sm leading-6 text-slate-700">
          <p>
            Enquanto o OAuth estiver em teste, a conta escolhida no Google precisa estar em <strong>Usuarios de teste</strong>.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <a
              className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-slate-300 underline-offset-4"
              href={GOOGLE_OAUTH_AUDIENCE_URL}
              rel="noreferrer"
              target="_blank"
            >
              Autorizar conta de teste
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
            <a
              className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-slate-300 underline-offset-4"
              href={GOOGLE_OAUTH_BRANDING_URL}
              rel="noreferrer"
              target="_blank"
            >
              Corrigir nome exibido
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : null}

      {connections.length ? (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-foreground">Contas conectadas</h3>
          <div className="mt-2 divide-y divide-line rounded-lg border border-line">
            {connections.map((connection) => (
              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between" key={connection.connectionId}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{connection.name ?? connection.email ?? "Conta Google"}</p>
                  <p className="truncate text-xs text-slate-500">
                    {connection.email ?? "Email nao informado"}
                    {connection.lastSyncedAt ? ` - sincronizada ${formatSyncDate(connection.lastSyncedAt)}` : " - ainda nao sincronizada"}
                  </p>
                  {verifications[connection.connectionId] ? (
                    <p
                      className={`mt-1 text-xs ${
                        verifications[connection.connectionId].status === "ready"
                          ? "text-mint"
                          : verifications[connection.connectionId].status === "reconnect"
                            ? "text-coral"
                            : "text-gold"
                      }`}
                    >
                      {verifications[connection.connectionId].detail}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    disabled={verifying || Boolean(workingId)}
                    onClick={() => syncConnection(connection)}
                    size="sm"
                    variant="secondary"
                  >
                    <RefreshCw aria-hidden className={`h-4 w-4 ${workingId === connection.connectionId ? "animate-spin" : ""}`} />
                    Sincronizar
                  </Button>
                  <Button
                    aria-label={`Desconectar ${connection.email ?? connection.name ?? "conta Google"}`}
                    className="text-coral hover:bg-red-50 hover:text-red-700"
                    disabled={verifying || Boolean(workingId)}
                    onClick={() => removeConnection(connection)}
                    size="icon"
                    title="Desconectar conta"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {imports.length ? (
        <div className="mt-4 space-y-3">
          {imports.map((item) => {
            const accountTotals = getImportTotals(item);

            return (
              <div className="rounded-lg border border-line p-3" key={getImportKey(item)}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{getAccountLabel(item)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {accountTotals.courses} turma(s), {accountTotals.courseWork} item(ns), {accountTotals.datedCourseWork} com prazo
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button disabled={accountTotals.datedCourseWork === 0} onClick={() => importOne(item)} size="sm" variant="secondary">
                      Importar
                    </Button>
                    <Button aria-label="Remover previa" onClick={() => clearImport(item)} size="icon" variant="ghost">
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {item.courses.slice(0, 4).map((courseItem) => (
                    <div className="rounded-lg border border-line bg-slate-50 p-3" key={courseItem.course.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{courseItem.course.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {courseItem.course.section || courseItem.course.room || "Sem secao"} - {courseItem.courseWork.length} item(ns)
                          </p>
                        </div>
                        <Badge tone={courseItem.courseWork.some((work) => toDateKeyFromClassroomDueDate(work.dueDate)) ? "sky" : "neutral"}>
                          {courseItem.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length} com prazo
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {item.courses.length > 4 ? (
                    <p className="text-xs text-slate-500">Mais {item.courses.length - 4} turma(s) dessa conta entram na importacao.</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-line p-3 text-sm text-slate-500">
          <RefreshCw aria-hidden className="h-4 w-4" />
          Nenhuma conta importada ainda.
        </div>
      )}

      {message ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
          {message.startsWith("Importei") ? <CheckCircle2 aria-hidden className="h-4 w-4 text-mint" /> : null}
          {message}
        </p>
      ) : null}
    </section>
  );
}

async function fetchClassroomApi(input: string, init: RequestInit = {}) {
  let token = await getSupabaseAccessToken();
  if (!token) {
    return null;
  }

  const send = (accessToken: string) =>
    fetch(input, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        Authorization: `Bearer ${accessToken}`
      }
    });

  let response = await send(token);
  if (response.status === 401) {
    token = await getSupabaseAccessToken({ forceRefresh: true });
    if (token) {
      response = await send(token);
    }
  }

  return response;
}

function formatSyncDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recentemente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function readStoredImports(userId: string) {
  const imports = parseImports(window.localStorage.getItem(getImportsStorageKey(userId)));
  const legacyImport = parseImport(window.localStorage.getItem(CLASSROOM_IMPORT_STORAGE_KEY));
  const legacyImports = parseImports(window.localStorage.getItem(CLASSROOM_IMPORTS_STORAGE_KEY));
  const knownImports = mergeImports(imports, legacyImports);

  if (!legacyImport) {
    return knownImports;
  }

  return mergeImports([legacyImport], knownImports).slice(0, 8);
}

function saveStoredImports(userId: string, imports: ClassroomImportPayload[]) {
  window.localStorage.setItem(getImportsStorageKey(userId), JSON.stringify(imports));
  window.localStorage.removeItem(getImportStorageKey(userId));
  window.localStorage.removeItem(CLASSROOM_IMPORT_STORAGE_KEY);
  window.localStorage.removeItem(CLASSROOM_IMPORTS_STORAGE_KEY);
}

function mergeImports(first: ClassroomImportPayload[], second: ClassroomImportPayload[]) {
  return [...first, ...second].reduce<ClassroomImportPayload[]>((result, item) => {
    if (!result.some((existing) => getImportKey(existing) === getImportKey(item))) {
      result.push(item);
    }

    return result;
  }, []);
}

function getImportStorageKey(userId: string) {
  return `${CLASSROOM_IMPORT_STORAGE_KEY}:${userId}`;
}

function getImportsStorageKey(userId: string) {
  return `${CLASSROOM_IMPORTS_STORAGE_KEY}:${userId}`;
}

function parseImports(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as ClassroomImportPayload[];
    return Array.isArray(parsed) ? parsed.filter(isImportPayload) : [];
  } catch {
    return [];
  }
}

function parseImport(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as ClassroomImportPayload;
    return isImportPayload(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isImportPayload(value: ClassroomImportPayload) {
  return Boolean(value && Array.isArray(value.courses) && value.fetchedAt);
}

function mergeClassroomPayload(data: RoutineData, payload: ClassroomImportPayload) {
  const nextSubjects = [...data.subjects];
  const summary: ImportResult = { activities: 0, resources: 0, skipped: 0, subjects: 0 };

  payload.courses.forEach((item, index) => {
    const marker = getCourseMarker(item.course, payload.account);
    const legacyMarker = `Google Classroom: ${item.course.id}`;
    const existingIndex = nextSubjects.findIndex(
      (subject) =>
        subject.observations?.includes(marker) ||
        subject.observations?.includes(legacyMarker) ||
        (!payload.account && normalizeName(subject.name) === normalizeName(item.course.name))
    );
    const existingSubject = existingIndex >= 0 ? nextSubjects[existingIndex] : undefined;
    const subjectId = existingSubject?.id ?? createId("classroom-subject");
    const activities = [...(existingSubject?.activities ?? [])];
    const resources = [...(existingSubject?.resources ?? [])];
    const courseResource = buildResourceFromCourse(item.course, subjectId, payload.account, resources);

    if (courseResource) {
      resources.unshift(courseResource);
      summary.resources += 1;
    }

    item.courseWork.forEach((work) => {
      const activity = buildActivityFromCourseWork(work, subjectId, payload.account, activities);
      if (activity) {
        activities.unshift(activity);
        summary.activities += 1;
        return;
      }

      const resource = buildResourceFromCourseWork(work, subjectId, payload.account, resources);
      if (resource) {
        resources.unshift(resource);
        summary.resources += 1;
      } else {
        summary.skipped += 1;
      }
    });

    if (existingSubject) {
      nextSubjects[existingIndex] = {
        ...existingSubject,
        code: existingSubject.code ?? item.course.section,
        observations: mergeNotes(existingSubject.observations, buildCourseNotes(item.course, payload.account)),
        room: existingSubject.room ?? item.course.room,
        activities,
        resources
      };
      return;
    }

    nextSubjects.unshift({
      id: subjectId,
      name: item.course.name,
      code: item.course.section,
      room: item.course.room,
      semester: data.appPreference.defaultSemester,
      workloadHours: data.appPreference.defaultWorkloadHours,
      color: subjectColors[index % subjectColors.length],
      status: "active",
      rules: createUfamRules({ classesPerMeeting: data.appPreference.defaultClassesQuantity }),
      schedules: [],
      attendance: [],
      grades: [],
      activities,
      resources,
      observations: buildCourseNotes(item.course, payload.account)
    });
    summary.subjects += 1;
  });

  return {
    data: {
      ...data,
      userId: data.userId || LOCAL_USER_ID,
      subjects: nextSubjects
    },
    summary
  };
}

function buildResourceFromCourse(
  course: ClassroomCourse,
  subjectId: string,
  account: ClassroomAccount | undefined,
  currentResources: AcademicResource[]
) {
  if (!course.alternateLink) {
    return undefined;
  }

  const marker = getCourseMarker(course, account);
  if (hasResourceMarker(currentResources, marker) || currentResources.some((resource) => resource.url === course.alternateLink)) {
    return undefined;
  }

  return {
    createdAt: new Date().toISOString(),
    id: createId("classroom-resource"),
    notes: buildCourseNotes(course, account),
    subjectId,
    title: `Classroom - ${course.name}`,
    type: "classroom",
    url: course.alternateLink
  } satisfies AcademicResource;
}

function buildActivityFromCourseWork(
  work: ClassroomCourseWork,
  subjectId: string,
  account: ClassroomAccount | undefined,
  currentActivities: AcademicActivity[]
) {
  const dueDate = toDateKeyFromClassroomDueDate(work.dueDate);
  if (!dueDate) {
    return undefined;
  }

  const marker = getCourseWorkMarker(work, account);
  const legacyMarker = `Google Classroom: ${work.courseId}/${work.id}`;
  const duplicated = currentActivities.some(
    (activity) =>
      activity.notes?.includes(marker) ||
      activity.notes?.includes(legacyMarker) ||
      (normalizeName(activity.title) === normalizeName(work.title) && activity.dueDate === dueDate)
  );

  if (duplicated) {
    return undefined;
  }

  return {
    id: createId("classroom-activity"),
    subjectId,
    title: work.title,
    dueDate,
    time: toTimeFromClassroomDueTime(work.dueTime) ?? "23:59",
    type: mapClassroomCourseWorkType(work.workType),
    status: "not_started",
    maxScore: work.maxPoints,
    description: work.description,
    notes: [marker, work.alternateLink ? `Link: ${work.alternateLink}` : ""].filter(Boolean).join("\n")
  } satisfies AcademicActivity;
}

function buildResourceFromCourseWork(
  work: ClassroomCourseWork,
  subjectId: string,
  account: ClassroomAccount | undefined,
  currentResources: AcademicResource[]
) {
  if (!work.alternateLink && !work.description) {
    return undefined;
  }

  const marker = getCourseWorkMarker(work, account);
  const legacyMarker = `Google Classroom: ${work.courseId}/${work.id}`;
  const duplicated = hasResourceMarker(currentResources, marker) || hasResourceMarker(currentResources, legacyMarker);

  if (duplicated) {
    return undefined;
  }

  return {
    createdAt: new Date().toISOString(),
    id: createId("classroom-resource"),
    notes: [marker, work.description].filter(Boolean).join("\n"),
    subjectId,
    title: work.title,
    type: work.workType === "MATERIAL" ? "document" : "classroom",
    url: work.alternateLink
  } satisfies AcademicResource;
}

function buildCourseNotes(course: ClassroomCourse, account?: ClassroomAccount) {
  return [
    getCourseMarker(course, account),
    account?.email ? `Conta: ${account.email}` : "",
    course.descriptionHeading ? `Descricao: ${course.descriptionHeading}` : "",
    course.alternateLink ? `Link: ${course.alternateLink}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function getCourseMarker(course: ClassroomCourse, account?: ClassroomAccount) {
  return `Google Classroom${account?.email ? ` (${account.email})` : ""}: ${course.id}`;
}

function getCourseWorkMarker(work: ClassroomCourseWork, account?: ClassroomAccount) {
  return `Google Classroom${account?.email ? ` (${account.email})` : ""}: ${work.courseId}/${work.id}`;
}

function getAccountLabel(payload: ClassroomImportPayload) {
  const account = payload.account;
  if (!account) {
    return "Conta Google";
  }

  if (account.name && account.email) {
    return `${account.name} - ${account.email}`;
  }

  return account.email ?? account.name ?? "Conta Google";
}

function getImportKey(payload: ClassroomImportPayload) {
  return payload.account?.id ?? payload.account?.email ?? payload.importId ?? payload.fetchedAt;
}

function getImportTotals(payload: ClassroomImportPayload) {
  const courses = payload.courses.length;
  const courseWork = payload.courses.reduce((total, item) => total + item.courseWork.length, 0);
  const datedCourseWork = payload.courses.reduce(
    (total, item) => total + item.courseWork.filter((work) => toDateKeyFromClassroomDueDate(work.dueDate)).length,
    0
  );

  return { courses, courseWork, datedCourseWork };
}

function formatImportMessage(summary: ImportResult, accountLabel: string) {
  return `Importei ${summary.subjects} disciplina(s), ${summary.activities} atividade(s) e ${summary.resources} material(is) de ${accountLabel}. ${summary.skipped} item(ns) ja existiam ou nao tinham dado util.`;
}

function mergeNotes(current: string | undefined, next: string) {
  if (!current) {
    return next;
  }

  const nextMarker = next.split("\n")[0];
  if (current.includes(next) || current.includes(nextMarker)) {
    return current;
  }

  return `${current}\n${next}`;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function hasResourceMarker(resources: AcademicResource[], marker: string) {
  return resources.some((resource) => resource.notes?.includes(marker));
}

function getClassroomUnavailableMessage(status: ClassroomStatus["oauthStatus"]) {
  if (status === "invalid_client") {
    return "A credencial antiga do Google nao existe mais. A conexao precisa ser atualizada antes de adicionar uma conta.";
  }
  if (status === "redirect_mismatch") {
    return "O endereco de retorno do Google precisa ser corrigido antes de adicionar uma conta.";
  }

  return "A conexao com o Google Classroom ainda nao esta disponivel. Tente novamente depois.";
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
