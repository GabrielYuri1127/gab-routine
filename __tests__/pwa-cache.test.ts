import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
const registration = readFileSync(join(process.cwd(), "components", "pwa-register.tsx"), "utf8");

describe("PWA cache safety", () => {
  it("never caches Next.js RSC responses or returns HTML for missing static assets", () => {
    assert.match(serviceWorker, /headers\.get\("RSC"\) === "1"/);
    assert.match(serviceWorker, /searchParams\.has\("_rsc"\)/);
    assert.match(serviceWorker, /CACHEABLE_DESTINATIONS/);
    assert.equal(serviceWorker.match(/caches\.match\("\/"\)/g)?.length, 1);
  });

  it("checks for a fresh service worker without using the HTTP cache", () => {
    assert.match(registration, /updateViaCache: "none"/);
    assert.match(registration, /registration\.update\(\)/);
  });
});
