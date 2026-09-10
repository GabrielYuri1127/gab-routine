import { getClassroomRedirectUri, isClassroomConfigured } from "../classroom/google-classroom";

export type IntegrationState = "ready" | "needs_setup" | "optional" | "future";
export type IntegrationCategory = "agora" | "futuro";

export interface IntegrationStatusItem {
  category: IntegrationCategory;
  detail: string;
  id: string;
  missing: string[];
  nextStep: string;
  state: IntegrationState;
  title: string;
}

export interface IntegrationStatusReport {
  generatedAt: string;
  items: IntegrationStatusItem[];
}

type IntegrationEnv = Record<string, string | undefined>;

export function buildIntegrationStatus(env: IntegrationEnv = process.env, requestUrl = "http://localhost:3000") {
  const aiProvider = (env.AI_PROVIDER ?? "none").toLowerCase();
  const aiReady = aiProvider === "openai" && Boolean(env.AI_API_KEY);
  const classroomReady = isClassroomConfigured(env);
  const supabaseReady = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const vercelReady = Boolean(env.VERCEL || env.VERCEL_URL);
  const pushReady = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

  return {
    generatedAt: new Date().toISOString(),
    items: [
      {
        category: "agora",
        detail: "Codigo, build, PWA e repositorio ja estao preparados para compartilhar.",
        id: "app",
        missing: [],
        nextStep: "Abrir a URL publicada e conferir o app no celular.",
        state: "ready",
        title: "App base"
      },
      {
        category: "agora",
        detail: vercelReady ? "O ambiente atual esta rodando na Vercel." : "Localmente nao da para confirmar o deploy de producao.",
        id: "vercel",
        missing: vercelReady ? [] : ["Confirmar deploy na Vercel"],
        nextStep: vercelReady ? "Conferir o ultimo deploy no painel." : "Importar o GitHub na Vercel ou abrir o deploy existente.",
        state: vercelReady ? "ready" : "needs_setup",
        title: "Deploy Vercel"
      },
      {
        category: "agora",
        detail: aiReady ? `IA online ativa com ${env.AI_MODEL || "modelo padrao"}.` : "O app continua respondendo com IA local por regras.",
        id: "ai",
        missing: aiReady ? [] : ["AI_PROVIDER=openai", "AI_API_KEY"],
        nextStep: aiReady ? "Testar uma pergunta em /assistente." : "Adicionar variaveis de IA na Vercel e fazer novo deploy.",
        state: aiReady ? "ready" : "needs_setup",
        title: "IA online"
      },
      {
        category: "agora",
        detail: classroomReady
          ? "Chaves do Classroom configuradas para conexao OAuth."
          : `Redirect esperado: ${getClassroomRedirectUri(requestUrl, env)}`,
        id: "classroom",
        missing: classroomReady ? [] : ["GOOGLE_CLASSROOM_CLIENT_ID", "GOOGLE_CLASSROOM_CLIENT_SECRET"],
        nextStep: classroomReady ? "Conectar uma ou mais contas em /configuracoes." : "Criar OAuth Client no Google Cloud e adicionar as variaveis.",
        state: classroomReady ? "ready" : "needs_setup",
        title: "Google Classroom"
      },
      {
        category: "agora",
        detail: supabaseReady
          ? "Login e snapshot em nuvem por usuario podem ser usados."
          : "Sem Supabase, cada navegador fica isolado e nao serve bem para compartilhar com varias pessoas.",
        id: "supabase",
        missing: supabaseReady ? [] : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        nextStep: supabaseReady ? "Testar login em /login com duas contas diferentes." : "Criar projeto Supabase gratuito, aplicar o schema e configurar as variaveis na Vercel.",
        state: supabaseReady ? "ready" : "needs_setup",
        title: "Supabase"
      },
      {
        category: "futuro",
        detail: pushReady ? "Chaves VAPID existem, mas ainda falta completar envio real no backend." : "A central de lembretes ja existe dentro do app.",
        id: "push",
        missing: pushReady ? [] : ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
        nextStep: "Implementar subscriptions e envio de push na proxima fase.",
        state: "future",
        title: "Notificacoes push"
      },
      {
        category: "futuro",
        detail: "PWA ja instala no Android; widget real exige wrapper nativo.",
        id: "android-widget",
        missing: [],
        nextStep: "Criar wrapper Android com AppWidget quando o app estiver validado com usuarios.",
        state: "future",
        title: "Widget Android real"
      },
      {
        category: "futuro",
        detail: "A parte de venda foi deixada fora do escopo atual de proposito.",
        id: "commercial",
        missing: [],
        nextStep: "Voltar nisso depois de validar o uso com amigos e familiares.",
        state: "future",
        title: "Comercializacao"
      }
    ]
  } satisfies IntegrationStatusReport;
}
