import { zipToState, US_STATES } from "./zip-to-state";

export function normalizeUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export function getNextDate(event: any): Date {
  const now = new Date();
  const allDates: Date[] = [
    new Date(event.date),
    ...((event.extraDates || []) as { date: string }[]).map(d => new Date(d.date)),
  ];
  const upcoming = allDates.filter(d => d >= now).sort((a, b) => a.getTime() - b.getTime());
  return upcoming.length > 0 ? upcoming[0] : new Date(event.date);
}

function getAnonSessionId(): string {
  const key = "vg_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function trackAnonEventClick(eventId: number) {
  const sessionId = getAnonSessionId();
  fetch("/api/track/event-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, sessionId }),
  }).catch(() => {});
}

/** True when the event's main date or any additional date is still ahead. */
export function isUpcomingEvent(event: any, now: Date = new Date()): boolean {
  const days: Date[] = [
    new Date(event.date),
    ...((event.extraDates || []) as { date: string }[]).map(d => new Date(d.date)),
  ];
  return days.some(d => d >= now);
}

/** State abbreviation for an event, derived from its ZIP code like the board does. */
export function getEventStateAbbr(event: any): string | null {
  return event.areaCode ? zipToState(event.areaCode) : null;
}

/** "Coeur d'Alene" -> "coeur-d-alene"; accents stripped, runs collapsed. */
export function slugify(text: string): string {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function stateSlugFromAbbr(abbr: string): string | null {
  const state = US_STATES.find(s => s.abbr === abbr);
  return state ? slugify(state.name) : null;
}

export function abbrFromStateSlug(slug: string): string | null {
  const state = US_STATES.find(s => slugify(s.name) === slug);
  return state ? state.abbr : null;
}

export function stateNameFromAbbr(abbr: string): string | null {
  return US_STATES.find(s => s.abbr === abbr)?.name ?? null;
}

/** City page slug: "<city-slug>-<state-abbr-lower>", e.g. "billings-mt". */
export function citySlugFor(city: string, abbr: string): string {
  return `${slugify(city)}-${abbr.toLowerCase()}`;
}

/**
 * Parse a place slug from the /:place route. Returns a state place, a city
 * place (city slug part + state abbr), or null when the slug matches neither.
 * City slugs end in "-<2-letter state abbr>"; the remainder is the city slug.
 */
export function parsePlaceSlug(slug: string):
  | { kind: "state"; abbr: string }
  | { kind: "city"; citySlug: string; abbr: string }
  | null {
  const stateAbbr = abbrFromStateSlug(slug);
  if (stateAbbr) return { kind: "state", abbr: stateAbbr };
  const m = slug.match(/^(.*)-([a-z]{2})$/);
  if (m && US_STATES.some(s => s.abbr === m[2].toUpperCase())) {
    return { kind: "city", citySlug: m[1], abbr: m[2].toUpperCase() };
  }
  return null;
}
