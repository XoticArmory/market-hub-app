import { useState, useEffect } from "react";
import { useEvents } from "@/hooks/use-events";
import { EventCard } from "@/components/event-card";
import { getNextDate } from "@/lib/event-helpers";
import { Link, useLocation } from "wouter";
import { Calendar, CalendarPlus, MapPin, ArrowRight, Loader2, Sparkles, Package, Users, Image as ImageIcon, Filter, Hash, ExternalLink, Share2, Link2, Check, ShieldCheck, Crown, ArrowUpDown, ArrowUp, ArrowDown, Mail, Download, Navigation, Smartphone, X, Phone, ClipboardList, List, Map as MapIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zipToState, US_STATES } from "@/lib/zip-to-state";
import { getSavedStateFilter, saveStateFilter, detectUserState, getGeolocationPermissionState } from "@/lib/user-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SiX, SiFacebook, SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizerActions } from "@/hooks/use-organizer-actions";
import { useProfile } from "@/hooks/use-profile";
import { useUserRegistrations } from "@/hooks/use-registrations";
import { MissingPhoto } from "@/components/missing-photo";
import { EventDiscoveryMap } from "@/components/event-discovery-map";
import { compareNewestAdded } from "@/lib/event-sort";
import { matchesEventSearch } from "@/lib/event-search";

