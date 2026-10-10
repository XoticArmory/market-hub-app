export const ORGANIZER_EVENT_PATH = "/events/new";

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
