import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionSuccessUrl } from "./subscription-return.ts";

test("default checkout return retains Stripe's session placeholder", () => {
  assert.equal(subscriptionSuccessUrl("https://example.com", "vendor_pro"),
    "https://example.com/profile?subscribed=vendor_pro&session_id={CHECKOUT_SESSION_ID}");
});

test("organizer checkout return preserves the next query alongside subscription parameters", () => {
  const result = subscriptionSuccessUrl("https://example.com", "vendor_pro", "/setup?next=%2Fevents%2Fnew");
  const url = new URL(result);
  assert.equal(url.pathname, "/setup");
  assert.equal(url.searchParams.get("next"), "/events/new");
  assert.equal(url.searchParams.get("subscribed"), "vendor_pro");
  assert.ok(result.endsWith("session_id={CHECKOUT_SESSION_ID}"));
});
