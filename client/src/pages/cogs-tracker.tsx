import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, TrendingUp, TrendingDown, DollarSign, Package, Plus, Trash2, ChevronDown, ChevronUp, BarChart3, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const DIRECT_CATEGORIES = ["Material", "Packaging", "Marketing", "Production"] as const;
const OVERHEAD_CATEGORIES = ["Booth Rental", "Travel", "Lodging"] as const;
const ALL_CATEGORIES = [...DIRECT_CATEGORIES, ...OVERHEAD_CATEGORIES] as const;
type CogsCategory = typeof ALL_CATEGORIES[number];

function fmt(cents: number) {
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}

function parseDollars(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function ProfitBadge({ cents }: { cents: number }) {
  if (cents > 0) return <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{fmt(cents)}</span>;
  if (cents < 0) return <span className="text-red-500 dark:text-red-400 font-bold flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" />{fmt(cents)}</span>;
  return <span className="text-muted-foreground font-bold">{fmt(cents)}</span>;
}

interface CogsSummaryItem {
  catalogItemId: number;
  itemName: string;
  quantityAssigned: number;
  quantitySold: number;
  sellPriceCents: number;
  cogs: { category: string; amountCents: number }[];
  directCogsCents: number;
  overheadPerItemCents: number;
  totalCogsPerItemCents: number;
  revenueCents: number;
  grossProfitCents: number;
  netProfitCents: number;
}

interface EventSummary {
  eventId: number;
  overhead: { boothRentalCents: number; travelCents: number; lodgingCents: number };
  totalItemsAtEvent: number;
  overheadPerItemCents: number;
  items: CogsSummaryItem[];
}

function OverheadSection({ eventId, summary, onSaved }: { eventId: number; summary: EventSummary; onSaved: () => void }) {
  const { toast } = useToast();
  const [booth, setBooth] = useState((summary.overhead.boothRentalCents / 100).toFixed(2));
  const [travel, setTravel] = useState((summary.overhead.travelCents / 100).toFixed(2));
  const [lodging, setLodging] = useState((summary.overhead.lodgingCents / 100).toFixed(2));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setBooth((summary.overhead.boothRentalCents / 100).toFixed(2));
    setTravel((summary.overhead.travelCents / 100).toFixed(2));
    setLodging((summary.overhead.lodgingCents / 100).toFixed(2));
    setDirty(false);
  }, [summary.overhead.boothRentalCents, summary.overhead.travelCents, summary.overhead.lodgingCents]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/vendor/cogs/overhead/${eventId}`, {
      boothRentalCents: parseDollars(booth),
      travelCents: parseDollars(travel),
      lodgingCents: parseDollars(lodging),
    }),
    onSuccess: () => { setDirty(false); toast({ title: "Overhead saved" }); onSaved(); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const perItem = summary.totalItemsAtEvent > 0
    ? (parseDollars(booth) + parseDollars(travel) + parseDollars(lodging)) / summary.totalItemsAtEvent
    : 0;

  return (
    <Card className="rounded-2xl border-dashed border-2 border-amber-300/50 bg-amber-50/30 dark:bg-amber-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-500" />
          Event Overhead
          <Badge variant="outline" className="ml-auto text-xs border-amber-300 text-amber-700 dark:text-amber-400">
            Dispersed across {summary.totalItemsAtEvent} items → {fmt(Math.round(perItem))} / item
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Enter total costs for this event. They'll be automatically divided equally across all your items at this event.</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Booth Rental", val: booth, set: (v: string) => { setBooth(v); setDirty(true); } },
            { label: "Travel", val: travel, set: (v: string) => { setTravel(v); setDirty(true); } },
            { label: "Lodging", val: lodging, set: (v: string) => { setLodging(v); setDirty(true); } },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">{label} (Total)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  value={val}
                  onChange={e => set(e.target.value)}
                  onBlur={e => { const n = parseFloat(e.target.value); set(isNaN(n) ? "0.00" : n.toFixed(2)); }}
                  className="pl-6 rounded-xl text-sm"
                  placeholder="0.00"
                  data-testid={`input-overhead-${label.toLowerCase().replace(" ", "-")}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            className="rounded-xl"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            data-testid="button-save-overhead"
          >
            {saveMutation.isPending ? "Saving…" : "Save Overhead"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemCogsSection({ item, eventId, overheadPerItemCents, totalItems, onSaved }: {
  item: CogsSummaryItem;
  eventId: number;
  overheadPerItemCents: number;
  totalItems: number;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [sellPrice, setSellPrice] = useState((item.sellPriceCents / 100).toFixed(2));
  const [sellPriceDirty, setSellPriceDirty] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<string>("");
  const [pendingCost, setPendingCost] = useState("");

  useEffect(() => {
    setSellPrice((item.sellPriceCents / 100).toFixed(2));
    setSellPriceDirty(false);
  }, [item.sellPriceCents]);

  const existingCategories = item.cogs.map(c => c.category);
  const availableDirectCategories = DIRECT_CATEGORIES.filter(c => !existingCategories.includes(c));

  const addCogsMutation = useMutation({
    mutationFn: ({ category, amountCents }: { category: string; amountCents: number }) =>
      apiRequest("PUT", `/api/vendor/cogs/item/${item.catalogItemId}`, { category, amountCents }),
    onSuccess: () => {
      setPendingCategory("");
      setPendingCost("");
      toast({ title: "COGS entry added" });
      onSaved();
    },
    onError: (e: any) => toast({ title: "Failed to add COGS", description: e.message, variant: "destructive" }),
  });

  const deleteCogsMutation = useMutation({
    mutationFn: (category: string) =>
      apiRequest("DELETE", `/api/vendor/cogs/item/${item.catalogItemId}/${encodeURIComponent(category)}`),
    onSuccess: () => { toast({ title: "COGS entry removed" }); onSaved(); },
    onError: (e: any) => toast({ title: "Failed to remove", description: e.message, variant: "destructive" }),
  });

  const updateCogsMutation = useMutation({
    mutationFn: ({ category, amountCents }: { category: string; amountCents: number }) =>
      apiRequest("PUT", `/api/vendor/cogs/item/${item.catalogItemId}`, { category, amountCents }),
    onSuccess: () => { toast({ title: "Cost updated" }); onSaved(); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const updateSellPriceMutation = useMutation({
    mutationFn: (priceCents: number) =>
      apiRequest("PATCH", `/api/vendor/catalog/${item.catalogItemId}`, { priceCents }),
    onSuccess: () => {
      setSellPriceDirty(false);
      toast({ title: "Sell price updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      onSaved();
    },
    onError: (e: any) => toast({ title: "Failed to update price", description: e.message, variant: "destructive" }),
  });

  const sellPriceCents = parseDollars(sellPrice);
  const directCogs = item.cogs.reduce((s, c) => s + c.amountCents, 0);
  const totalCogsPerItem = directCogs + overheadPerItemCents;
  const revenue = sellPriceCents * item.quantitySold;
  const gross = revenue - directCogs * item.quantitySold;
  const net = revenue - totalCogsPerItem * item.quantitySold;

  return (
    <Card className="rounded-2xl overflow-hidden" data-testid={`card-cogs-item-${item.catalogItemId}`}>
      <button
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        data-testid={`button-expand-item-${item.catalogItemId}`}
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{item.itemName}</p>
          <p className="text-xs text-muted-foreground">{item.quantityAssigned} assigned · {item.quantitySold} sold</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <ProfitBadge cents={net} />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50">
          <CardContent className="p-5 space-y-5">
            {/* Sell Price */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Sell Price</label>
              <div className="flex items-center gap-2 max-w-[200px]">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    value={sellPrice}
                    onChange={e => { setSellPrice(e.target.value); setSellPriceDirty(true); }}
                    onBlur={e => { const n = parseFloat(e.target.value); setSellPrice(isNaN(n) ? "0.00" : n.toFixed(2)); }}
                    className="pl-6 rounded-xl text-sm"
                    placeholder="0.00"
                    data-testid={`input-sell-price-${item.catalogItemId}`}
                  />
                </div>
                {sellPriceDirty && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs"
                    disabled={updateSellPriceMutation.isPending}
                    onClick={() => updateSellPriceMutation.mutate(parseDollars(sellPrice))}
                    data-testid={`button-save-price-${item.catalogItemId}`}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* COGS Entries */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">Cost of Goods</label>
              <div className="space-y-2">
                {item.cogs.map(entry => (
                  <CogsEntryRow
                    key={entry.category}
                    category={entry.category}
                    amountCents={entry.amountCents}
                    onUpdate={(cents) => updateCogsMutation.mutate({ category: entry.category, amountCents: cents })}
                    onDelete={() => deleteCogsMutation.mutate(entry.category)}
                    isPending={deleteCogsMutation.isPending || updateCogsMutation.isPending}
                  />
                ))}

                {/* Overhead rows (read-only, shown per dispersal) */}
                {overheadPerItemCents > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30">
                    <div className="flex-1">
                      <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">Event Overhead (dispersed)</span>
                      <span className="text-xs text-muted-foreground ml-2">÷ {totalItems} items</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{fmt(overheadPerItemCents)}/item</span>
                  </div>
                )}

                {/* Add new COGS entry */}
                {availableDirectCategories.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Select value={pendingCategory} onValueChange={setPendingCategory}>
                      <SelectTrigger className="rounded-xl text-sm flex-1" data-testid={`select-cogs-category-${item.catalogItemId}`}>
                        <SelectValue placeholder="Add COGS category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDirectCategories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pendingCategory && (
                      <>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            value={pendingCost}
                            onChange={e => setPendingCost(e.target.value)}
                            className="pl-6 rounded-xl text-sm"
                            placeholder="0.00"
                            data-testid={`input-cogs-cost-${item.catalogItemId}`}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={!pendingCost || addCogsMutation.isPending}
                          onClick={() => addCogsMutation.mutate({ category: pendingCategory, amountCents: parseDollars(pendingCost) })}
                          data-testid={`button-add-cogs-${item.catalogItemId}`}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />Add
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCell label="Total COGS/Unit" value={fmt(totalCogsPerItem)} neutral />
              <SummaryCell label={`Revenue (${item.quantitySold} sold)`} value={fmt(revenue)} neutral />
              <SummaryCell label="Gross Profit" value={fmt(gross)} profit={gross} />
              <SummaryCell label="Net Profit" value={fmt(net)} profit={net} highlight />
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}

function CogsEntryRow({ category, amountCents, onUpdate, onDelete, isPending }: {
  category: string;
  amountCents: number;
  onUpdate: (cents: number) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState((amountCents / 100).toFixed(2));

  useEffect(() => {
    setVal((amountCents / 100).toFixed(2));
    setEditing(false);
  }, [amountCents]);

  return (
    <div className="flex items-center gap-2 group px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors border border-border/40">
      <span className="text-sm font-medium flex-1 text-foreground">{category}</span>
      {editing ? (
        <>
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={e => { const n = parseFloat(e.target.value); setVal(isNaN(n) ? "0.00" : n.toFixed(2)); }}
              className="pl-6 rounded-lg text-sm h-8"
              autoFocus
            />
          </div>
          <Button size="sm" className="rounded-lg h-8 text-xs" disabled={isPending}
            onClick={() => { onUpdate(parseDollars(val)); setEditing(false); }}>Save</Button>
          <Button size="sm" variant="ghost" className="rounded-lg h-8 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
        </>
      ) : (
        <>
          <button className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-1"
            onClick={() => setEditing(true)}>
            {fmt(amountCents)}<span className="text-xs text-muted-foreground ml-1">/unit</span>
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
            onClick={onDelete}
            disabled={isPending}
            title="Remove this COGS entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function SummaryCell({ label, value, neutral, profit, highlight }: {
  label: string; value: string; neutral?: boolean; profit?: number; highlight?: boolean;
}) {
  const isPositive = profit !== undefined && profit > 0;
  const isNegative = profit !== undefined && profit < 0;
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
      <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
      <p className={`text-sm font-bold ${isPositive ? "text-green-600 dark:text-green-400" : isNegative ? "text-red-500 dark:text-red-400" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export default function CogsTrackerPage() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isPro = profile && (profile.subscriptionTier === "vendor_pro" || profile.subscriptionTier === "event_owner_pro") && profile.subscriptionStatus === "active";
  const isAdmin = profile?.isAdmin === true;
  const hasAccess = isPro || isAdmin;

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: eventOptions = [] } = useQuery<{ id: number; title: string; date: string }[]>({
    queryKey: ["/api/vendor/cogs/events"],
    enabled: hasAccess,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<EventSummary>({
    queryKey: ["/api/vendor/cogs/summary", selectedEventId],
    queryFn: () => fetch(`/api/vendor/cogs/summary/${selectedEventId}`, { credentials: "include" }).then(r => r.json()),
    enabled: hasAccess && selectedEventId !== null,
  });

  const refreshSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/vendor/cogs/summary", selectedEventId] });
  }, [queryClient, selectedEventId]);

  if (profileData === undefined) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Crown className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pro Feature</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">The COGS & Profit Tracker is available for VendorGrid Pro subscribers.</p>
        </div>
        <Link href="/upgrade">
          <Button className="rounded-xl gap-2">
            <Crown className="w-4 h-4" />Upgrade to Pro
          </Button>
        </Link>
      </div>
    );
  }


  const totalRevenue = summary?.items.reduce((s, i) => s + i.revenueCents, 0) ?? 0;
  const totalNet = summary?.items.reduce((s, i) => s + i.netProfitCents, 0) ?? 0;
  const totalGross = summary?.items.reduce((s, i) => s + i.grossProfitCents, 0) ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            COGS & Profit Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your cost of goods and profitability per item per event.</p>
        </div>
        <Badge className="gap-1.5 h-7 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
          <Crown className="w-3.5 h-3.5" />Pro
        </Badge>
      </div>

      {/* Event Selector */}
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <label className="text-sm font-semibold block mb-2">Select Event</label>
          {eventOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't registered for any events yet. Register for an event and assign catalog items to start tracking.
            </p>
          ) : (
            <Select
              value={selectedEventId?.toString() ?? ""}
              onValueChange={v => setSelectedEventId(parseInt(v))}
            >
              <SelectTrigger className="rounded-xl max-w-sm" data-testid="select-cogs-event">
                <SelectValue placeholder="Choose an event…" />
              </SelectTrigger>
              <SelectContent>
                {eventOptions.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>
                    {e.title} {e.date ? `· ${format(new Date(e.date), "MMM d, yyyy")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Summary totals */}
      {selectedEventId && summary && summary.items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCell label="Total Revenue" value={fmt(totalRevenue)} neutral />
          <SummaryCell label="Gross Profit" value={fmt(totalGross)} profit={totalGross} />
          <SummaryCell label="Net Profit" value={fmt(totalNet)} profit={totalNet} highlight />
        </div>
      )}

      {selectedEventId && (
        summaryLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[120px] w-full rounded-2xl" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
          </div>
        ) : !summary || summary.items.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Package className="w-12 h-12 text-muted-foreground opacity-30" />
              <div>
                <p className="font-semibold text-foreground">No items assigned to this event</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to your profile to add catalog items and assign them to this event.
                </p>
              </div>
              <Link href="/profile?tab=catalog">
                <Button variant="outline" size="sm" className="rounded-xl mt-1">Manage Catalog</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <OverheadSection
              eventId={selectedEventId}
              summary={summary}
              onSaved={refreshSummary}
            />

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Items at this event ({summary.items.length})
              </h2>
              {summary.items.map(item => (
                <ItemCogsSection
                  key={item.catalogItemId}
                  item={item}
                  eventId={selectedEventId}
                  overheadPerItemCents={summary.overheadPerItemCents}
                  totalItems={summary.totalItemsAtEvent}
                  onSaved={refreshSummary}
                />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
