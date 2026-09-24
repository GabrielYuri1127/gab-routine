import {
  buildClassroomAuthUrl,
  getClassroomConfigurationIssue,
  getClassroomRedirectUri
} from "./google-classroom";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type ClassroomOAuthStatus =
  | "invalid_client"
  | "not_configured"
  | "ready"
  | "redirect_mismatch"
  | "unverified";

type ClassroomEnv = Record<string, string | undefined>;

export async function probeClassroomOAuthClient(
  requestUrl: string,
  env: ClassroomEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<ClassroomOAuthStatus> {
  const configurationIssue = getClassroomConfigurationIssue(env);
  if (configurationIssue === "missing_credentials") {
    return "not_configured";
  }
  if (configurationIssue === "invalid_client_id") {
    return "invalid_client";
  }

  try {
    const credentialsStatus = await probeClassroomOAuthCredentials(requestUrl, env, fetchImpl);
    if (credentialsStatus !== "ready") {
      return credentialsStatus;
    }

    const authUrl = buildClassroomAuthUrl("gavium-configuration-check", requestUrl, env);
    authUrl.searchParams.set("prompt", "none");

    const response = await fetchImpl(authUrl, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000)
    });
    const location = response.headers.get("location");
    const oauthError = readGoogleOAuthError(location);

    if (oauthError.includes("invalid_client") || oauthError.includes("oauth client was not found")) {
      return "invalid_client";
    }
    if (oauthError.includes("redirect_uri_mismatch") || oauthError.includes("redirect uri mismatch")) {
      return "redirect_mismatch";
    }

    return response.status >= 500 ? "unverified" : "ready";
  } catch {
    return "unverified";
  }
}

export function getClassroomOAuthClientHint(env: ClassroomEnv = process.env) {
  const clientId = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_ID);
  if (!clientId) {
    return undefined;
  }

  const visibleStart = clientId.slice(0, 12);
  const visibleEnd = clientId.slice(-32);
  return clientId.length > visibleStart.length + visibleEnd.length
    ? `${visibleStart}...${visibleEnd}`
    : clientId;
}

async function probeClassroomOAuthCredentials(
  requestUrl: string,
  env: ClassroomEnv,
  fetchImpl: typeof fetch
): Promise<"invalid_client" | "ready" | "unverified"> {
  const clientId = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_ID);
  const clientSecret = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_SECRET);
  if (!clientId || !clientSecret) {
    return "invalid_client";
  }

  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: "4/gavium-invalid-configuration-check",
      grant_type: "authorization_code",
      redirect_uri: getClassroomRedirectUri(requestUrl, env)
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    signal: AbortSignal.timeout(6_000)
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; error_description?: string }
    | null;
  const oauthError = `${payload?.error ?? ""} ${payload?.error_description ?? ""}`.toLowerCase();

  if (
    oauthError.includes("invalid_client") ||
    oauthError.includes("deleted_client") ||
    oauthError.includes("oauth client was not found")
  ) {
    return "invalid_client";
  }

  return payload?.error === "invalid_grant" ? "ready" : "unverified";
}

function readGoogleOAuthError(location: string | null) {
  if (!location) {
    return "";
  }

  try {
    const url = new URL(location);
    const encodedError = url.searchParams.get("authError");
    const decodedError = encodedError ? Buffer.from(encodedError, "base64url").toString("utf8") : "";
    return `${url.pathname} ${url.searchParams.get("error") ?? ""} ${decodedError}`.toLowerCase();
  } catch {
    return location.toLowerCase();
  }
}

function normalizeClassroomEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const hasWrappingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return hasWrappingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
}
