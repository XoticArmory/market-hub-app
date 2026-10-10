import assert from "node:assert/strict";
import test from "node:test";
import { organizerActions, organizerTrialPath } from "./organizer-flow.ts";

test("guests sign up only after selecting an organizer CTA, retaining intent", () => {
  const actions = organizerActions(false, false);
  const post = new URL(actions.postEventHref, "https://example.com");
  assert.equal(post.pathname, "/auth");
  assert.equal(post.searchParams.get("mode"), "signup");
  assert.equal(post.searchParams.get("next"), "/events/new");
  const trial = new URL(actions.startTrialHref, "https://example.com");
  const destination = new URL(trial.searchParams.get("next")!, "https://example.com");
  assert.equal(destination.pathname, "/upgrade");
  assert.equal(destination.searchParams.get("plan"), "monthly");
  assert.equal(destination.searchParams.get("checkout"), "1");
  assert.equal(destination.searchParams.get("returnTo"), "/events/new");
});

test("annual selection survives signup and Pro organizers avoid duplicate checkout", () => {
  const guest = organizerActions(false, false, "annual");
  const auth = new URL(guest.startTrialHref, "https://example.com");
  assert.equal(auth.searchParams.get("next"), organizerTrialPath("annual"));
  assert.equal(organizerActions(true, false, "annual").startTrialHref, organizerTrialPath("annual"));
  assert.deepEqual(organizerActions(true, true), {
    startTrialHref: "/events/new", postEventHref: "/events/new",
  });
});
