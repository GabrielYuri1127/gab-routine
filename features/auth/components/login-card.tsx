"use client";

import { Lock, LogIn, LogOut, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRoutineData } from "@/features/data/routine-store";
import {
  createSupabaseBrowserClient,
  getRememberLoginPreference,
  isSupabaseConfigured,
  setRememberLoginPreference
} from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

interface SignUpProfile {
  assistantStyle: string;
  birthDate: string;
  contextDetails: string;
  contexts: string[];
  courseOrArea: string;
  discoverySource: string;
  fullName: string;
  gender: string;
  primaryContext: string;
  productivityGoal: string;
}

const defaultSignUpProfile: SignUpProfile = {
  assistantStyle: "balanced",
  birthDate: "",
  contextDetails: "",
  contexts: ["produtividade"],
  courseOrArea: "",
  discoverySource: "",
  fullName: "",
  gender: "",
  primaryContext: "produtividade",
  productivityGoal: ""
};

const inputClass = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint";
const textareaClass =
  "mt-1 min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-mint";

const contextOptions = [
  { label: "Produtividade", value: "produtividade" },
  { label: "Rotina pessoal", value: "rotina_pessoal" },
  { label: "Escola", value: "escola" },
  { label: "Faculdade", value: "faculdade" },
  { label: "Trabalho", value: "trabalho" },
  { label: "Projetos", value: "projetos" }
];

