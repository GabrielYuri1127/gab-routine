import type { ActivityType } from "@/types/academic";
import type {
  ClassroomAccount,
  ClassroomCourse,
  ClassroomCourseWork,
  ClassroomDate,
  ClassroomImportPayload,
  ClassroomTime
} from "@/types/classroom";

export const CLASSROOM_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly"
] as const;

const CLASSROOM_API_ORIGIN = "https://classroom.googleapis.com/v1";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export interface ClassroomTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export class ClassroomGoogleError extends Error {
  constructor(
    public readonly code: "authorization_required" | "configuration_error" | "permission_required" | "temporary_unavailable",
    message: string
  ) {
    super(message);
    this.name = "ClassroomGoogleError";
  }
}

export function isClassroomReauthorizationRequired(error: unknown) {
  return error instanceof ClassroomGoogleError &&
    (error.code === "authorization_required" || error.code === "permission_required");
}

interface ClassroomPage<T> {
  nextPageToken?: string;
  [key: string]: T[] | string | undefined;
}

type ClassroomEnv = Record<string, string | undefined>;

export type ClassroomConfigurationIssue = "invalid_client_id" | "missing_credentials";

export function isClassroomConfigured(env: ClassroomEnv = process.env) {
  return getClassroomConfigurationIssue(env) === null;
}

export function getClassroomConfigurationIssue(env: ClassroomEnv = process.env): ClassroomConfigurationIssue | null {
  const clientId = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_ID);
  const clientSecret = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    return "missing_credentials";
  }

  return isGoogleOAuthClientId(clientId) ? null : "invalid_client_id";
}

export function getClassroomRedirectUri(requestUrl: string, env: ClassroomEnv = process.env) {
  const configuredRedirect = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_REDIRECT_URI);
  if (configuredRedirect) {
    return configuredRedirect;
  }

  return new URL("/api/classroom/callback", requestUrl).toString();
}

export function buildClassroomAuthUrl(state: string, requestUrl: string, env: ClassroomEnv = process.env) {
  const clientId = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_ID);
  const clientSecret = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_SECRET);
  if (!clientId || !clientSecret || !isGoogleOAuthClientId(clientId)) {
    throw new Error("Google Classroom OAuth is not configured.");
  }

  const authUrl = new URL(GOOGLE_OAUTH_URL);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent select_account");
  authUrl.searchParams.set("redirect_uri", getClassroomRedirectUri(requestUrl, env));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", CLASSROOM_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);

  return authUrl;
}

export async function exchangeClassroomCode(code: string, requestUrl: string, env: ClassroomEnv = process.env) {
  const clientId = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_ID);
  const clientSecret = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("Google Classroom OAuth is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: getClassroomRedirectUri(requestUrl, env)
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => null)) as
    | (Partial<ClassroomTokenResponse> & { error?: string; error_description?: string })
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? "Google Classroom token exchange failed.");
  }

  return payload as ClassroomTokenResponse;
}

