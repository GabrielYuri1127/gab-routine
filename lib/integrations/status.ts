import { getClassroomRedirectUri, isClassroomConfigured } from "../classroom/google-classroom";
import { getConfiguredAIProvider } from "../ai/provider";
import { getPushMissingConfig } from "../../services/notifications/push-service";

export type IntegrationState = "ready" | "configured" | "needs_setup" | "optional" | "future";
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
  const configuredAIProvider = getConfiguredAIProvider(env);
  const aiConfigured = configuredAIProvider.name !== "none";
  const aiDescription =
    configuredAIProvider.name === "auto"
      ? "Gemini com contingencia automatica na OpenAI"
      : configuredAIProvider.name === "gemini"
        ? "Gemini"
        : "OpenAI";
  const classroomOAuthReady = isClassroomConfigured(env);
  const supabaseReady = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  const supabaseServerReady = supabaseReady && Boolean(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY);
  const classroomReady = classroomOAuthReady && supabaseServerReady;
  const classroomMissing = [
    ...(!classroomOAuthReady ? ["GOOGLE_CLASSROOM_CLIENT_ID", "GOOGLE_CLASSROOM_CLIENT_SECRET"] : []),
    ...(!supabaseReady ? ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] : []),
    ...(!supabaseServerReady ? ["SUPABASE_SECRET_KEY"] : [])
  ];
  const vercelReady = Boolean(env.VERCEL || env.VERCEL_URL);
  const pushMissing = getPushMissingConfig(env);
  const pushReady = pushMissing.length === 0;

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
        detail: aiConfigured
          ? `Credenciais de IA cadastradas para ${aiDescription}. A disponibilidade e testada de verdade ao abrir o Assistente.`
          : "A IA online precisa ser configurada para o Assistente responder.",
        id: "ai",
        missing: aiConfigured ? [] : ["AI_PROVIDER=auto", "OPENAI_API_KEY ou GEMINI_API_KEY"],
        nextStep: aiConfigured
          ? "Abrir /assistente para executar o teste real do provedor."
          : "Adicionar variaveis de IA na Vercel e fazer novo deploy.",
        state: aiConfigured ? "configured" : "needs_setup",
        title: "IA online"
      },
      {
        category: "agora",
        detail: classroomReady
          ? "OAuth e armazenamento seguro estao configurados para varias contas por usuario."
          : classroomOAuthReady
            ? "OAuth configurado; falta o servidor Supabase para manter e ressincronizar as contas."
            : `Redirect esperado: ${getClassroomRedirectUri(requestUrl, env)}`,
        id: "classroom",
        missing: classroomReady ? [] : [...new Set(classroomMissing)],
        nextStep: classroomReady
          ? "Conectar, sincronizar e testar mais de uma conta em /configuracoes."
          : classroomOAuthReady
            ? "Aplicar o schema e configurar a chave secreta do Supabase."
            : "Criar OAuth Client no Google Cloud e adicionar as variaveis.",
        state: classroomReady ? "ready" : "needs_setup",
        title: "Google Classroom"
      },
      {
        category: "agora",
        detail: supabaseReady
          ? "Login e snapshot em nuvem por usuario podem ser usados."
          : "Sem Supabase, cada navegador fica isolado e nao serve bem para compartilhar com varias pessoas.",
        id: "supabase",
        missing: supabaseReady ? [] : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        nextStep: supabaseReady ? "Testar login em /login com duas contas diferentes." : "Criar projeto Supabase gratuito, aplicar o schema e configurar as variaveis na Vercel.",
        state: supabaseReady ? "ready" : "needs_setup",
        title: "Supabase"
      },
      {
        category: "agora",
        detail: pushReady ? "Inscricao de aparelhos, teste e dispatch seguro de lembretes estao configurados." : "O app ja tem painel e rotas de push, mas faltam variaveis para enviar no Android.",
        id: "push",
        missing: pushReady ? [] : pushMissing,
        nextStep: pushReady ? "Entrar pelo Android, ativar e enviar um teste." : "Gerar VAPID, configurar Supabase service role e CRON_SECRET.",
        state: pushReady ? "ready" : "needs_setup",
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
