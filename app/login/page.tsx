import { LoginCard } from "@/features/auth/components/login-card";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Conta</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Login e nuvem</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use localmente agora e conecte o Supabase free quando quiser sincronizar em mais aparelhos.
        </p>
      </header>
      <LoginCard />
    </div>
  );
}
