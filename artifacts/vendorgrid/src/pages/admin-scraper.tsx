import { useState } from "react";
import { useRealProfile } from "@/hooks/use-profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Plus, Trash2, Globe, CalendarDays, MapPin, CheckCircle, ShieldCheck, FileText, ExternalLink, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ScrapedEvent {
  title: string;
  date: string | null;
  location: string;
  description: string;
  eventWebsiteUrl: string;
  areaCode: string;
  source: string;
  isSeekingVendors: boolean;
}

interface DraftEvent {
  id: number;
  title: string;
  date: Date;
  location: string;
  areaCode: string | null;
  description: string;
  eventWebsiteUrl: string | null;
  contactEmail: string | null;
  vendorSpaces: number | null;
  scrapedSource: string | null;
  createdAt: Date;
  status: string | null;
}

function useDraftEvents() {
  return useQuery<DraftEvent[]>({
    queryKey: ["/api/admin/draft-events"],
    queryFn: async () => {
      const res = await fetch("/api/admin/draft-events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch drafts");
      return res.json();
    },
  });
}

function EditDraftDialog({
  draft,
  open,
  onClose,
  onPublish,
}: {
  draft: DraftEvent | null;
  open: boolean;
  onClose: () => void;
  onPublish: (id: number) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<DraftEvent>>({});

  const updateDraft = useMutation({
    mutationFn: async (data: Partial<DraftEvent>) =>
      apiRequest("PATCH", `/api/events/${draft?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/draft-events"] });
      toast({ title: "Draft updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const handleOpen = (d: DraftEvent | null) => {
    if (d) setForm({ ...d, date: new Date(d.date) as any });
  };

  if (!draft) return null;

  const current = { ...draft, ...form };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setForm({}); } else handleOpen(draft); }}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Review Draft Event
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {draft.scrapedSource && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Globe className="w-3.5 h-3.5" />
              Scraped from <span className="font-semibold">{draft.scrapedSource}</span>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Title</label>
            <Input
              value={current.title || ""}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Date</label>
              <Input
                type="datetime-local"
                value={current.date ? new Date(current.date).toISOString().slice(0, 16) : ""}
                onChange={e => setForm(f => ({ ...f, date: new Date(e.target.value) as any }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Area Code / ZIP</label>
              <Input
                value={current.areaCode || ""}
                onChange={e => setForm(f => ({ ...f, areaCode: e.target.value }))}
                className="rounded-xl"
                placeholder="e.g. 59101"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Location</label>
            <Input
              value={current.location || ""}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Event Website</label>
            <Input
              value={current.eventWebsiteUrl || ""}
              onChange={e => setForm(f => ({ ...f, eventWebsiteUrl: e.target.value }))}
              className="rounded-xl"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Contact Email</label>
            <Input
              type="email"
              value={current.contactEmail || ""}
              onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              className="rounded-xl"
              placeholder="organizer@event.com"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Vendor Spaces</label>
            <Input
              type="number"
              min={0}
              value={current.vendorSpaces ?? 0}
              onChange={e => setForm(f => ({ ...f, vendorSpaces: Number(e.target.value) }))}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Description</label>
            <Textarea
              value={current.description || ""}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="rounded-xl resize-none min-h-[120px]"
              placeholder="Event details..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" className="rounded-xl" onClick={() => { onClose(); setForm({}); }}>
            Close
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={updateDraft.isPending}
            onClick={() => {
              const patch: any = {};
              if (form.title !== undefined) patch.title = form.title;
              if (form.location !== undefined) patch.location = form.location;
              if (form.description !== undefined) patch.description = form.description;
              if (form.areaCode !== undefined) patch.areaCode = form.areaCode;
              if (form.date !== undefined) patch.date = new Date(form.date as any);
              if (form.vendorSpaces !== undefined) patch.vendorSpaces = form.vendorSpaces;
              if (form.eventWebsiteUrl !== undefined) patch.eventWebsiteUrl = form.eventWebsiteUrl;
              if (form.contactEmail !== undefined) patch.contactEmail = form.contactEmail;
              updateDraft.mutate(patch);
            }}
          >
            {updateDraft.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
          <Button
            className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
            onClick={() => { onPublish(draft.id); onClose(); setForm({}); }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Publish Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminScraperPage() {
  const { data: profileData, isLoading: profileLoading } = useRealProfile();
  const profile = profileData?.profile;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [zipCode, setZipCode] = useState("");
  const [radius, setRadius] = useState("25");
  const [results, setResults] = useState<ScrapedEvent[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [editDraft, setEditDraft] = useState<DraftEvent | null>(null);
  const [activeTab, setActiveTab] = useState("search");

  const { data: drafts = [], isLoading: loadingDrafts } = useDraftEvents();

  const scrape = useMutation({
    mutationFn: async ({ zip, radiusMi }: { zip: string; radiusMi: string }) => {
      const res = await fetch("/api/admin/scrape-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ zipCode: zip, radius: parseInt(radiusMi) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ results: ScrapedEvent[]; zipCode: string; locationLabel: string; radius: number }>;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setSavedIds(new Set());
      if (data.results.length === 0) {
        toast({ title: "No events found", description: `No vendor events found within ${data.radius} mi of ${data.locationLabel || data.zipCode}. Try a wider radius.` });
      } else {
        const seekingCount = data.results.filter(r => r.isSeekingVendors).length;
        const seekingNote = seekingCount > 0 ? ` · ${seekingCount} seeking vendors` : '';
        toast({ title: `Found ${data.results.length} event${data.results.length === 1 ? "" : "s"}${seekingNote}`, description: data.locationLabel ? `Within ${data.radius} mi of ${data.locationLabel}` : undefined });
      }
    },
    onError: (e: any) => toast({ title: "Scrape failed", description: e.message, variant: "destructive" }),
  });

  const createDraft = useMutation({
    mutationFn: async (ev: ScrapedEvent) =>
      apiRequest("POST", "/api/admin/draft-events", {
        title: ev.title,
        description: ev.description,
        location: ev.location,
        areaCode: ev.areaCode,
        date: ev.date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        eventWebsiteUrl: ev.eventWebsiteUrl,
        scrapedSource: ev.source,
      }),
    onSuccess: (_data, ev) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/draft-events"] });
      setSavedIds(s => new Set([...s, ev.title]));
      toast({ title: "Draft created", description: `"${ev.title}" saved to Drafts tab.` });
    },
    onError: (e: any, ev: ScrapedEvent) => {
      if (typeof e?.message === "string" && e.message.startsWith("409:")) {
        setSavedIds(s => new Set([...s, ev.title]));
        toast({ title: "Already saved", description: "This event is already in your Drafts." });
      } else {
        toast({ title: "Failed to create draft", description: e.message, variant: "destructive" });
      }
    },
  });

  const publishDraft = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/admin/draft-events/${id}/publish`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/draft-events"] });
      toast({ title: "Event published!", description: "It's now live on VendorGrid." });
    },
    onError: (e: any) => toast({ title: "Publish failed", description: e.message, variant: "destructive" }),
  });

  const discardDraft = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/draft-events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/draft-events"] });
      toast({ title: "Draft discarded" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile?.isAdmin) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Search className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Event Scraper</h1>
          <p className="text-muted-foreground">Find events near a zip code and create draft listings for review.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="search" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Search className="w-4 h-4" />Search
          </TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <FileText className="w-4 h-4" />Drafts
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">{drafts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── SEARCH TAB ── */}
        <TabsContent value="search" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search for Vendor Events
              </CardTitle>
              <CardDescription>
                Searches Eventbrite, Meetup, Facebook, VendorMaps, and the wider web for vendor markets and craft fairs within the selected radius. Facebook results use "vendor" as the primary keyword.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <Input
                  placeholder="e.g. 59101"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => { if (e.key === 'Enter' && zipCode.length >= 4) scrape.mutate({ zip: zipCode, radiusMi: radius }); }}
                  className="rounded-xl h-12 text-base w-36 font-mono"
                  data-testid="input-scraper-zip"
                />
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger className="rounded-xl h-12 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 mi radius</SelectItem>
                    <SelectItem value="10">10 mi radius</SelectItem>
                    <SelectItem value="25">25 mi radius</SelectItem>
                    <SelectItem value="50">50 mi radius</SelectItem>
                    <SelectItem value="100">100 mi radius</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => scrape.mutate({ zip: zipCode, radiusMi: radius })}
                  disabled={zipCode.length < 4 || scrape.isPending}
                  className="rounded-xl h-12 px-6"
                  data-testid="button-scraper-search"
                >
                  {scrape.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching…</>
                  ) : (
                    <><Search className="w-4 h-4 mr-2" />Search</>
                  )}
                </Button>
              </div>

              {scrape.isPending && (
                <div className="flex items-center gap-3 mt-6 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Querying event sources — this may take up to 30 seconds…
                </div>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-muted-foreground">{results.length} event{results.length === 1 ? "" : "s"} found</p>
                {results.filter(r => r.isSeekingVendors).length > 0 && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
                    <Users className="w-3 h-3 mr-1" />{results.filter(r => r.isSeekingVendors).length} seeking vendors
                  </Badge>
                )}
              </div>
              {results.map((ev, i) => {
                const normalizedTitle = ev.title.trim().toLowerCase();
                const evDay = ev.date ? ev.date.slice(0, 10) : null;
                const alreadySaved = savedIds.has(ev.title) ||
                  drafts.some(d =>
                    d.title.trim().toLowerCase() === normalizedTitle &&
                    evDay !== null &&
                    new Date(d.date).toISOString().slice(0, 10) === evDay
                  );
                return (
                  <Card key={i} className={`transition-all ${alreadySaved ? 'opacity-60' : ''}`} data-testid={`scraped-event-${i}`}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-bold text-foreground text-base leading-snug">{ev.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{ev.source}</Badge>
                            {ev.isSeekingVendors && (
                              <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                <Users className="w-3 h-3 mr-1" />Seeking Vendors
                              </Badge>
                            )}
                            {alreadySaved && (
                              <Badge className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                                <CheckCircle className="w-3 h-3 mr-1" />Saved
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                            {ev.date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {(() => { try { return format(new Date(ev.date), 'PPP p'); } catch { return ev.date; } })()}
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ev.description}</p>
                          )}
                          {ev.eventWebsiteUrl && (
                            <a
                              href={ev.eventWebsiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />View on {ev.source}
                            </a>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={alreadySaved ? "outline" : "default"}
                          className="rounded-xl shrink-0"
                          disabled={alreadySaved || createDraft.isPending}
                          onClick={() => createDraft.mutate(ev)}
                          data-testid={`button-create-draft-${i}`}
                        >
                          {alreadySaved ? (
                            <><CheckCircle className="w-4 h-4 mr-1 text-green-600" />Already saved</>
                          ) : createDraft.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><Plus className="w-4 h-4 mr-1" />Create Draft</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── DRAFTS TAB ── */}
        <TabsContent value="drafts" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Draft Events
              </CardTitle>
              <CardDescription>
                Review and edit scraped event drafts before publishing them to the public feed. Drafts are invisible to regular users.
              </CardDescription>
            </CardHeader>
          </Card>

          {loadingDrafts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No drafts yet</p>
              <p className="text-sm mt-1">Use the Search tab to find events and save them as drafts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card key={draft.id} data-testid={`draft-event-${draft.id}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-bold text-foreground text-base">{draft.title}</span>
                          {draft.scrapedSource && (
                            <Badge variant="outline" className="text-xs">{draft.scrapedSource}</Badge>
                          )}
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                            Draft
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {draft.date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {(() => { try { return format(new Date(draft.date), 'PPP p'); } catch { return String(draft.date); } })()}
                            </span>
                          )}
                          {draft.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />{draft.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setEditDraft(draft)}
                          data-testid={`button-edit-draft-${draft.id}`}
                        >
                          Review & Edit
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => publishDraft.mutate(draft.id)}
                          disabled={publishDraft.isPending}
                          data-testid={`button-publish-draft-${draft.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => { if (confirm('Discard this draft?')) discardDraft.mutate(draft.id); }}
                          disabled={discardDraft.isPending}
                          data-testid={`button-discard-draft-${draft.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditDraftDialog
        draft={editDraft}
        open={editDraft !== null}
        onClose={() => setEditDraft(null)}
        onPublish={(id) => publishDraft.mutate(id)}
      />
    </div>
  );
}
