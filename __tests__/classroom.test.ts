import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildClassroomAuthUrl,
  CLASSROOM_SCOPES,
  mapClassroomCourseWorkType,
  toDateKeyFromClassroomDueDate,
  toTimeFromClassroomDueTime,
  verifyClassroomAccess
} from "../lib/classroom/google-classroom";
import { createClassroomOAuthState, verifyClassroomOAuthState } from "../lib/classroom/oauth-state";

describe("Google Classroom mapping", () => {
  it("formats Classroom due dates and due times", () => {
    assert.equal(toDateKeyFromClassroomDueDate({ day: 9, month: 9, year: 2026 }), "2026-09-09");
    assert.equal(toTimeFromClassroomDueTime({ hours: 8, minutes: 5 }), "08:05");
    assert.equal(toTimeFromClassroomDueTime(undefined), undefined);
  });

  it("maps Classroom work types to academic activity types", () => {
    assert.equal(mapClassroomCourseWorkType("ASSIGNMENT"), "work");
    assert.equal(mapClassroomCourseWorkType("SHORT_ANSWER_QUESTION"), "exercise");
    assert.equal(mapClassroomCourseWorkType("MATERIAL"), "other");
    assert.equal(mapClassroomCourseWorkType("UNKNOWN"), "activity");
  });

  it("asks Google to show the account chooser", () => {
    const authUrl = buildClassroomAuthUrl("state-1", "https://gab-routine.vercel.app/configuracoes", {
      GOOGLE_CLASSROOM_CLIENT_ID: "client-id",
      GOOGLE_CLASSROOM_CLIENT_SECRET: "client-secret",
      GOOGLE_CLASSROOM_REDIRECT_URI: "https://gab-routine.vercel.app/api/classroom/callback"
    });

    assert.equal(authUrl.searchParams.get("access_type"), "offline");
    assert.match(authUrl.searchParams.get("prompt") ?? "", /consent/);
    assert.match(authUrl.searchParams.get("prompt") ?? "", /select_account/);
    assert.equal(CLASSROOM_SCOPES.includes("openid"), true);
    assert.equal(CLASSROOM_SCOPES.includes("email"), true);
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