export async function refreshClassroomAccessToken(refreshToken: string, env: ClassroomEnv = process.env) {
  const clientId = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_ID);
  const clientSecret = normalizeClassroomEnvValue(env.GOOGLE_CLASSROOM_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("Google Classroom OAuth is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<ClassroomTokenResponse> & { error?: string; error_description?: string })
    | null;

  if (!response.ok || !payload?.access_token) {
    const oauthError = payload?.error;
    const code =
      oauthError === "invalid_grant"
        ? "authorization_required"
        : oauthError === "invalid_client"
          ? "configuration_error"
          : "temporary_unavailable";
    throw new ClassroomGoogleError(code, payload?.error_description ?? "Google Classroom token refresh failed.");
  }

  return payload as ClassroomTokenResponse;
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

function isGoogleOAuthClientId(value: string) {
  return /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(value);
}

export async function revokeClassroomToken(token: string) {
  const response = await fetch(GOOGLE_REVOKE_URL, {
    body: new URLSearchParams({ token }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Google Classroom token revocation failed.");
  }
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<ClassroomAccount | undefined> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        email?: string;
        hd?: string;
        name?: string;
        picture?: string;
        sub?: string;
      }
    | null;

  if (!payload?.sub && !payload?.email) {
    return undefined;
  }

  return {
    connectedAt: new Date().toISOString(),
    email: payload.email,
    hostedDomain: payload.hd,
    id: payload.sub ?? payload.email ?? crypto.randomUUID(),
    name: payload.name,
    picture: payload.picture
  };
}

export async function fetchClassroomImport(accessToken: string, account?: ClassroomAccount): Promise<ClassroomImportPayload> {
  const coursesUrl = new URL(`${CLASSROOM_API_ORIGIN}/courses`);
  coursesUrl.searchParams.set("courseStates", "ACTIVE");
  coursesUrl.searchParams.set("pageSize", "30");

  const courses = await fetchClassroomPages<ClassroomCourse>(coursesUrl, accessToken, "courses", 3);
  const importItems = await Promise.all(
    courses.map(async (course) => ({
      course,
      courseWork: await fetchCourseWork(course.id, accessToken)
    }))
  );

  return {
    account,
    courses: importItems,
    fetchedAt: new Date().toISOString(),
    importId: crypto.randomUUID()
  };
}

export async function verifyClassroomAccess(accessToken: string, grantedScope?: string) {
  const grantedScopes = new Set((grantedScope ?? "").split(/\s+/).filter(Boolean));
  const requiredScopes = CLASSROOM_SCOPES.filter((scope) => scope.startsWith("https://"));
  const missingScopes = grantedScopes.size ? requiredScopes.filter((scope) => !grantedScopes.has(scope)) : [];

  if (missingScopes.length) {
    throw new ClassroomGoogleError("permission_required", "Google Classroom permissions are incomplete.");
  }

  const coursesUrl = new URL(`${CLASSROOM_API_ORIGIN}/courses`);
  coursesUrl.searchParams.set("courseStates", "ACTIVE");
  coursesUrl.searchParams.set("pageSize", "100");
  const courses = await fetchClassroomPages<ClassroomCourse>(coursesUrl, accessToken, "courses", 1);

  if (courses[0]) {
    const courseWorkUrl = new URL(`${CLASSROOM_API_ORIGIN}/courses/${encodeURIComponent(courses[0].id)}/courseWork`);
    courseWorkUrl.searchParams.set("pageSize", "1");
    await fetchClassroomPages<ClassroomCourseWork>(courseWorkUrl, accessToken, "courseWork", 1);
  }

  return {
    activeCourses: courses.length,
    checkedAt: new Date().toISOString(),
    courseworkReadable: true,
    coursesReadable: true
  };
}

export function toDateKeyFromClassroomDueDate(dueDate?: ClassroomDate) {
  if (!dueDate?.year || !dueDate.month || !dueDate.day) {
    return undefined;
  }

  return `${dueDate.year.toString().padStart(4, "0")}-${pad(dueDate.month)}-${pad(dueDate.day)}`;
}

export function toTimeFromClassroomDueTime(dueTime?: ClassroomTime) {
  if (!dueTime) {
    return undefined;
  }

  return `${pad(dueTime.hours ?? 23)}:${pad(dueTime.minutes ?? 59)}`;
}

export function mapClassroomCourseWorkType(workType?: string): ActivityType {
  const normalized = workType?.toUpperCase();

  if (normalized === "ASSIGNMENT") {
    return "work";
  }

  if (normalized === "SHORT_ANSWER_QUESTION" || normalized === "MULTIPLE_CHOICE_QUESTION") {
    return "exercise";
  }

  if (normalized === "MATERIAL") {
    return "other";
  }

  return "activity";
}

async function fetchCourseWork(courseId: string, accessToken: string) {
  const courseWorkUrl = new URL(`${CLASSROOM_API_ORIGIN}/courses/${encodeURIComponent(courseId)}/courseWork`);
  courseWorkUrl.searchParams.set("orderBy", "dueDate asc");
  courseWorkUrl.searchParams.set("pageSize", "50");

  return fetchClassroomPages<ClassroomCourseWork>(courseWorkUrl, accessToken, "courseWork", 4);
}

async function fetchClassroomPages<T>(url: URL, accessToken: string, collectionKey: string, maxPages: number) {
  const items: T[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const pageUrl = new URL(url.toString());
    if (nextPageToken) {
      pageUrl.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(pageUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = (await response.json().catch(() => null)) as ClassroomPage<T> | null;

    if (!response.ok || !payload) {
      const code = response.status === 401
        ? "authorization_required"
        : response.status === 403
          ? "permission_required"
          : "temporary_unavailable";
      throw new ClassroomGoogleError(code, "Google Classroom request failed.");
    }

    const pageItems = payload[collectionKey];
    if (Array.isArray(pageItems)) {
      items.push(...pageItems);
    }

    nextPageToken = payload.nextPageToken;
    if (!nextPageToken) {
      break;
    }
  }

  return items;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}
