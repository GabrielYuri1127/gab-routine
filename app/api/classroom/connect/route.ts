import { NextResponse } from "next/server";

import { buildClassroomAuthUrl, isClassroomConfigured } from "@/lib/classroom/google-classroom";
import { createClassroomOAuthState } from "@/lib/classroom/oauth-state";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";

const CLASSROOM_STATE_COOKIE = "gab_classroom_oauth_state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function POST(request: Request) {
  if (!isClassroomConfigured()) {
    return NextResponse.json({ error: "Google Classroom ainda nao esta configurado." }, { status: 503 });
  }

  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Entre na sua conta antes de conectar o Classroom." }, { status: 401 });
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
