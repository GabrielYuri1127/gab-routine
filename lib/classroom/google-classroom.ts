import type { ActivityType } from "@/types/academic";
import type { ClassroomCourse, ClassroomCourseWork, ClassroomDate, ClassroomImportPayload, ClassroomTime } from "@/types/classroom";

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly"
] as const;

const CLASSROOM_API_ORIGIN = "https://classroom.googleapis.com/v1";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ClassroomTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

interface ClassroomPage<T> {
  nextPageToken?: string;
  [key: string]: T[] | string | undefined;
}

type ClassroomEnv = Record<string, string | undefined>;

export function isClassroomConfigured(env: ClassroomEnv = process.env) {
  return Boolean(env.GOOGLE_CLASSROOM_CLIENT_ID && env.GOOGLE_CLASSROOM_CLIENT_SECRET);
}

export function getClassroomRedirectUri(requestUrl: string, env: ClassroomEnv = process.env) {
  if (env.GOOGLE_CLASSROOM_REDIRECT_URI) {
    return env.GOOGLE_CLASSROOM_REDIRECT_URI;
  }

  return new URL("/api/classroom/callback", requestUrl).toString();
}

export function buildClassroomAuthUrl(state: string, requestUrl: string, env: ClassroomEnv = process.env) {
  const clientId = env.GOOGLE_CLASSROOM_CLIENT_ID;
  if (!clientId || !env.GOOGLE_CLASSROOM_CLIENT_SECRET) {
    throw new Error("Google Classroom OAuth is not configured.");
  }

  const authUrl = new URL(GOOGLE_OAUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("redirect_uri", getClassroomRedirectUri(requestUrl, env));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", CLASSROOM_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);

  return authUrl;
}

export async function exchangeClassroomCode(code: string, requestUrl: string, env: ClassroomEnv = process.env) {
  const clientId = env.GOOGLE_CLASSROOM_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLASSROOM_CLIENT_SECRET;

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

  const payload = (await response.json().catch(() => null)) as (Partial<ClassroomTokenResponse> & { error_description?: string }) | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? "Google Classroom token exchange failed.");
  }

  return payload as ClassroomTokenResponse;
}

export async function fetchClassroomImport(accessToken: string): Promise<ClassroomImportPayload> {
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
    courses: importItems,
    fetchedAt: new Date().toISOString()
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

  try {
    return await fetchClassroomPages<ClassroomCourseWork>(courseWorkUrl, accessToken, "courseWork", 4);
  } catch {
    return [];
  }
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
      throw new Error("Google Classroom request failed.");
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
