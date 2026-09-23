import {
  buildClassroomAuthUrl,
  getClassroomConfigurationIssue
} from "./google-classroom";

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
