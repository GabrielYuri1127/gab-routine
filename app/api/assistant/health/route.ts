import { NextResponse } from "next/server";

import { checkAIHealth, getAIConfigurationStatus, type AIHealthStatus } from "@/lib/ai/health";
import { getConfiguredAIProvider } from "@/lib/ai/provider";
import { getSupabaseServerConfig, getSupabaseUserFromRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = getConfiguredAIProvider().name !== "none";
  if (!configured) {
    return NextResponse.json(getAIConfigurationStatus());
  }

  const supabaseConfigured = Boolean(getSupabaseServerConfig());
  const user = supabaseConfigured ? await getSupabaseUserFromRequest(request) : null;
  if (supabaseConfigured && !user) {
    const status: AIHealthStatus = {
      available: false,
      checkedAt: new Date().toISOString(),
      code: "auth_required",
      configured: true,
      detail: "Entre na sua conta para ativar a IA online com seguranca."
    };
    return NextResponse.json(status, { status: 401 });
  }

  const shouldProbe = new URL(request.url).searchParams.get("probe") === "1";
  return NextResponse.json(shouldProbe ? await checkAIHealth() : getAIConfigurationStatus());
}
