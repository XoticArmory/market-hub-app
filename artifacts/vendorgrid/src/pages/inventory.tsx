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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package, PlusCircle, Eye, CalendarCheck, Map, BarChart3,
  Upload, X, ImageIcon, Loader2, Trash2, Tag, MapPin
} from "lucide-react";

interface CatalogItem {
  id: number;
  itemName: string;
  quantity: number;
  priceCents: number;
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

  const [form, setForm] = useState({ itemName: "", quantity: "", priceCents: "", variations: "" });
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allocateForm, setAllocateForm] = useState({
    catalogItemId: "",
    eventId: "",
    quantityAssigned: "",
    afterMarketReport: false,
  });

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
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
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

  const allocateItem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/vendor/catalog/${data.catalogItemId}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: "Allocated to event!" });
      setAllocateOpen(false);
      setAllocateForm({ catalogItemId: "", eventId: "", quantityAssigned: "", afterMarketReport: false });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function closeLog() {
    setLogOpen(false);
    setEditItem(null);
    setForm({ itemName: "", quantity: "", priceCents: "", variations: "" });
    setImages([]);
  }

  function openEdit(item: CatalogItem) {
    setEditItem(item);
    setForm({
      itemName: item.itemName,
      quantity: String(item.quantity),
      priceCents: String(item.priceCents / 100),
      variations: item.variations?.join(", ") || "",
    });
    setImages(item.images || []);
    setLogOpen(true);
  }

  function handleSubmitLog() {
    const data = {
      itemName: form.itemName.trim(),
      quantity: Number(form.quantity) || 0,
      priceCents: Math.round(Number(form.priceCents) * 100) || 0,
      images,
      imageUrl: images[0] || null,
      variations: form.variations ? form.variations.split(",").map(v => v.trim()).filter(Boolean) : [],
    };
    if (!data.itemName) return toast({ title: "Item name required", variant: "destructive" });
    if (editItem) updateItem.mutate(data);
    else createItem.mutate(data);
  }

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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <div className="text-2xl font-bold">{formatPrice(totalValue)}</div>
            <div className="text-sm text-muted-foreground">Catalog value</div>
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
          onClick={() => setAllocateOpen(true)}
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
                <Label>Price ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.priceCents} onChange={e => setForm(f => ({ ...f, priceCents: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Variations <span className="text-muted-foreground text-xs">(comma-separated, e.g. Small, Medium, Large)</span></Label>
              <Input placeholder="Red, Blue, Green" value={form.variations} onChange={e => setForm(f => ({ ...f, variations: e.target.value }))} />
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
                    {item.assignments?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.assignments.map(a => (
                          <span key={a.id} className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3" /> Event #{a.eventId} · {a.quantityAssigned}
                          </span>
                        ))}
                      </div>
                    )}
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

      {/* ALLOCATE TO EVENT DIALOG */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Catalog Item *</Label>
              <Select value={allocateForm.catalogItemId} onValueChange={v => setAllocateForm(f => ({ ...f, catalogItemId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an item" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.itemName} ({item.quantity} units)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event *</Label>
              <Select value={allocateForm.eventId} onValueChange={v => setAllocateForm(f => ({ ...f, eventId: v }))}>
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
            <div className="space-y-1">
              <Label>Quantity to Bring *</Label>
              <Input type="number" min="0" placeholder="0" value={allocateForm.quantityAssigned}
                onChange={e => setAllocateForm(f => ({ ...f, quantityAssigned: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Checkbox
                id="amr"
                checked={allocateForm.afterMarketReport}
                onCheckedChange={checked => setAllocateForm(f => ({ ...f, afterMarketReport: !!checked }))}
              />
              <div>
                <Label htmlFor="amr" className="cursor-pointer">After Market Report</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Generate a sales summary report after the event ends</p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setAllocateOpen(false)}>Cancel</Button>
            <Button
              disabled={!allocateForm.catalogItemId || !allocateForm.eventId || !allocateForm.quantityAssigned || allocateItem.isPending}
              onClick={() => allocateItem.mutate({
                catalogItemId: Number(allocateForm.catalogItemId),
                eventId: Number(allocateForm.eventId),
                quantityAssigned: Number(allocateForm.quantityAssigned),
                afterMarketReport: allocateForm.afterMarketReport,
              })}
            >
              {allocateItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Allocate
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
                <button
                  key={ev.id}
                  className="w-full text-left p-3 rounded-xl border hover:bg-muted/40 transition-colors flex items-center justify-between"
                  onClick={() => { setManageOpen(false); setLocation(`/inventory/events/${ev.id}`); }}
                >
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    {ev.date && <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</p>}
                  </div>
                  <Map className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
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
