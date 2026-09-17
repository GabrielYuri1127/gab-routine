import { NextRequest, NextResponse } from "next/server";

import { saveClassroomConnection } from "@/lib/classroom/classroom-connections";
import { exchangeClassroomCode, fetchClassroomImport, fetchGoogleUserInfo } from "@/lib/classroom/google-classroom";
import { verifyClassroomOAuthState } from "@/lib/classroom/oauth-state";

const CLASSROOM_IMPORT_STORAGE_KEY = "gab-routine:classroom:last-import";
const CLASSROOM_STATE_COOKIE = "gab_classroom_oauth_state";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(CLASSROOM_STATE_COOKIE)?.value;
  const verifiedState = state && storedState && state === storedState ? verifyClassroomOAuthState(state) : null;

  if (!code || !verifiedState) {
    return redirectToSettings(request.url, "classroom=invalid-state");
  }

  try {
    const token = await exchangeClassroomCode(code, request.url);
    const account = await fetchGoogleUserInfo(token.access_token);
    const classroomImport = await fetchClassroomImport(token.access_token, account);
    let connectionSaved = false;

    if (account) {
      try {
        await saveClassroomConnection(verifiedState.userId, account, token);
        connectionSaved = true;
      } catch {
        connectionSaved = false;
      }
    }

    const response = new NextResponse(renderImportBridge(classroomImport, connectionSaved), {
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

function renderImportBridge(payload: unknown, connectionSaved: boolean) {
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
      const storageKey = ${JSON.stringify(CLASSROOM_IMPORT_STORAGE_KEY)};
      const importsKey = "gab-routine:classroom:imports";
      const nextImport = JSON.parse(${JSON.stringify(serializedPayload)});
      const accountKey = nextImport.account?.id || nextImport.account?.email || nextImport.importId;
      let currentImports = [];
      try {
        const storedImports = JSON.parse(localStorage.getItem(importsKey) || "[]");
        currentImports = Array.isArray(storedImports) ? storedImports : [];
      } catch {}
      const mergedImports = [nextImport].concat(
        currentImports.filter((item) => (item.account?.id || item.account?.email || item.importId) !== accountKey)
      ).slice(0, 8);
      localStorage.setItem(storageKey, JSON.stringify(nextImport));
      localStorage.setItem(importsKey, JSON.stringify(mergedImports));
      window.location.replace(${JSON.stringify(
        connectionSaved ? "/configuracoes?classroom=import-ready" : "/configuracoes?classroom=import-ready-local"
      )});
    </script>
    <p>Google Classroom conectado. Voltando para as configuracoes...</p>
  </body>
</html>`;
}
