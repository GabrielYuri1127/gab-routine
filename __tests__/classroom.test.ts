import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildClassroomAuthUrl,
  CLASSROOM_SCOPES,
  ClassroomGoogleError,
  isClassroomReauthorizationRequired,
  mapClassroomCourseWorkType,
  toClassroomDeadline,
  toDateKeyFromClassroomDueDate,
  toTimeFromClassroomDueTime,
  verifyClassroomAccess
} from "../lib/classroom/google-classroom";
import { classifyClassroomPersistenceError } from "../lib/classroom/persistence-status";
import { probeClassroomOAuthClient } from "../lib/classroom/oauth-diagnostics";
import { getClassroomOAuthFailureQuery } from "../lib/classroom/oauth-callback";
import { createClassroomOAuthState, verifyClassroomOAuthState } from "../lib/classroom/oauth-state";

const validClientId = "123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com";
const classroomEnv = {
  GOOGLE_CLASSROOM_CLIENT_ID: validClientId,
  GOOGLE_CLASSROOM_CLIENT_SECRET: "client-secret",
  GOOGLE_CLASSROOM_REDIRECT_URI: "https://gab-routine.vercel.app/api/classroom/callback"
};

describe("Google Classroom mapping", () => {
  it("formats Classroom due dates and due times", () => {
    assert.equal(toDateKeyFromClassroomDueDate({ day: 9, month: 9, year: 2026 }), "2026-09-09");
    assert.equal(toTimeFromClassroomDueTime({ hours: 8, minutes: 5 }), "08:05");
    assert.equal(toTimeFromClassroomDueTime(undefined), undefined);
  });

  it("converts Classroom UTC deadlines to the app timezone", () => {
    assert.deepEqual(
      toClassroomDeadline(
        { day: 26, month: 9, year: 2026 },
        { hours: 3, minutes: 30 },
        "America/Manaus"
      ),
      { date: "2026-09-25", time: "23:30" }
    );
  });

  it("maps Classroom work types to academic activity types", () => {
    assert.equal(mapClassroomCourseWorkType("ASSIGNMENT"), "work");
    assert.equal(mapClassroomCourseWorkType("SHORT_ANSWER_QUESTION"), "exercise");
    assert.equal(mapClassroomCourseWorkType("MATERIAL"), "other");
    assert.equal(mapClassroomCourseWorkType("UNKNOWN"), "activity");
  });

  it("asks Google to show the account chooser", () => {
    const authUrl = buildClassroomAuthUrl("state-1", "https://gab-routine.vercel.app/configuracoes", {
      ...classroomEnv,
      GOOGLE_CLASSROOM_CLIENT_ID: `  "${validClientId}"  `
    });

    assert.equal(authUrl.searchParams.get("access_type"), "offline");
    assert.equal(authUrl.searchParams.get("client_id"), validClientId);
    assert.match(authUrl.searchParams.get("prompt") ?? "", /consent/);
    assert.match(authUrl.searchParams.get("prompt") ?? "", /select_account/);
    assert.equal(CLASSROOM_SCOPES.includes("openid"), true);
    assert.equal(CLASSROOM_SCOPES.includes("email"), true);
  });

  it("detects a deleted OAuth client before opening the Google page", async () => {
    const requestedUrls: string[] = [];
    const status = await probeClassroomOAuthClient(
      "https://gab-routine.vercel.app/configuracoes",
      classroomEnv,
      async (input) => {
        requestedUrls.push(String(input));
        return new Response(
          JSON.stringify({ error: "invalid_client", error_description: "The OAuth client was not found." }),
          {
            headers: { "Content-Type": "application/json" },
            status: 401
          }
        );
      }
    );

    assert.equal(status, "invalid_client");
    assert.deepEqual(requestedUrls, ["https://oauth2.googleapis.com/token"]);
  });

  it("accepts an OAuth client that reaches the Google sign-in flow", async () => {
    const requestedUrls: string[] = [];
    const status = await probeClassroomOAuthClient(
      "https://gab-routine.vercel.app/configuracoes",
      classroomEnv,
      async (input) => {
        requestedUrls.push(String(input));
        if (String(input) === "https://oauth2.googleapis.com/token") {
          return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Bad Request" }), {
            headers: { "Content-Type": "application/json" },
            status: 400
          });
        }

        return new Response(null, {
          headers: { Location: "https://accounts.google.com/v3/signin/identifier" },
          status: 302
        });
      }
    );

    assert.equal(status, "ready");
    assert.equal(requestedUrls.length, 2);
  });

  it("does not claim the OAuth client is ready when Google cannot verify it", async () => {
    const status = await probeClassroomOAuthClient(
      "https://gab-routine.vercel.app/configuracoes",
      classroomEnv,
      async () =>
        new Response(JSON.stringify({ error: "temporarily_unavailable" }), {
          headers: { "Content-Type": "application/json" },
          status: 503
        })
    );

    assert.equal(status, "unverified");
  });

  it("explains a Google consent denial instead of reporting an invalid state", () => {
    assert.equal(getClassroomOAuthFailureQuery("access_denied"), "classroom=access-denied");
    assert.equal(getClassroomOAuthFailureQuery("invalid_scope"), "classroom=scope-error");
    assert.equal(getClassroomOAuthFailureQuery("server_error"), "classroom=oauth-error");
  });

  it("verifies live access to active courses and coursework", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      requestedUrls.push(url);
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer access-token");

      if (url.includes("/courses?") && !url.includes("/courseWork")) {
        return new Response(JSON.stringify({ courses: [{ id: "course-1", name: "Course 1" }] }), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }
      if (url.includes("/courses/course-1/courseWork")) {
        return new Response(JSON.stringify({ courseWork: [] }), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      const result = await verifyClassroomAccess("access-token", CLASSROOM_SCOPES.join(" "));

      assert.equal(result.activeCourses, 1);
      assert.equal(result.coursesReadable, true);
      assert.equal(result.courseworkReadable, true);
      assert.equal(requestedUrls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects a connection that lacks the coursework permission", async () => {
    await assert.rejects(
      verifyClassroomAccess("access-token", "https://www.googleapis.com/auth/classroom.courses.readonly"),
      /permissions are incomplete/
    );
  });

  it("only requests reconnection for revoked access or missing permissions", () => {
    assert.equal(
      isClassroomReauthorizationRequired(new ClassroomGoogleError("authorization_required", "revoked")),
      true
    );
    assert.equal(
      isClassroomReauthorizationRequired(new ClassroomGoogleError("permission_required", "scope")),
      true
    );
    assert.equal(
      isClassroomReauthorizationRequired(new ClassroomGoogleError("temporary_unavailable", "timeout")),
      false
    );
  });

  it("recognizes a missing Classroom persistence table", () => {
    assert.equal(classifyClassroomPersistenceError({ code: "42P01" }), "schema_missing");
    assert.equal(classifyClassroomPersistenceError({ code: "PGRST205" }), "schema_missing");
    assert.equal(classifyClassroomPersistenceError({ code: "08006" }), "unavailable");
  });

  it("signs OAuth state and rejects tampering", () => {
    const previousSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
    process.env.GOOGLE_CLASSROOM_CLIENT_SECRET = "test-client-secret";

    try {
      const state = createClassroomOAuthState("user-123");
      assert.equal(verifyClassroomOAuthState(state)?.userId, "user-123");
      assert.equal(verifyClassroomOAuthState(`${state}changed`), null);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
      } else {
        process.env.GOOGLE_CLASSROOM_CLIENT_SECRET = previousSecret;
      }
    }
  });
});
