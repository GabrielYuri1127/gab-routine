"use client";

import { Lock, LogIn, LogOut, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export function LoginCard() {
  const configured = isSupabaseConfigured();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!configured) {
      return;
    }

    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setCurrentEmail(data.user?.email ?? null))
      .catch(() => setCurrentEmail(null));
  }, [configured]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const client = createSupabaseBrowserClient();
      const result =
        mode === "sign-in"
          ? await client.auth.signInWithPassword({ email, password })
          : await client.auth.signUp({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setCurrentEmail(result.data.user?.email ?? email);
      setMessage(mode === "sign-up" ? "Cadastro criado. Confira o email se o Supabase pedir confirmacao." : "Login feito.");
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
          O app funciona no Android com armazenamento local. Para ativar login e nuvem, preencha
          `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente da Vercel ou no arquivo `.env.local`.
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
        <h2 className="text-lg font-semibold text-ink">{currentEmail}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A sessao Supabase esta ativa. A base local continua disponivel para uso offline.
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
    <form className="rounded-lg border border-line bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-3 flex items-center justify-between gap-3">
        {mode === "sign-in" ? (
          <LogIn aria-hidden className="h-5 w-5 text-mint" />
        ) : (
          <UserPlus aria-hidden className="h-5 w-5 text-mint" />
        )}
        <Badge tone="mint">Supabase</Badge>
      </div>
      <h2 className="text-lg font-semibold text-ink">{mode === "sign-in" ? "Entrar" : "Criar conta"}</h2>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Senha</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-mint"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
      </div>

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
