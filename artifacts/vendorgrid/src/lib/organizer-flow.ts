export const ORGANIZER_EVENT_PATH = "/events/new";

type OrganizerProfile = {
  isAdmin?: boolean;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
};

type HostAccessState = {
  authenticated: boolean;
  authPending: boolean;
  authError: boolean;
  profilePending: boolean;
  profileError: boolean;
  profile?: OrganizerProfile | null;
};

export function resolveHostEventAccess(state: HostAccessState) {
  if (state.authPending || (state.authenticated && state.profilePending)) {
    return { status: "loading" as const, href: null, canHost: false };
  }
  if (state.authError || (state.authenticated && state.profileError)) {
    return { status: "error" as const, href: null, canHost: false };
  }
  const canHost = state.authenticated && (state.profile?.isAdmin === true ||
    (state.profile?.subscriptionStatus === "active" &&
      (state.profile.subscriptionTier === "vendor_pro" || state.profile.subscriptionTier === "event_owner_pro")));
  return { status: "ready" as const, href: canHost ? ORGANIZER_EVENT_PATH : "/organizers", canHost };
}

export function organizerTrialPath(plan: "monthly" | "annual" = "monthly"): string {
  return `/upgrade?plan=${plan}&checkout=1&returnTo=${encodeURIComponent(ORGANIZER_EVENT_PATH)}`;
}

export function organizerAuthPath(destination: string, mode: "signup" | "login" = "signup"): string {
  return `/auth?mode=${mode}&next=${encodeURIComponent(destination)}`;
}

export function organizerActions(authenticated: boolean, hasPro: boolean, plan: "monthly" | "annual" = "monthly") {
  const trial = hasPro ? ORGANIZER_EVENT_PATH : organizerTrialPath(plan);
  return {
    startTrialHref: authenticated ? trial : organizerAuthPath(trial),
    postEventHref: authenticated ? ORGANIZER_EVENT_PATH : organizerAuthPath(ORGANIZER_EVENT_PATH),
  };
}
