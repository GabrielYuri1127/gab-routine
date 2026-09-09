import { NextRequest, NextResponse } from "next/server";

import { exchangeClassroomCode, fetchClassroomImport } from "@/lib/classroom/google-classroom";

const CLASSROOM_IMPORT_STORAGE_KEY = "gab-routine:classroom:last-import";
const CLASSROOM_STATE_COOKIE = "gab_classroom_oauth_state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(CLASSROOM_STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return redirectToSettings(request.url, "classroom=invalid-state");
  }

  try {
    const token = await exchangeClassroomCode(code, request.url);
    const classroomImport = await fetchClassroomImport(token.access_token);
    const response = new NextResponse(renderImportBridge(classroomImport), {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
    response.cookies.delete(CLASSROOM_STATE_COOKIE);
    return response;
  } catch {
    return redirectToSettings(request.url, "classroom=error");
  }
}

function redirectToSettings(requestUrl: string, query: string) {
  const response = NextResponse.redirect(new URL(`/configuracoes?${query}`, requestUrl));
  response.cookies.delete(CLASSROOM_STATE_COOKIE);
  return response;
}

function renderImportBridge(payload: unknown) {
  const serializedPayload = JSON.stringify(payload).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Google Classroom conectado</title>
  </head>
  <body>
    <script>
      localStorage.setItem(${JSON.stringify(CLASSROOM_IMPORT_STORAGE_KEY)}, ${JSON.stringify(serializedPayload)});
      window.location.replace("/configuracoes?classroom=import-ready");
    </script>
    <p>Google Classroom conectado. Voltando para as configuracoes...</p>
  </body>
</html>`;
}
