import assert from "node:assert/strict";
import test from "node:test";

import { getProfileInitials, normalizeProfilePhoto } from "../lib/profile-photo";

test("accepts supported profile photo sources", () => {
  assert.equal(normalizeProfilePhoto(" https://example.com/avatar.jpg "), "https://example.com/avatar.jpg");
  assert.equal(normalizeProfilePhoto("data:image/webp;base64,AAAA"), "data:image/webp;base64,AAAA");
});

test("rejects unsafe or unsupported profile photo sources", () => {
  assert.equal(normalizeProfilePhoto("javascript:alert(1)"), "");
  assert.equal(normalizeProfilePhoto("data:image/svg+xml;base64,AAAA"), "");
  assert.equal(normalizeProfilePhoto(null), "");
});

test("builds compact initials without exposing placeholder data", () => {
  assert.equal(getProfileInitials("Marina Costa"), "MC");
  assert.equal(getProfileInitials("Joana"), "J");
  assert.equal(getProfileInitials(""), "U");
});
