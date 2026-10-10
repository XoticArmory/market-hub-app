export function subscriptionSuccessUrl(host: string, tier: string, returnTo?: string): string {
  const path = returnTo || "/profile";
  const separator = path.includes("?") ? "&" : "?";
  return `${host}${path}${separator}subscribed=${tier}&session_id={CHECKOUT_SESSION_ID}`;
}
