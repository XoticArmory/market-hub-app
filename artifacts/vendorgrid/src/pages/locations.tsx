import { useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQueries } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { useEvents } from "@/hooks/use-events";
import { useZipCities } from "@/hooks/use-zip-cities";
import { EventCard } from "@/components/event-card";
import NotFound from "@/pages/not-found";
import {
  citySlugFor,
  getEventStateAbbr,
  getNextDate,
  isUpcomingEvent,
  parsePlaceSlug,
  slugify,
  stateNameFromAbbr,
  stateSlugFromAbbr,
} from "@/lib/event-helpers";

function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}

/** Vendor posts per event, same query shape the board uses. */
function useEventPosts(events: any[] | undefined) {
  const queries = useQueries({
    queries: (events || []).map(event => ({
      queryKey: ["/api/events", event.id, "posts"],
      queryFn: async () => {
        const res = await fetch(`/api/events/${event.id}/posts`);
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!events,
    })),
  });
  const map = new Map<number, any[]>();
  (events || []).forEach((event, i) => map.set(event.id, queries[i]?.data || []));
  return map;
}

type StateGroup = { abbr: string; name: string; slug: string; count: number };
type CityGroup = { city: string; abbr: string; slug: string; count: number };

/**
 * Places with at least one upcoming event, derived from live event data:
 * state from the event ZIP (same as the board's state filter), city from
 * the ZIP-resolved city name. Events without a resolvable state are skipped
 * here — they still appear on the board.
 */
function groupPlaces(events: any[], cityMap: Record<string, string>) {
  const states = new Map<string, StateGroup>();
  const cities = new Map<string, CityGroup>();
  for (const event of events) {
    if (!isUpcomingEvent(event)) continue;
    const abbr = getEventStateAbbr(event);
    if (!abbr) continue;
    const stateSlug = stateSlugFromAbbr(abbr);
    const stateName = stateNameFromAbbr(abbr);
    if (stateSlug && stateName) {
      const s = states.get(abbr) || { abbr, name: stateName, slug: stateSlug, count: 0 };
      s.count += 1;
      states.set(abbr, s);
    }
    const city = event.areaCode ? cityMap[event.areaCode] : undefined;
    if (city) {
      const slug = citySlugFor(city, abbr);
      const c = cities.get(slug) || { city, abbr, slug, count: 0 };
      c.count += 1;
      cities.set(slug, c);
    }
  }
  return {
    states: [...states.values()].sort((a, b) => a.name.localeCompare(b.name)),
    cities: [...cities.values()].sort((a, b) => a.city.localeCompare(b.city) || a.abbr.localeCompare(b.abbr)),
  };
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" /><p>Loading events...</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
      <p className="text-muted-foreground">Having trouble connecting — please try again in a few seconds.</p>
      <Link href="/" className="text-primary font-medium hover:underline mt-4 inline-block">Back to the board</Link>
    </div>
  );
}

