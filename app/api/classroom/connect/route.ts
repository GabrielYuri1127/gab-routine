import { NextResponse } from "next/server";

import { buildClassroomAuthUrl, isClassroomConfigured } from "@/lib/classroom/google-classroom";
import { probeClassroomOAuthClient } from "@/lib/classroom/oauth-diagnostics";
import { createClassroomOAuthState } from "@/lib/classroom/oauth-state";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";

const CLASSROOM_STATE_COOKIE = "gab_classroom_oauth_state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function POST(request: Request) {
  if (!isClassroomConfigured()) {
    return NextResponse.json({ error: "A conexao com o Google Classroom ainda nao esta disponivel." }, { status: 503 });
  }

  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta antes de conectar o Classroom." }, { status: 401 });
  }

  const oauthStatus = await probeClassroomOAuthClient(request.url);
  if (oauthStatus === "invalid_client") {
    return NextResponse.json(
      { error: "A credencial do Google Classroom precisa ser atualizada antes de conectar." },
      { status: 503 }
    );
  }
  if (oauthStatus === "redirect_mismatch") {
    return NextResponse.json(
      { error: "O retorno do Google Classroom precisa ser corrigido antes de conectar." },
      { status: 503 }
    );
  }

  const state = createClassroomOAuthState(user.id);
  const response = NextResponse.json({ url: buildClassroomAuthUrl(state, request.url).toString() });
  response.cookies.set(CLASSROOM_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:"
  });

  return response;
}
