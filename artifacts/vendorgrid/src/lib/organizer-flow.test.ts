import assert from "node:assert/strict";
import test from "node:test";
import { organizerActions, organizerTrialPath, resolveHostEventAccess } from "./organizer-flow.ts";

const resolved = {
  authenticated: true, authPending: false, authError: false,
  profilePending: false, profileError: false,
};

test("Host an Event goes directly to creation for admins and active Pro tiers", () => {
  for (const profile of [
    { isAdmin: true, subscriptionTier: "free" },
    { subscriptionTier: "vendor_pro", subscriptionStatus: "active" },
    { subscriptionTier: "event_owner_pro", subscriptionStatus: "active" },
  ]) {
    assert.deepEqual(resolveHostEventAccess({ ...resolved, profile }),
      { status: "ready", href: "/events/new", canHost: true });
  }
});

test("guests and free or inactive accounts use the public conversion page", () => {
  for (const state of [
    { ...resolved, authenticated: false, profilePending: true, profileError: true },
    { ...resolved, profile: null },
    { ...resolved, profile: { subscriptionTier: "free", subscriptionStatus: "active" } },
    { ...resolved, profile: { subscriptionTier: "vendor_pro", subscriptionStatus: "canceled" } },
    { ...resolved, authenticated: false, profile: { isAdmin: true } },
  ]) {
    assert.equal(resolveHostEventAccess(state).href, "/organizers");
  }
});

test("unresolved auth/profile and refreshing cached state never choose a destination", () => {
  for (const state of [
    { ...resolved, authenticated: false, authPending: true },
    { ...resolved, profilePending: true },
    { ...resolved, authPending: true, profile: { isAdmin: true } },
    { ...resolved, profilePending: true, profile: { subscriptionTier: "free" } },
  ]) {
    assert.deepEqual(resolveHostEventAccess(state),
      { status: "loading", href: null, canHost: false });
  }
});

test("failed account checks do not silently route paid users to the sales page", () => {
  assert.equal(resolveHostEventAccess({ ...resolved, authError: true }).status, "error");
  assert.equal(resolveHostEventAccess({ ...resolved, profileError: true }).href, null);
});

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
