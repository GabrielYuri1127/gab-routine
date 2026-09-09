import { NextResponse } from "next/server";

import { buildClassroomAuthUrl, isClassroomConfigured } from "@/lib/classroom/google-classroom";

const CLASSROOM_STATE_COOKIE = "gab_classroom_oauth_state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isClassroomConfigured()) {
    return NextResponse.redirect(new URL("/configuracoes?classroom=missing", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildClassroomAuthUrl(state, request.url));

  response.cookies.set(CLASSROOM_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:"
  });

  return response;
}
