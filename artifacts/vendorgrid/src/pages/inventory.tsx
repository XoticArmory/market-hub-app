import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package, PlusCircle, Eye, CalendarCheck, Map, BarChart3,
  Upload, X, ImageIcon, Loader2, Trash2, Tag, MapPin,
  Trophy, CheckCircle2, FileDown
} from "lucide-react";

interface CatalogItem {
  id: number;
  itemName: string;
  quantity: number;
  priceCents: number;
  costCents: number;
  imageUrl: string | null;
  images: string[];
  variations: string[];
  assignments: { id: number; eventId: number; quantityAssigned: number }[];
}

interface EventOption {
  id: number;
  title: string;
  date: string | null;
}

interface AllocateRow {
  catalogItemId: number;
  itemName: string;
  qty: string;
  afterMarketReport: boolean;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryPage() {
  const [, setLocation] = useLocation();
  const { data: profileData } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profile = profileData?.profile;
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier && profile.subscriptionTier !== "free";

  const [logOpen, setLogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [endEventTarget, setEndEventTarget] = useState<EventOption | null>(null);
  const [endEventStep, setEndEventStep] = useState<"confirm" | "done">("confirm");
  const [endEventResult, setEndEventResult] = useState<{ generated: number; itemsUpdated: number } | null>(null);

  const [form, setForm] = useState({ itemName: "", quantity: "", priceCents: "", costCents: "" });
  const [variations, setVariations] = useState<string[]>([]);
  const [chipInput, setChipInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch allocate state
  const [batchEventId, setBatchEventId] = useState("");
  const [allocateRows, setAllocateRows] = useState<AllocateRow[]>([]);

  const { data: catalog = [] } = useQuery<CatalogItem[]>({
    queryKey: ["/api/vendor/catalog"],
    enabled: hasActivePro === true,
  });

  const { data: eventsWithAssignments = [] } = useQuery<EventOption[]>({
    queryKey: ["/api/vendor/cogs/events"],
    enabled: hasActivePro === true,
  });

  const { data: allEventsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    enabled: hasActivePro === true,
  });

  const allEvents: EventOption[] = allEventsRaw.map((e: any) => ({ id: e.id, title: e.title, date: e.date }));

  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/vendor/catalog/upload-image", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 5 - images.length);
    if (fileArr.length === 0) return;
    setUploadingImages(true);
    const urls = await Promise.all(fileArr.map(uploadImage));
    setImages(prev => [...prev, ...urls.filter(Boolean) as string[]].slice(0, 5));
    setUploadingImages(false);
  }, [images.length]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const createItem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendor/catalog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: editItem ? "Item updated!" : "Item logged!" });
      closeLog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/vendor/catalog/${editItem?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: "Item updated!" });
      closeLog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vendor/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: "Item deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const endEvent = useMutation({
    mutationFn: ({ eventId, generateReport }: { eventId: number; generateReport: boolean }) =>
      apiRequest("POST", `/api/vendor/event/${eventId}/end`, { generateReport }),
    onSuccess: (data: any) => {
      setEndEventResult({ generated: data.generated ?? 0, itemsUpdated: data.itemsUpdated ?? 0 });
      setEndEventStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/cogs/events"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const allocateBatch = useMutation({
    mutationFn: async ({ eventId, rows }: { eventId: number; rows: AllocateRow[] }) => {
      const toAllocate = rows.filter(r => Number(r.qty) > 0);
      await Promise.all(toAllocate.map(r =>
        apiRequest("POST", `/api/vendor/catalog/${r.catalogItemId}/assign`, {
          catalogItemId: r.catalogItemId,
          eventId,
          quantityAssigned: Number(r.qty),
          afterMarketReport: r.afterMarketReport,
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/cogs/events"] });
      toast({ title: "Items allocated to event!" });
      setAllocateOpen(false);
      setBatchEventId("");
      setAllocateRows([]);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openAllocate() {
    setBatchEventId("");
    setAllocateRows(catalog.map(item => ({
      catalogItemId: item.id,
      itemName: item.itemName,
      qty: "",
      afterMarketReport: false,
    })));
    setAllocateOpen(true);
  }

  function closeLog() {
    setLogOpen(false);
    setEditItem(null);
    setForm({ itemName: "", quantity: "", priceCents: "", costCents: "" });
    setVariations([]);
    setChipInput("");
    setImages([]);
  }

  function openEdit(item: CatalogItem) {
    setEditItem(item);
    setForm({
      itemName: item.itemName,
      quantity: String(item.quantity),
      priceCents: String(item.priceCents / 100),
      costCents: String((item.costCents ?? 0) / 100),
    });
    setVariations(item.variations || []);
    setChipInput("");
    setImages(item.images || []);
    setLogOpen(true);
  }

  function handleSubmitLog() {
    const data = {
      itemName: form.itemName.trim(),
      quantity: Number(form.quantity) || 0,
      priceCents: Math.round(Number(form.priceCents) * 100) || 0,
      costCents: Math.round(Number(form.costCents) * 100) || 0,
      images,
      imageUrl: images[0] || null,
      variations,
    };
    if (!data.itemName) { toast({ title: "Item name required", variant: "destructive" }); return; }
    if (editItem) updateItem.mutate(data);
    else createItem.mutate(data);
  }

  const batchHasAny = allocateRows.some(r => Number(r.qty) > 0);

  if (!hasActivePro) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Inventory</h2>
        <p className="text-muted-foreground mb-6">Upgrade to VendorGrid Pro to manage your inventory.</p>
        <Button onClick={() => setLocation("/upgrade")}>Upgrade to Pro</Button>
      </div>
    );
  }

  const totalItems = catalog.reduce((s, i) => s + i.quantity, 0);
  const totalValue = catalog.reduce((s, i) => s + i.quantity * i.priceCents, 0);
  const allocatedCount = catalog.filter(i => i.assignments?.length > 0).length;
  const unallocatedCount = catalog.length - allocatedCount;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage your catalog, track stock, and log sales</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{catalog.length}</div>
            <div className="text-sm text-muted-foreground">Catalog items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalItems}</div>
            <div className="text-sm text-muted-foreground">Total units</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{allocatedCount}</div>
            <div className="text-sm text-muted-foreground">Allocated to events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{unallocatedCount}</div>
            <div className="text-sm text-muted-foreground">Unallocated</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActionCard
          icon={<PlusCircle className="w-6 h-6" />}
          title="Log Items"
          description="Add or update items in your catalog"
          color="bg-blue-500/10 text-blue-600"
          onClick={() => setLogOpen(true)}
        />
        <ActionCard
          icon={<Eye className="w-6 h-6" />}
          title="View Items"
          description="Browse your full catalog with event assignments"
          color="bg-emerald-500/10 text-emerald-600"
          onClick={() => setViewOpen(true)}
        />
        <ActionCard
          icon={<CalendarCheck className="w-6 h-6" />}
          title="Allocate to Event"
          description="Assign catalog items to an upcoming event"
          color="bg-purple-500/10 text-purple-600"
          onClick={openAllocate}
        />
        <ActionCard
          icon={<Map className="w-6 h-6" />}
          title="Manage Events"
          description="Log sales and track inventory at your events"
          color="bg-orange-500/10 text-orange-600"
          onClick={() => setManageOpen(true)}
        />
        <ActionCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="View Analytics"
          description="Sales trends, revenue, and performance insights"
          color="bg-pink-500/10 text-pink-600"
          onClick={() => setLocation("/inventory/analytics")}
        />
      </div>

      {/* LOG ITEMS DIALOG */}
      <Dialog open={logOpen} onOpenChange={open => { if (!open) closeLog(); else setLogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Log New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Item Name *</Label>
              <Input placeholder="e.g. Handmade Candle" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" min="0" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Sell Price ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.priceCents} onChange={e => setForm(f => ({ ...f, priceCents: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Cost / Unit ($) <span className="text-muted-foreground text-xs">optional — used to calculate profit</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.costCents} onChange={e => setForm(f => ({ ...f, costCents: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Variations</Label>
              <div className="space-y-2">
                {variations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {variations.map((v, i) => (
                      <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary text-sm px-2.5 py-1 rounded-full">
                        {v}
                        <button type="button" onClick={() => setVariations(vs => vs.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="Type a variation and press Enter (e.g. Small, Red)"
                  value={chipInput}
                  onChange={e => setChipInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === ",") && chipInput.trim()) {
                      e.preventDefault();
                      const val = chipInput.trim().replace(/,$/, "");
                      if (val && !variations.includes(val)) setVariations(vs => [...vs, val]);
                      setChipInput("");
                    } else if (e.key === "Backspace" && chipInput === "" && variations.length > 0) {
                      setVariations(vs => vs.slice(0, -1));
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Press Enter or comma to add each option</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Photos <span className="text-muted-foreground text-xs">(up to 5)</span></Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingImages ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Drag & drop photos or click to browse</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => e.target.files && handleFiles(e.target.files)} />
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                      <button
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                        onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeLog}>Cancel</Button>
            <Button onClick={handleSubmitLog} disabled={createItem.isPending || updateItem.isPending}>
              {(createItem.isPending || updateItem.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? "Save Changes" : "Log Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW ITEMS DIALOG */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catalog Items</DialogTitle>
          </DialogHeader>
          {catalog.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2" />
              <p>No items yet. Log your first item!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {catalog.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/40 transition-colors">
                  {item.images?.[0] || item.imageUrl ? (
                    <img src={item.images?.[0] || item.imageUrl!} alt={item.itemName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{item.itemName}</p>
                      <Badge variant="outline">{formatPrice(item.priceCents)}</Badge>
                      <Badge variant="secondary">{item.quantity} units</Badge>
                    </div>
                    {item.variations?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.variations.map((v, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{v}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        <Package className="w-3 h-3" /> Inventory
                      </span>
                      {item.assignments?.map(a => {
                        const evTitle = allEventsRaw.find((e: any) => e.id === a.eventId)?.title;
                        return (
                          <span key={a.id} className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3" /> {evTitle || `Event #${a.eventId}`} · {a.quantityAssigned}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { openEdit(item); setViewOpen(false); }}>
                      <Tag className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ALLOCATE TO EVENT DIALOG — batch mode */}
      <Dialog open={allocateOpen} onOpenChange={open => { if (!open) { setAllocateOpen(false); setBatchEventId(""); setAllocateRows([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocate to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Event *</Label>
              <Select value={batchEventId} onValueChange={setBatchEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {allEvents.map(ev => (
                    <SelectItem key={ev.id} value={String(ev.id)}>{ev.title}</SelectItem>
                  ))}
                  {allEvents.length === 0 && (
                    <SelectItem value="_none" disabled>No events found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {allocateRows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No catalog items yet. Log items first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Enter quantity for each item to bring. Leave blank to skip.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {allocateRows.map((row, idx) => (
                    <div key={row.catalogItemId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{row.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(catalog.find(c => c.id === row.catalogItemId)?.priceCents ?? 0)} · {catalog.find(c => c.id === row.catalogItemId)?.quantity ?? 0} in stock
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          className="w-20 h-8 text-sm"
                          value={row.qty}
                          onChange={e => setAllocateRows(rows => rows.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))}
                        />
                        <div className="flex items-center gap-1" title="After Market Report">
                          <Checkbox
                            checked={row.afterMarketReport}
                            onCheckedChange={checked => setAllocateRows(rows => rows.map((r, i) => i === idx ? { ...r, afterMarketReport: !!checked } : r))}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">AMR</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">AMR = After Market Report — auto-generate a sales CSV after the event ends.</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setAllocateOpen(false); setBatchEventId(""); setAllocateRows([]); }}>Cancel</Button>
            <Button
              disabled={!batchEventId || !batchHasAny || allocateBatch.isPending}
              onClick={() => allocateBatch.mutate({ eventId: Number(batchEventId), rows: allocateRows })}
            >
              {allocateBatch.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Allocate Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE EVENTS DIALOG */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Events</DialogTitle>
          </DialogHeader>
          {eventsWithAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Map className="w-10 h-10 mx-auto mb-2" />
              <p>No events with inventory assignments found.</p>
              <p className="text-xs mt-1">Allocate items to an event first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventsWithAssignments.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 p-3 rounded-xl border hover:bg-muted/20 transition-colors">
                  <button
                    className="flex-1 text-left"
                    onClick={() => { setManageOpen(false); setLocation(`/inventory/events/${ev.id}`); }}
                  >
                    <p className="font-medium">{ev.title}</p>
                    {ev.date && <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</p>}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-400"
                    onClick={() => {
                      setEndEventTarget(ev);
                      setEndEventStep("confirm");
                      setEndEventResult(null);
                    }}
                  >
                    <Trophy className="w-3.5 h-3.5 mr-1" />
                    End Event
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* END EVENT DIALOG */}
      <Dialog open={!!endEventTarget} onOpenChange={(open) => { if (!open) setEndEventTarget(null); }}>
        <DialogContent className="max-w-sm text-center">
          {endEventStep === "confirm" ? (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-xl font-bold">Great market day! 🎉</h2>
                <p className="text-muted-foreground text-sm">
                  Congrats on wrapping up <span className="font-medium text-foreground">{endEventTarget?.title}</span>!
                  Your sold quantities will be deducted from your catalog stock.
                </p>
                <p className="text-sm font-medium mt-1">Generate a sales report?</p>
                <p className="text-xs text-muted-foreground">
                  A CSV summary will be saved to your file folder with revenue, profit, and per-item breakdown.
                </p>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={endEvent.isPending}
                  onClick={() => endEvent.mutate({ eventId: endEventTarget!.id, generateReport: false })}
                >
                  {endEvent.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Skip Report
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  disabled={endEvent.isPending}
                  onClick={() => endEvent.mutate({ eventId: endEventTarget!.id, generateReport: true })}
                >
                  {endEvent.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  Yes, Generate Report
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold">All done!</h2>
                {endEventResult && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {endEventResult.itemsUpdated > 0 && (
                      <p>✓ Updated stock for <span className="font-medium text-foreground">{endEventResult.itemsUpdated} item{endEventResult.itemsUpdated !== 1 ? "s" : ""}</span></p>
                    )}
                    {endEventResult.generated > 0 ? (
                      <p>✓ Sales report saved to your <span className="font-medium text-foreground">Files</span> folder</p>
                    ) : (
                      <p className="text-xs">No report generated (no sales logged or report already exists)</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={() => setEndEventTarget(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionCard({
  icon, title, description, color, onClick
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border hover:border-primary/40 hover:bg-muted/30 transition-all group"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="font-semibold group-hover:text-primary transition-colors">{title}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}
