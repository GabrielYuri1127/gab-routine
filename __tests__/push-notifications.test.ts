import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pushSubscriptionUsesVapidKey, urlBase64ToUint8Array } from "../lib/notifications/browser-push";
import { getPushDeliveryFailure } from "../services/notifications/push-service";

describe("browser push subscription", () => {
  it("detects whether a subscription belongs to the configured VAPID key", () => {
    const expected = urlBase64ToUint8Array("AQIDBA");
    const subscription = {
      options: { applicationServerKey: expected.buffer }
    } as PushSubscription;

    assert.equal(pushSubscriptionUsesVapidKey(subscription, "AQIDBA"), true);
    assert.equal(pushSubscriptionUsesVapidKey(subscription, "AQIDBQ"), false);
  });
});

describe("push delivery diagnostics", () => {
  it("marks expired browser endpoints for automatic cleanup", () => {
    const failure = getPushDeliveryFailure({ statusCode: 410 });

    assert.equal(failure.code, "expired_subscription");
    assert.equal(failure.expired, true);
  });

  it("explains rejected VAPID credentials without exposing provider bodies", () => {
    const failure = getPushDeliveryFailure({ body: "sensitive provider response", statusCode: 403 });

    assert.equal(failure.code, "vapid_rejected");
    assert.equal(failure.expired, false);
    assert.doesNotMatch(failure.detail, /sensitive/);
  });
});