export function LocationsIndex() {
  const { data: events, isLoading, isError } = useEvents();
  const zips = useMemo(() => (events || []).map(e => e.areaCode).filter(Boolean) as string[], [events]);
  const cityMap = useZipCities(zips);
  const { states, cities } = useMemo(() => groupPlaces(events || [], cityMap), [events, cityMap]);
  usePageTitle("Browse by Location | VendorGrid");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-display font-bold mb-2">Browse by Location</h1>
      <p className="text-muted-foreground mb-8">
        Every upcoming market on VendorGrid, grouped by state and city. Places appear here as soon as they have an upcoming event.
      </p>
      {isLoading ? <LoadingState /> : isError ? <ErrorState /> : (
        <>
          <h2 className="text-xl font-display font-bold mb-3">States</h2>
          {states.length === 0 ? (
            <p className="text-muted-foreground mb-8">No upcoming events anywhere yet.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {states.map(s => (
                <li key={s.abbr}>
                  <Link
                    href={`/${s.slug}`}
                    data-testid={`link-locations-state-${s.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-border/50 bg-card px-5 py-4 hover:shadow-md transition-shadow"
                  >
                    <span className="flex items-center gap-2 font-medium"><MapPin className="w-4 h-4 text-primary/70" />{s.name}</span>
                    <span className="text-sm text-muted-foreground">{s.count} {s.count === 1 ? "event" : "events"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h2 className="text-xl font-display font-bold mb-3">Cities</h2>
          {cities.length === 0 ? (
            <p className="text-muted-foreground">City listings appear here once their locations resolve.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cities.map(c => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    data-testid={`link-locations-city-${c.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-border/50 bg-card px-5 py-4 hover:shadow-md transition-shadow"
                  >
                    <span className="flex items-center gap-2 font-medium"><MapPin className="w-4 h-4 text-primary/70" />{c.city}, {c.abbr}</span>
                    <span className="text-sm text-muted-foreground">{c.count} {c.count === 1 ? "event" : "events"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function PlacePage() {
  const { place } = useParams();
  const parsed = parsePlaceSlug(place || "");
  const { data: events, isLoading, isError } = useEvents();
  const zips = useMemo(() => (events || []).map(e => e.areaCode).filter(Boolean) as string[], [events]);
  const cityMap = useZipCities(zips);
  const postsByEventId = useEventPosts(events);

  const upcoming = useMemo(() => (events || []).filter(e => isUpcomingEvent(e)), [events]);
  let heading = "";
  let stateSlug: string | null = null;
  let stateName: string | null = null;
  let filtered: any[] = [];
  if (parsed?.kind === "state") {
    stateName = stateNameFromAbbr(parsed.abbr);
    stateSlug = stateSlugFromAbbr(parsed.abbr);
    heading = stateName ? `Vendor Events in ${stateName}` : "";
    filtered = upcoming.filter(e => getEventStateAbbr(e) === parsed.abbr);
  } else if (parsed?.kind === "city") {
    stateName = stateNameFromAbbr(parsed.abbr);
    stateSlug = stateSlugFromAbbr(parsed.abbr);
    filtered = upcoming.filter(e => {
      if (getEventStateAbbr(e) !== parsed.abbr) return false;
      const city = e.areaCode ? cityMap[e.areaCode] : undefined;
      return city ? slugify(city) === parsed.citySlug : false;
    });
    const cityName = filtered.length > 0 && filtered[0].areaCode ? cityMap[filtered[0].areaCode] : undefined;
    heading = cityName ? `Vendor Events in ${cityName}, ${parsed.abbr}` : "";
  }
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => getNextDate(a).getTime() - getNextDate(b).getTime()),
    [filtered],
  );
  // A city page can't be declared empty while same-state ZIPs are still
  // resolving — one of them may belong to this city.
  const pendingCity = parsed?.kind === "city" && upcoming.some(e =>
    getEventStateAbbr(e) === parsed.abbr && e.areaCode && !cityMap[e.areaCode],
  );
  usePageTitle(parsed && heading ? `${heading} | VendorGrid` : "Browse by Location | VendorGrid");

  if (!parsed) return <NotFound />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {isLoading || pendingCity ? <LoadingState /> : isError ? <ErrorState /> : sorted.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
          <h1 className="text-2xl font-display font-bold mb-2" data-testid="text-place-heading">No upcoming events here yet</h1>
          <p className="text-muted-foreground mb-6">
            {parsed.kind === "city"
              ? "There are no upcoming events in this city right now."
              : "There are no upcoming events in this state right now."}
          </p>
          {parsed.kind === "city" && stateSlug && stateName && (
            <p className="mb-2"><Link href={`/${stateSlug}`} className="text-primary font-medium hover:underline">Browse events in {stateName}</Link></p>
          )}
          <p><Link href="/locations" className="text-primary font-medium hover:underline">Browse all locations</Link></p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-display font-bold mb-2" data-testid="text-place-heading">{heading}</h1>
          <p role="status" aria-live="polite" className="mb-6 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{sorted.length}</span>{" "}
            {sorted.length === 1 ? "event" : "events"} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                posts={postsByEventId.get(event.id) || []}
                cityName={event.areaCode ? cityMap[event.areaCode] : null}
              />
            ))}
          </div>
          {parsed.kind === "city" && stateSlug && stateName && (
            <p className="mt-8 text-sm text-muted-foreground">
              Looking for more? <Link href={`/${stateSlug}`} className="text-primary font-medium hover:underline">Browse all events in {stateName}</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
