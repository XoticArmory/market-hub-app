type SearchableEvent = {
  title?: string | null;
  name?: string | null;
  location?: string | null;
  venue?: string | null;
  city?: string | null;
  description?: string | null;
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Search the event's real fields, plus the city resolved from its ZIP code. */
export function matchesEventSearch(event: SearchableEvent, query: string, zipCity = ""): boolean {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const text = normalize([
    event.title, event.name, event.location, event.venue,
    event.city, zipCity, event.description,
  ].filter(Boolean).join(" "));
  return terms.every(term => text.includes(term));
}