function distanceInMiles(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusMiles = 3958.8;
  const latDelta = (to.latitude - from.latitude) * Math.PI / 180;
  const lonDelta = (to.longitude - from.longitude) * Math.PI / 180;
  const fromLat = from.latitude * Math.PI / 180;
  const toLat = to.latitude * Math.PI / 180;
  const a = Math.sin(latDelta / 2) ** 2
    + Math.sin(lonDelta / 2) ** 2 * Math.cos(fromLat) * Math.cos(toLat);
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PWA_DISMISS_KEY = "vg_pwa_dismissed";

function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    setDismissed(localStorage.getItem(PWA_DISMISS_KEY) === "1");

    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(PWA_DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (isStandalone || dismissed) return null;
  if (!installPrompt && !isIOS) return null;

  return (
    <section className="glass-panel rounded-3xl p-5 md:p-7 flex flex-col sm:flex-row items-center gap-5">
      <div className="shrink-0 w-13 h-13 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
        <Smartphone className="w-6 h-6 text-primary-foreground" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-lg font-display font-bold text-foreground">Get the VendorGrid App</h2>
        {isIOS ? (
          <p className="text-sm text-muted-foreground mt-0.5">
            Tap <strong>Share</strong> <span className="text-xs">⬆</span> in Safari then <strong>"Add to Home Screen"</strong> to install.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5">Browse events, manage listings, and chat — right from your home screen.</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
            data-testid="button-pwa-install"
          >
            <Download className="w-4 h-4" />Install App
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss"
          data-testid="button-pwa-dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const { hostAccess, retryAccess } = useOrganizerActions();
  const [viewMode, setViewMode] = useState<"list" | "map">(
    () => new URLSearchParams(window.location.search).get("view") === "map" ? "map" : "list"
  );
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);
  const [areaInput, setAreaInput] = useState("");
  const [areaFilter, setAreaFilter] = useState<string | undefined>(undefined);
  const [radiusInput, setRadiusInput] = useState("");
  const [radiusFilter, setRadiusFilter] = useState<number | undefined>(undefined);
  const [stateFilter, setStateFilter] = useState<string>(() => getSavedStateFilter() ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"nearest" | "furthest" | "newest">("nearest");
  const { data: events, isLoading: isLoadingEvents, isError: eventsError, refetch: refetchEvents } = useEvents(radiusFilter ? undefined : areaFilter);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isAdmin = profile?.isAdmin === true;
  const isVendorPro = isAdmin || (profile?.subscriptionTier === "vendor_pro" && profile?.subscriptionStatus === "active");
  const { data: myRegistrations = [] } = useUserRegistrations();
  const registeredEventIds = new Set(
    (myRegistrations as any[])
      .filter((r: any) => r.status !== "canceled")
      .map((r: any) => r.eventId)
  );

  const postQueries = useQueries({
    queries: (events || []).map((event) => ({
      queryKey: ["/api/events", event.id, "posts"],
      queryFn: async () => {
        const res = await fetch(`/api/events/${event.id}/posts`);
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!events,
    })),
  });

  const isLoadingPosts = postQueries.some((q) => q.isLoading);
  const allPosts = postQueries.flatMap((q) => q.data || []);

  const postsByEventId = new Map(
    (events || []).map((event, i) => [event.id, postQueries[i]?.data || []])
  );

  const [cityMap, setCityMap] = useState<Record<string, string>>({});
  const [zipCoordinates, setZipCoordinates] = useState<Record<string, { latitude: number; longitude: number }>>({});

  // Auto-focus the board on the visitor's home state. A saved preference
  // (auto-detected or hand-picked) always wins. Otherwise the location
  // prompt appears on every board visit until permission is granted — if it
  // is already granted the lookup runs silently, and a prompt that vanishes
  // without a decision simply asks again next visit. Only an explicit
  // denial ("never allow") ends the asking: the browser reports it as
  // denied, so no prompt ever appears again and the board shows all states
  // until the visitor picks one by hand.
  useEffect(() => {
    if (getSavedStateFilter() !== null) return;
    let cancelled = false;
    (async () => {
      if ((await getGeolocationPermissionState()) === "denied") return;
      const detected = await detectUserState();
      if (cancelled || !detected) return;
      setStateFilter(detected);
      saveStateFilter(detected);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const eventZips = (events || []).map(e => e.areaCode).filter(Boolean) as string[];
    const lookupZips = radiusFilter && areaFilter ? [...eventZips, areaFilter] : eventZips;
    const uniqueZips = [...new Set(lookupZips)];
    const missing = uniqueZips.filter(z => !(z in cityMap) || !(z in zipCoordinates));
    if (missing.length === 0) return;
    missing.forEach(zip => {
      fetch(`https://api.zippopotam.us/us/${zip}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const place = data?.places?.[0];
          if (place) {
            const city = place['place name'];
            setCityMap(prev => ({ ...prev, [zip]: city }));
            const latitude = Number(place.latitude);
            const longitude = Number(place.longitude);
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              setZipCoordinates(prev => ({ ...prev, [zip]: { latitude, longitude } }));
            }
          }
        })
        .catch(() => {});
    });
  }, [events, areaFilter, radiusFilter]);

  const radiusCenter = radiusFilter && areaFilter ? zipCoordinates[areaFilter] : undefined;
  const isLoadingRadiusCoordinates = !!radiusFilter && !!areaFilter && !radiusCenter;
  const locationFilteredEvents = radiusFilter && radiusCenter
    ? (events || []).filter(event => {
      const eventCoordinates = event.areaCode ? zipCoordinates[event.areaCode] : undefined;
      return !!eventCoordinates && distanceInMiles(radiusCenter, eventCoordinates) <= radiusFilter;
    })
    : (events || []);
  // Date filter: an event matches if its main date OR any extra date falls
  // in range. All comparisons use the visitor's LOCAL calendar day.
  const localDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const eventDays = (e: any): Date[] => {
    const days = [localDay(new Date(e.date))];
    for (const d of (e.extraDates || [])) days.push(localDay(new Date(d.date)));
    return days;
  };
  const matchesDateFilter = (e: any): boolean => {
    if (!dateFilter) return true;
    const today = localDay(new Date());
    const dayMs = 24 * 60 * 60 * 1000;
    let start: Date, end: Date;
    if (dateFilter === "weekend") {
      const dow = today.getDay();
      if (dow === 6) { start = today; end = new Date(today.getTime() + dayMs); }
      else if (dow === 0) { start = today; end = today; }
      else { start = new Date(today.getTime() + (6 - dow) * dayMs); end = new Date(start.getTime() + dayMs); }
    } else if (dateFilter === "7days") {
      start = today; end = new Date(today.getTime() + 6 * dayMs);
    } else if (dateFilter === "30days") {
      start = today; end = new Date(today.getTime() + 29 * dayMs);
    } else if (dateFilter === "month") {
      if (!monthFilter) return true;
      const [y, m] = monthFilter.split("-").map(Number);
      return eventDays(e).some(d => d.getFullYear() === y && d.getMonth() === m - 1);
    } else return true;
    return eventDays(e).some(d => d >= start && d <= end);
  };
  const sortedEvents = [...locationFilteredEvents]
    .filter(e => !stateFilter || (e.areaCode && zipToState(e.areaCode) === stateFilter))
    .filter(e => matchesEventSearch(e, searchQuery, e.areaCode ? cityMap[e.areaCode] : ""))
    .filter(e => !categoryFilter || (categoryFilter === "__uncategorized__" ? !(e as any).category : (e as any).category === categoryFilter))
    .filter(e => matchesDateFilter(e))
    .sort((a, b) => {
      if (sortOrder === "newest") return compareNewestAdded(a, b);
      const diff = getNextDate(a).getTime() - getNextDate(b).getTime();
      return sortOrder === "nearest" ? diff : -diff;
    });
  const mapEvents = sortedEvents.map(event => ({
    ...event,
    date: getNextDate(event),
    pinColor: event.pinColor ?? "default",
    organizerName: (event as any).creatorName ?? null,
    latitude: event.areaCode ? zipCoordinates[event.areaCode]?.latitude ?? null : null,
    longitude: event.areaCode ? zipCoordinates[event.areaCode]?.longitude ?? null : null,
  }));

  // ZIP/radius apply immediately on change like the state filter does.
  // Overrides let the radius Select apply with its new value before the
  // radiusInput state update lands.
  const handleApplyFilters = (zipOverride?: string, radiusOverride?: string) => {
    const zip = (zipOverride ?? areaInput).trim();
    const radiusValue = radiusOverride ?? radiusInput;
    const parsedRadius = Number(radiusValue);
    if (radiusValue && (!/^\d{5}$/.test(zip) || !Number.isFinite(parsedRadius) || parsedRadius <= 0)) {
      toast({ title: "Enter a valid ZIP code", description: "A 5-digit ZIP code is needed to search by radius.", variant: "destructive" });
      return;
    }
    setAreaFilter(zip || undefined);
    setRadiusFilter(radiusValue ? parsedRadius : undefined);
  };

  const hasActiveFilters = !!(searchInput.trim() || searchQuery || stateFilter || areaFilter || radiusFilter || categoryFilter || dateFilter);
  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };
  const resetFilters = () => {
    clearSearch();
    setAreaFilter(undefined);
    setAreaInput("");
    setRadiusInput("");
    setRadiusFilter(undefined);
    setStateFilter("");
    saveStateFilter("");
    setCategoryFilter("");
    setDateFilter("");
    setMonthFilter("");
    setSelectedEventId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden glass-panel">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop" alt="Artisan Market" className="w-full h-full object-cover opacity-20 dark:opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        </div>
        <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:w-2/3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 w-fit border border-primary/20">
            <Sparkles className="w-4 h-4" /><span>Support Local Creators</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">Discover & Connect with Local Markets</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">See what vendors are bringing to upcoming events, claim your spot, and chat with fellow artisans in your community.</p>
          <div className="flex flex-wrap gap-4">
            {hostAccess.status === "ready" ? <Link href={hostAccess.href!} data-testid="link-host-event" className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
              Host an Event <ArrowRight className="w-4 h-4" />
            </Link> : <button type="button" data-testid="button-host-event-pending" disabled={hostAccess.status === "loading"} onClick={retryAccess} aria-busy={hostAccess.status === "loading"} className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 disabled:opacity-60">
              {hostAccess.status === "loading" ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />Checking account…</> : "Account check failed — retry"}
            </button>}
            <Link href="/chat" className="px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all duration-200">
              Join the Chat
            </Link>
          </div>
        </div>
      </section>

      <PwaInstallBanner />

      {/* Tabs */}
      <Tabs defaultValue="markets" className="space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Community Board</h2>
            <p className="text-muted-foreground mt-2">Explore registered markets and vendor collections.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="flex w-full items-center gap-2 flex-wrap">
              <div className="relative w-full sm:flex-1 sm:min-w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <Input
                  role="searchbox"
                  aria-label="Search events by name, venue, city, or description"
                  placeholder="Search events, venues, cities..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="pl-9 pr-10 rounded-xl h-10 text-sm"
                  data-testid="input-event-search"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Clear keyword search"
                    onClick={clearSearch}
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="button-clear-event-search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <Select
                value={stateFilter}
                onValueChange={val => { const next = val === "__all__" ? "" : val; setStateFilter(next); saveStateFilter(next); }}
              >
                <SelectTrigger className="rounded-xl h-10 w-36 text-sm" data-testid="select-state-filter">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__all__">All states</SelectItem>
                  {US_STATES.map(s => (
                    <SelectItem key={s.abbr} value={s.abbr}>
                      {s.abbr} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex items-center">
                <Hash className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  data-testid="input-area-filter"
                  placeholder="Zip code..."
                  value={areaInput}
                  onChange={e => setAreaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleApplyFilters(); }}
                  onBlur={() => handleApplyFilters()}
                  className="pl-9 rounded-xl h-10 w-36 text-sm"
                />
              </div>
              <Select
                value={radiusInput}
                onValueChange={val => { const next = val === "__exact__" ? "" : val; setRadiusInput(next); handleApplyFilters(undefined, next); }}
              >
                <SelectTrigger className="rounded-xl h-10 w-32 text-sm" data-testid="select-radius-filter">
                  <SelectValue placeholder="Radius" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__exact__">Exact ZIP</SelectItem>
                  <SelectItem value="5">Within 5 mi</SelectItem>
                  <SelectItem value="10">Within 10 mi</SelectItem>
                  <SelectItem value="25">Within 25 mi</SelectItem>
                  <SelectItem value="50">Within 50 mi</SelectItem>
                  <SelectItem value="100">Within 100 mi</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter || "__all__"}
                onValueChange={val => setCategoryFilter(val === "__all__" ? "" : val)}
              >
                <SelectTrigger className="rounded-xl h-10 w-36 text-sm" data-testid="select-category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  <SelectItem value="Farmers Market">Farmers Market</SelectItem>
                  <SelectItem value="Craft Fair">Craft Fair</SelectItem>
                  <SelectItem value="Festival">Festival</SelectItem>
                  <SelectItem value="Pop-up">Pop-up</SelectItem>
                  <SelectItem value="Flea Market">Flea Market</SelectItem>
                  <SelectItem value="__uncategorized__">Uncategorized</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dateFilter || "__all__"}
                onValueChange={val => {
                  const next = val === "__all__" ? "" : val;
                  setDateFilter(next);
                  if (next === "month" && !monthFilter) {
                    const now = new Date();
                    setMonthFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                  }
                }}
              >
                <SelectTrigger className="rounded-xl h-10 w-36 text-sm" data-testid="select-date-filter">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All dates</SelectItem>
                  <SelectItem value="weekend">This weekend</SelectItem>
                  <SelectItem value="7days">Next 7 days</SelectItem>
                  <SelectItem value="30days">Next 30 days</SelectItem>
                  <SelectItem value="month">Choose month</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === "month" && (
                <Input
                  data-testid="input-month-filter"
                  type="month"
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="rounded-xl h-10 w-36 text-sm"
                />
              )}
              <Button size="sm" variant="outline" onClick={() => handleApplyFilters()} aria-label="Apply filters" className="rounded-xl h-10" data-testid="button-filter">
                <Filter className="w-4 h-4 mr-1" /> Apply filters
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={resetFilters} className="rounded-xl h-10 text-muted-foreground text-sm" data-testid="button-clear-filters">
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 border border-border/50 rounded-xl p-1 h-10" role="group" aria-label="Sort events">
              <Button
                size="sm"
                variant={sortOrder === "nearest" ? "default" : "ghost"}
                aria-pressed={sortOrder === "nearest"}
                className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
                onClick={() => setSortOrder("nearest")}
                data-testid="button-sort-nearest"
              >
                <ArrowUp className="w-3 h-3" />Nearest
              </Button>
              <Button
                size="sm"
                variant={sortOrder === "furthest" ? "default" : "ghost"}
                aria-pressed={sortOrder === "furthest"}
                className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
                onClick={() => setSortOrder("furthest")}
                data-testid="button-sort-furthest"
              >
                <ArrowDown className="w-3 h-3" />Furthest
              </Button>
              <Button
                size="sm"
                variant={sortOrder === "newest" ? "default" : "ghost"}
                aria-pressed={sortOrder === "newest"}
                className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
                onClick={() => setSortOrder("newest")}
                data-testid="button-sort-newest"
              >
                <CalendarPlus className="w-3 h-3" />Newest added
              </Button>
            </div>
            <div className="flex items-center gap-1 bg-muted/50 border border-border/50 rounded-xl p-1 h-10" role="group" aria-label="Event view">
              <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} aria-pressed={viewMode === "list"} className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium" onClick={() => setViewMode("list")} data-testid="button-view-list">
                <List className="w-3.5 h-3.5" />List
              </Button>
              <Button size="sm" variant={viewMode === "map" ? "default" : "ghost"} aria-pressed={viewMode === "map"} className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium" onClick={() => setViewMode("map")} data-testid="button-view-map">
                <MapIcon className="w-3.5 h-3.5" />Map
              </Button>
            </div>
            <TabsList className="bg-muted/50 p-1 rounded-xl h-10 w-fit">
              <TabsTrigger value="markets" className="rounded-lg px-5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5" />Markets
              </TabsTrigger>
              <TabsTrigger value="items" className="rounded-lg px-5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-sm">
                <ImageIcon className="w-3.5 h-3.5" />Community Items
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="markets" className="mt-0">
          {!isLoadingEvents && !isLoadingRadiusCoordinates && !eventsError && (
            <p role="status" aria-live="polite" className="mb-4 text-sm text-muted-foreground" data-testid="event-result-count">
              <span className="font-semibold text-foreground">{sortedEvents.length}</span>{" "}
              {sortedEvents.length === 1 ? "event" : "events"} found
            </p>
          )}
          {(stateFilter || areaFilter || categoryFilter || dateFilter) && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {stateFilter && <Badge variant="secondary" className="text-sm py-1.5 px-3"><MapPin className="w-3 h-3 mr-1" />State: {US_STATES.find(s => s.abbr === stateFilter)?.name ?? stateFilter}</Badge>}
              {areaFilter && radiusFilter
                ? <Badge variant="secondary" className="text-sm py-1.5 px-3"><Navigation className="w-3 h-3 mr-1" />Within {radiusFilter} mi of {areaFilter}</Badge>
                : areaFilter && <Badge variant="secondary" className="text-sm py-1.5 px-3"><Hash className="w-3 h-3 mr-1" />Zip: {areaFilter}</Badge>}
              {categoryFilter && <Badge variant="secondary" className="text-sm py-1.5 px-3">Category: {categoryFilter === "__uncategorized__" ? "Uncategorized" : categoryFilter}</Badge>}
              {dateFilter && <Badge variant="secondary" className="text-sm py-1.5 px-3">{dateFilter === "weekend" ? "This weekend" : dateFilter === "7days" ? "Next 7 days" : dateFilter === "30days" ? "Next 30 days" : `Month: ${monthFilter}`}</Badge>}
            </div>
          )}
          {isLoadingEvents || isLoadingRadiusCoordinates ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" /><p>Loading markets...</p>
            </div>
          ) : eventsError ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Having trouble connecting</h3>
              <p className="text-muted-foreground mb-6">We're having a moment — please try again in a few seconds.</p>
              <button onClick={() => refetchEvents()} className="text-primary font-medium hover:underline">Refresh</button>
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasActiveFilters ? "No events match" : "No events scheduled"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {hasActiveFilters
                  ? "Try another keyword or reset your filters to see all events."
                  : "Be the first to add a local market event to the board."}
              </p>
              {hasActiveFilters
                ? <Button onClick={resetFilters} className="rounded-xl" data-testid="button-reset-event-filters">Reset filters</Button>
                : <Link href={hostAccess.status === "ready" ? hostAccess.href! : "/organizers"} className="text-primary font-medium hover:underline">Create an event</Link>}
            </div>
          ) : (
            <div className="space-y-5">
              {viewMode === "map" && (
                <EventDiscoveryMap
                  events={mapEvents}
                  selectedEventId={selectedEventId}
                />
              )}
              <div className={viewMode === "map"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[640px] overflow-y-auto pr-2 pb-2"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
              {sortedEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={i}
                  posts={postsByEventId.get(event.id) || []}
                  cityName={event.areaCode ? cityMap[event.areaCode] : null}
                  mapMode={viewMode === "map"}
                  onSelect={() => setSelectedEventId(event.id)}
                />
              ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-0">
          {isLoadingPosts ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : allPosts.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No items posted by vendors yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allPosts.map((post: any) => (
                <Link href={`/events/${post.eventId}`} key={post.id}>
                  <div className="group bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="aspect-square bg-muted relative">
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt={`Items from ${post.vendorName || "a vendor"}: ${post.itemsDescription || "Community listing"}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <MissingPhoto name={post.itemsDescription || post.vendorName || "Local goods"} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                        <p className="text-white text-xs font-medium line-clamp-1">{post.vendorName}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-foreground font-medium line-clamp-2 min-h-[2.5rem]">{post.itemsDescription}</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-3">{events?.find((e: any) => e.id === post.eventId)?.title || "Event"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