export function LoginCard() {
  const { cloud } = useRoutineData();
  const configured = isSupabaseConfigured();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<SignUpProfile>(defaultSignUpProfile);
  const [message, setMessage] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRememberLogin(getRememberLoginPreference());

    if (!configured) {
      return;
    }

    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        setCurrentEmail(data.user?.email ?? null);
        setCurrentName(readProfileName(data.user?.user_metadata));
      })
      .catch(() => {
        setCurrentEmail(null);
        setCurrentName(null);
      });
  }, [configured]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "sign-up" && profile.contexts.length === 0) {
        setMessage("Escolha pelo menos uma area de uso do Gavium.");
        return;
      }

      setRememberLoginPreference(rememberLogin);
      const client = createSupabaseBrowserClient();
      const result =
        mode === "sign-in"
          ? await client.auth.signInWithPassword({ email, password })
          : await client.auth.signUp({
              email,
              password,
              options: {
                data: buildSignUpMetadata(profile)
              }
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setCurrentEmail(result.data.user?.email ?? email);
      setCurrentName(readProfileName(result.data.user?.user_metadata) ?? profile.fullName.trim() ?? null);
      setMessage(
        mode === "sign-up"
          ? `Cadastro criado com perfil inicial salvo. ${getLoginPersistenceMessage(rememberLogin)}`
          : `Login feito. ${getLoginPersistenceMessage(rememberLogin)}`
      );
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
      setCurrentEmail(null);
      setCurrentName(null);
      setMessage("Sessao encerrada.");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Lock aria-hidden className="h-5 w-5 text-slate-500" />
          <Badge tone="gold">modo local</Badge>
        </div>
        <h2 className="text-lg font-semibold text-ink">Supabase ainda nao configurado</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          O app funciona no Android com armazenamento local, mas para mais de uma pessoa usar com dados separados e seguro preencher
          `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente da Vercel ou no arquivo `.env.local`.
        </p>
      </div>
    );
  }

  if (currentEmail) {
    return (
      <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <LogIn aria-hidden className="h-5 w-5 text-mint" />
          <Badge tone="mint">conectado</Badge>
        </div>
        <h2 className="text-lg font-semibold text-ink">{currentName ? `${currentName} conectado` : currentEmail}</h2>
        {currentName ? <p className="mt-1 text-sm text-slate-500">{currentEmail}</p> : null}
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Esta conta tem um espaco proprio no Gavium. Disciplinas, faltas, notas, tarefas, lembretes e Classroom ficam separados dos outros usuarios.
        </p>
        <p className="mt-2 text-xs font-medium text-slate-500">{getSyncLabel(cloud.status)}</p>
        <p className="mt-2 text-xs text-slate-500">
          {getRememberLoginPreference() ? "Login salvo neste dispositivo." : "Sessao temporaria neste navegador."}
        </p>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        <Button className="mt-4 w-full" disabled={loading} onClick={signOut} variant="secondary">
          <LogOut aria-hidden className="h-4 w-4" />
          Sair
        </Button>
      </div>
    );
  }

  return (
    <form className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5" onSubmit={handleSubmit}>
      <div className="mb-3 flex items-center justify-between gap-3">
        {mode === "sign-in" ? (
          <LogIn aria-hidden className="h-5 w-5 text-mint" />
        ) : (
          <UserPlus aria-hidden className="h-5 w-5 text-mint" />
        )}
        <Badge tone="mint">Supabase</Badge>
      </div>
      <h2 className="text-lg font-semibold text-ink">{mode === "sign-in" ? "Entrar" : "Criar conta"}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Cada pessoa deve usar o proprio email. Assim os dados ficam isolados e sincronizados pela conta dela.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
          <input className={inputClass} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Senha</span>
          <input className={inputClass} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
      </div>

      <label className="mt-3 flex items-start gap-3 rounded-lg border border-line bg-slate-50 px-3 py-3 text-sm text-ink">
        <input
          checked={rememberLogin}
          className="mt-1"
          onChange={(event) => setRememberLogin(event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block font-medium">Manter login neste dispositivo</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Desmarque em computador compartilhado. Marcado, o Gavium abre sua conta automaticamente neste aparelho.
          </span>
        </span>
      </label>

      {mode === "sign-up" ? <SignUpProfileFields onChange={setProfile} profile={profile} /> : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <Button className="mt-4 w-full" disabled={loading} type="submit">
        {mode === "sign-in" ? <LogIn aria-hidden className="h-4 w-4" /> : <UserPlus aria-hidden className="h-4 w-4" />}
        {mode === "sign-in" ? "Entrar" : "Cadastrar"}
      </Button>

      <button
        className="mt-3 w-full text-center text-sm font-medium text-mint"
        onClick={() => {
          setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
          setMessage("");
        }}
        type="button"
      >
        {mode === "sign-in" ? "Criar uma conta" : "Ja tenho conta"}
      </button>
    </form>
  );
}

function SignUpProfileFields({
  onChange,
  profile
}: {
  onChange: React.Dispatch<React.SetStateAction<SignUpProfile>>;
  profile: SignUpProfile;
}) {
  function updateField(field: keyof SignUpProfile, value: string) {
    onChange((current) => ({ ...current, [field]: value }));
  }

  function toggleContext(value: string) {
    onChange((current) => {
      const contexts = current.contexts.includes(value)
        ? current.contexts.filter((context) => context !== value)
        : [...current.contexts, value];
      return { ...current, contexts };
    });
  }

  return (
    <div className="mt-5 space-y-4 rounded-lg border border-dashed border-line bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Perfil inicial</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Esses dados ajudam o Gavium a separar escola, faculdade, trabalho e rotina pessoal para personalizar lembretes e IA.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Nome</span>
          <input
            className={inputClass}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Ex.: Gabriel Yuri"
            required
            value={profile.fullName}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Uso principal</span>
          <select className={inputClass} onChange={(event) => updateField("primaryContext", event.target.value)} value={profile.primaryContext}>
            <option value="produtividade">Produtividade geral</option>
            <option value="rotina_pessoal">Rotina pessoal</option>
            <option value="trabalho">Trabalho</option>
            <option value="faculdade">Faculdade</option>
            <option value="escola">Escola</option>
            <option value="projetos">Projetos</option>
          </select>
        </label>
      </div>

      <div>
        <span className="text-xs font-semibold uppercase text-slate-500">Onde pretende usar</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {contextOptions.map((option) => (
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-ink" key={option.value}>
              <input checked={profile.contexts.includes(option.value)} onChange={() => toggleContext(option.value)} type="checkbox" />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Curso, serie ou area</span>
          <input
            className={inputClass}
            onChange={(event) => updateField("courseOrArea", event.target.value)}
            placeholder="Ex.: Engenharia da Computacao"
            value={profile.courseOrArea}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Como conheceu</span>
          <select className={inputClass} onChange={(event) => updateField("discoverySource", event.target.value)} value={profile.discoverySource}>
            <option value="">Selecionar</option>
            <option value="amigo_familia">Amigo ou familia</option>
            <option value="faculdade_escola">Faculdade ou escola</option>
            <option value="trabalho">Trabalho</option>
            <option value="portfolio">Portfolio do Gabriel</option>
            <option value="rede_social">Rede social</option>
            <option value="outro">Outro</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Nascimento</span>
          <input className={inputClass} onChange={(event) => updateField("birthDate", event.target.value)} type="date" value={profile.birthDate} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Genero</span>
          <select className={inputClass} onChange={(event) => updateField("gender", event.target.value)} value={profile.gender}>
            <option value="">Prefiro nao informar</option>
            <option value="homem">Homem</option>
            <option value="mulher">Mulher</option>
            <option value="nao_binario">Nao binario</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Jeito da IA</span>
          <select className={inputClass} onChange={(event) => updateField("assistantStyle", event.target.value)} value={profile.assistantStyle}>
            <option value="balanced">Equilibrada</option>
            <option value="direct">Direta</option>
            <option value="mentor">Mais orientadora</option>
            <option value="strict">Mais cobranca</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase text-slate-500">Objetivo principal</span>
        <textarea
          className={textareaClass}
          onChange={(event) => updateField("productivityGoal", event.target.value)}
          placeholder="Ex.: organizar provas, trabalhos, rotina e lembretes sem esquecer prazos."
          required
          value={profile.productivityGoal}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase text-slate-500">Detalhes extras</span>
        <textarea
          className={textareaClass}
          onChange={(event) => updateField("contextDetails", event.target.value)}
          placeholder="Ex.: usa Classroom, trabalha de tarde, faz academia, tem mais de uma conta institucional."
          value={profile.contextDetails}
        />
      </label>
    </div>
  );
}

function buildSignUpMetadata(profile: SignUpProfile) {
  return {
    assistant_style: profile.assistantStyle,
    birth_date: profile.birthDate || null,
    context_details: profile.contextDetails.trim() || null,
    contexts: profile.contexts,
    course_or_area: profile.courseOrArea.trim() || null,
    discovery_source: profile.discoverySource || null,
    full_name: profile.fullName.trim(),
    gender: profile.gender || null,
    onboarding_version: "2026-09-profile-v1",
    primary_context: profile.primaryContext,
    productivity_goal: profile.productivityGoal.trim()
  };
}

function readProfileName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const fullName = (metadata as { full_name?: unknown }).full_name;
  return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null;
}

function getLoginPersistenceMessage(rememberLogin: boolean) {
  return rememberLogin ? "Login salvo neste dispositivo." : "Sessao temporaria neste navegador.";
}

function getSyncLabel(status: string) {
  if (status === "saving") return "Salvando alteracoes na nuvem...";
  if (status === "synced") return "Dados sincronizados na nuvem.";
  if (status === "loading") return "Carregando dados da sua conta...";
  if (status === "error") return "Nuvem indisponivel agora; usando cache local desta conta.";
  return "Sessao ativa.";
}
