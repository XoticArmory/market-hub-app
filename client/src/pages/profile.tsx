import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/image-upload";
import { useProfile, useUpsertProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { usePortalSession } from "@/hooks/use-stripe";
import { useNotifications, useMarkAllRead } from "@/hooks/use-notifications";
import { useSendNotification } from "@/hooks/use-notifications";
import { useOwnerAnalytics } from "@/hooks/use-analytics";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Store, Package, Users, CreditCard, CheckCircle, Loader2, MapPin, ShieldCheck, Bell, BarChart3, Map, Star, Crown, Send, TrendingUp, Eye, ShoppingBag, Plus, Pencil, Trash2, DollarSign, Tag, XCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEvents } from "@/hooks/use-events";
import { format } from "date-fns";
import { EventMapEditor } from "@/components/EventMapEditor";
import { useToast } from "@/hooks/use-toast";

const PROFILE_TYPES = [
  { value: "event_owner", label: "Event Owner", icon: Store, description: "I organize and host local markets and events." },
  { value: "vendor", label: "Vendor", icon: Package, description: "I sell products and crafts at local markets." },
  { value: "general", label: "General", icon: Users, description: "I attend markets as a customer or community member." },
];

const TIER_LABELS: Record<string, string> = {
  event_owner_pro: "Event Owner Pro",
  vendor_pro: "Vendor Pro",
  free: "Free",
};

function tierToProfileType(tier?: string | null, status?: string | null): string {
  if (status === "active") {
    if (tier === "event_owner_pro") return "event_owner";
    if (tier === "vendor_pro") return "vendor";
  }
  return "general";
}

function VendorAnalyticsTab({ userId }: { userId: string }) {
  const { toast } = useToast();

  // Inventory tracker state
  const [selectedEventId, setSelectedEventId] = useState<number | "">("");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ itemName: "", quantityBrought: "", quantitySold: "", priceCents: "" });

  // Catalog state
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<any>(null);
  const [catalogForm, setCatalogForm] = useState({ itemName: "", quantity: "", priceCents: "", imageUrl: "" });
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningItem, setAssigningItem] = useState<any>(null);
  const [assignEventId, setAssignEventId] = useState<string>("");
  const [assignQty, setAssignQty] = useState<string>("");

  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/vendor/analytics"],
  });

  const { data: inventory, isLoading: isLoadingInventory } = useQuery<any[]>({
    queryKey: ["/api/vendor/inventory", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId ? `/api/vendor/inventory?eventId=${selectedEventId}` : "/api/vendor/inventory";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery<any[]>({
    queryKey: ["/api/vendor/catalog"],
  });

  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Inventory mutations
  const createItem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendor/inventory", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/analytics"] });
      setShowItemDialog(false);
      setItemForm({ itemName: "", quantityBrought: "", quantitySold: "", priceCents: "" });
      toast({ title: "Item added!" });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/vendor/inventory/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/analytics"] });
      setShowItemDialog(false);
      setEditingItem(null);
      toast({ title: "Item updated!" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vendor/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/analytics"] });
      toast({ title: "Item removed." });
    },
  });

  const logSale = useMutation({
    mutationFn: ({ id, quantitySold }: { id: number; quantitySold: number }) =>
      apiRequest("PATCH", `/api/vendor/inventory/${id}`, { quantitySold }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/analytics"] });
    },
  });

  // Catalog mutations
  const createCatalogItem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendor/catalog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      setShowCatalogDialog(false);
      setCatalogForm({ itemName: "", quantity: "", priceCents: "", imageUrl: "" });
      toast({ title: "Item added to catalog!" });
    },
  });

  const updateCatalogItem = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/vendor/catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      setShowCatalogDialog(false);
      setEditingCatalog(null);
      toast({ title: "Item updated!" });
    },
  });

  const deleteCatalogItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vendor/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: "Item removed from catalog." });
    },
  });

  const assignToEvent = useMutation({
    mutationFn: ({ id, eventId, quantityAssigned }: any) =>
      apiRequest("POST", `/api/vendor/catalog/${id}/assign`, { eventId, quantityAssigned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      setShowAssignDialog(false);
      setAssignEventId("");
      setAssignQty("");
      toast({ title: "Item assigned to event!" });
    },
  });

  const removeAssignment = useMutation({
    mutationFn: ({ catalogItemId, eventId }: any) =>
      apiRequest("DELETE", `/api/vendor/catalog/${catalogItemId}/assign/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: "Assignment removed." });
    },
  });

  const openAddCatalog = () => {
    setEditingCatalog(null);
    setCatalogForm({ itemName: "", quantity: "", priceCents: "", imageUrl: "" });
    setShowCatalogDialog(true);
  };

  const openEditCatalog = (item: any) => {
    setEditingCatalog(item);
    setCatalogForm({
      itemName: item.itemName,
      quantity: String(item.quantity),
      priceCents: String(item.priceCents / 100),
      imageUrl: item.imageUrl || "",
    });
    setShowCatalogDialog(true);
  };

  const handleSaveCatalog = () => {
    const payload = {
      itemName: catalogForm.itemName,
      quantity: Number(catalogForm.quantity) || 0,
      priceCents: Math.round(parseFloat(catalogForm.priceCents || "0") * 100),
      imageUrl: catalogForm.imageUrl || null,
    };
    if (editingCatalog) {
      updateCatalogItem.mutate({ id: editingCatalog.id, ...payload });
    } else {
      createCatalogItem.mutate(payload);
    }
  };

  const openAssign = (item: any) => {
    setAssigningItem(item);
    setAssignEventId("");
    setAssignQty(String(item.quantity));
    setShowAssignDialog(true);
  };

  const handleAssign = () => {
    if (!assignEventId || !assignQty) return;
    assignToEvent.mutate({ id: assigningItem.id, eventId: Number(assignEventId), quantityAssigned: Number(assignQty) });
  };

  const openAdd = () => {
    setEditingItem(null);
    setItemForm({ itemName: "", quantityBrought: "", quantitySold: "", priceCents: "" });
    setShowItemDialog(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setItemForm({
      itemName: item.itemName,
      quantityBrought: String(item.quantityBrought),
      quantitySold: String(item.quantitySold),
      priceCents: String(item.priceCents),
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = () => {
    const payload = {
      eventId: selectedEventId || undefined,
      itemName: itemForm.itemName,
      quantityBrought: Number(itemForm.quantityBrought) || 0,
      quantitySold: Number(itemForm.quantitySold) || 0,
      priceCents: Math.round(parseFloat(itemForm.priceCents || "0") * 100),
    };
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...payload });
    } else {
      if (!payload.eventId) { toast({ title: "Select an event first", variant: "destructive" }); return; }
      createItem.mutate(payload);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const attendedEvents = analytics?.attendedEvents || [];
  const profileViewCount = analytics?.profileViewCount ?? 0;
  const itemSummary = analytics?.itemSummary || {};
  const inventoryByEvent: Record<number, any[]> = analytics?.inventoryByEvent || {};

  const totalRevenueCents = Object.values(itemSummary).reduce((sum: number, v: any) => sum + (v.totalRevenueCents || 0), 0);
  const totalSold = Object.values(itemSummary).reduce((sum: number, v: any) => sum + (v.totalSold || 0), 0);

  const activeEvents = (allEvents as any[]).filter((e: any) => !e.canceledAt);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Events Attended", value: attendedEvents.length, icon: CheckCircle },
          { label: "Profile Views", value: profileViewCount, icon: Eye },
          { label: "Items Sold", value: totalSold, icon: ShoppingBag },
          { label: "Revenue", value: `$${(totalRevenueCents / 100).toFixed(2)}`, icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* My Items Catalog */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" />My Items</CardTitle>
            <CardDescription>Log your products here, then assign them to events so they appear on your vendor card.</CardDescription>
          </div>
          <Button size="sm" className="rounded-xl" onClick={openAddCatalog} data-testid="button-add-catalog-item">
            <Plus className="w-4 h-4 mr-1" />Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingCatalog ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (catalogItems as any[]).length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No items yet. Add items to your catalog to assign them to events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(catalogItems as any[]).map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/40" data-testid={`catalog-item-${item.id}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.itemName} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/30" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/30">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.itemName}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity} · ${(item.priceCents / 100).toFixed(2)} each</p>
                    {item.assignments?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.assignments.map((a: any) => {
                          const ev = activeEvents.find((e: any) => e.id === a.eventId);
                          return ev ? (
                            <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                              {ev.title} ({a.quantityAssigned})
                              <button
                                onClick={() => removeAssignment.mutate({ catalogItemId: item.id, eventId: a.eventId })}
                                className="ml-1 hover:text-destructive transition-colors"
                                data-testid={`button-remove-assignment-${item.id}-${a.eventId}`}
                              >×</button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="rounded-xl h-8 px-3 text-xs" onClick={() => openAssign(item)} data-testid={`button-assign-${item.id}`}>
                      Assign to Event
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditCatalog(item)} data-testid={`button-edit-catalog-${item.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteCatalogItem.mutate(item.id)} data-testid={`button-delete-catalog-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {attendedEvents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-primary" />Events Attended</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendedEvents.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl" data-testid={`attended-event-${ev.id}`}>
                  <div>
                    <p className="font-medium text-foreground">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.location} · {format(new Date(ev.date), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right text-sm">
                    {inventoryByEvent[ev.id]?.length > 0 && (
                      <Badge variant="secondary">{inventoryByEvent[ev.id].length} item{inventoryByEvent[ev.id].length !== 1 ? "s" : ""} tracked</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(itemSummary).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Sales Summary</CardTitle><CardDescription>Aggregated across all events.</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Item</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Sold</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Revenue</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(itemSummary).map(([name, data]: [string, any]) => (
                    <tr key={name} className="border-b border-border/30 hover:bg-muted/30 transition-colors" data-testid={`item-summary-${name}`}>
                      <td className="py-3 px-3 font-medium">{name}</td>
                      <td className="py-3 px-3 text-right">{data.totalSold}</td>
                      <td className="py-3 px-3 text-right text-green-600 font-semibold">${(data.totalRevenueCents / 100).toFixed(2)}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{data.events.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" />Inventory Tracker</CardTitle>
            <CardDescription>Log items you brought to each event and track what you sold.</CardDescription>
          </div>
          <Button size="sm" className="rounded-xl" onClick={openAdd} data-testid="button-add-item" disabled={!selectedEventId}>
            <Plus className="w-4 h-4 mr-1" />Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Filter by Event</label>
            <select
              className="w-full h-11 rounded-xl border border-border px-3 bg-background text-foreground text-sm"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value ? Number(e.target.value) : "")}
              data-testid="select-inventory-event"
            >
              <option value="">All Events</option>
              {attendedEvents.map((ev: any) => (
                <option key={ev.id} value={ev.id}>{ev.title} — {format(new Date(ev.date), "MMM d, yyyy")}</option>
              ))}
            </select>
          </div>
          {isLoadingInventory ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (inventory || []).length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">{selectedEventId ? "No items tracked for this event yet." : "No inventory items yet."} {!selectedEventId && "Select an event to add items."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Item</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Brought</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Sold</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Remaining</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Price</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Revenue</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(inventory || []).map((item: any) => {
                    const remaining = Math.max(0, item.quantityBrought - item.quantitySold);
                    const pct = item.quantityBrought > 0 ? remaining / item.quantityBrought : 0;
                    const remainingColor = remaining === 0 ? "text-destructive font-bold" : pct <= 0.25 ? "text-amber-500 font-semibold" : "text-green-600 font-semibold";
                    const isSaving = logSale.isPending;
                    return (
                      <tr key={item.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors" data-testid={`inventory-item-${item.id}`}>
                        <td className="py-3 px-3 font-medium">{item.itemName}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{item.quantityBrought}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              className="w-6 h-6 rounded-md bg-muted hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40"
                              onClick={() => item.quantitySold > 0 && logSale.mutate({ id: item.id, quantitySold: item.quantitySold - 1 })}
                              disabled={item.quantitySold <= 0 || isSaving}
                              data-testid={`button-unsell-${item.id}`}
                              title="Undo 1 sale"
                            >−</button>
                            <span className="w-8 text-center font-semibold tabular-nums" data-testid={`sold-count-${item.id}`}>{item.quantitySold}</span>
                            <button
                              className="w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center font-bold transition-colors disabled:opacity-40"
                              onClick={() => item.quantitySold < item.quantityBrought && logSale.mutate({ id: item.id, quantitySold: item.quantitySold + 1 })}
                              disabled={item.quantitySold >= item.quantityBrought || isSaving}
                              data-testid={`button-sell-${item.id}`}
                              title="Log 1 sale"
                            >+</button>
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-right ${remainingColor}`} data-testid={`remaining-${item.id}`}>
                          {remaining === 0 ? "Sold out" : remaining}
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground">${(item.priceCents / 100).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right text-green-600 font-semibold">${((item.quantitySold * item.priceCents) / 100).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)} data-testid={`button-edit-item-${item.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteItem.mutate(item.id)} data-testid={`button-delete-item-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Catalog Item Dialog */}
      <Dialog open={showCatalogDialog} onOpenChange={setShowCatalogDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{editingCatalog ? "Edit Item" : "Add Item to Catalog"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-semibold mb-2 block">Item Name</label>
              <Input data-testid="input-catalog-name" placeholder="e.g. Hand-poured candles" value={catalogForm.itemName} onChange={e => setCatalogForm(f => ({ ...f, itemName: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-2 block">Quantity</label>
                <Input data-testid="input-catalog-qty" type="number" min="0" placeholder="0" value={catalogForm.quantity} onChange={e => setCatalogForm(f => ({ ...f, quantity: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Price ($)</label>
                <Input data-testid="input-catalog-price" type="number" min="0" step="0.01" placeholder="0.00" value={catalogForm.priceCents} onChange={e => setCatalogForm(f => ({ ...f, priceCents: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Photo (optional)</label>
              <ImageUpload
                value={catalogForm.imageUrl}
                onChange={url => setCatalogForm(f => ({ ...f, imageUrl: url }))}
                data-testid="input-catalog-image"
              />
            </div>
            <Button className="w-full rounded-xl" disabled={!catalogForm.itemName || createCatalogItem.isPending || updateCatalogItem.isPending} onClick={handleSaveCatalog} data-testid="button-save-catalog">
              {(createCatalogItem.isPending || updateCatalogItem.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : editingCatalog ? "Update Item" : "Add to Catalog"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Event Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Assign to Event</DialogTitle></DialogHeader>
          {assigningItem && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                {assigningItem.imageUrl ? (
                  <img src={assigningItem.imageUrl} alt={assigningItem.itemName} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>
                )}
                <div>
                  <p className="font-semibold text-sm">{assigningItem.itemName}</p>
                  <p className="text-xs text-muted-foreground">${(assigningItem.priceCents / 100).toFixed(2)} · {assigningItem.quantity} in stock</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Select Event</label>
                <select
                  className="w-full h-11 rounded-xl border border-border px-3 bg-background text-foreground text-sm"
                  value={assignEventId}
                  onChange={e => setAssignEventId(e.target.value)}
                  data-testid="select-assign-event"
                >
                  <option value="">Choose an event...</option>
                  {activeEvents.map((ev: any) => (
                    <option key={ev.id} value={ev.id}>{ev.title} — {format(new Date(ev.date), "MMM d, yyyy")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Quantity to Assign</label>
                <Input data-testid="input-assign-qty" type="number" min="1" max={assigningItem.quantity} placeholder="0" value={assignQty} onChange={e => setAssignQty(e.target.value)} className="rounded-xl" />
              </div>
              <Button className="w-full rounded-xl" disabled={!assignEventId || !assignQty || assignToEvent.isPending} onClick={handleAssign} data-testid="button-confirm-assign">
                {assignToEvent.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</> : "Assign to Event"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Inventory Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-semibold mb-2 block">Item Name</label>
              <Input data-testid="input-item-name" placeholder="e.g. Hand-poured candles" value={itemForm.itemName} onChange={e => setItemForm(f => ({ ...f, itemName: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold mb-2 block">Qty Brought</label>
                <Input data-testid="input-qty-brought" type="number" min="0" placeholder="0" value={itemForm.quantityBrought} onChange={e => setItemForm(f => ({ ...f, quantityBrought: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Qty Sold</label>
                <Input data-testid="input-qty-sold" type="number" min="0" placeholder="0" value={itemForm.quantitySold} onChange={e => setItemForm(f => ({ ...f, quantitySold: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Price ($)</label>
                <Input data-testid="input-price" type="number" min="0" step="0.01" placeholder="0.00" value={itemForm.priceCents} onChange={e => setItemForm(f => ({ ...f, priceCents: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <Button className="w-full rounded-xl" disabled={!itemForm.itemName || createItem.isPending || updateItem.isPending} onClick={handleSaveItem} data-testid="button-save-item">
              {(createItem.isPending || updateItem.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : editingItem ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TIER_LABELS_PROMO: Record<string, string> = {
  event_owner_pro: "Event Owner Pro",
  vendor_pro: "Vendor Pro",
};

function AdminPromoSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [promoForm, setPromoForm] = useState({ code: "", discountPercent: "", applicableTier: "all", expiresAt: "", maxUses: "" });

  const { data: codes = [], isLoading: loadingCodes } = useQuery<any[]>({
    queryKey: ["/api/admin/promo-codes"],
    queryFn: async () => { const r = await fetch("/api/admin/promo-codes", { credentials: "include" }); return r.json(); },
    enabled: !!userId,
  });

  const createCode = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setPromoForm({ code: "", discountPercent: "", applicableTier: "all", expiresAt: "", maxUses: "" });
      toast({ title: "Promo code created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeCode = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] }); toast({ title: "Code revoked" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!promoForm.code || !promoForm.discountPercent) return;
    createCode.mutate({
      code: promoForm.code,
      type: "discount",
      discountPercent: parseInt(promoForm.discountPercent),
      applicableTier: promoForm.applicableTier === "all" ? undefined : promoForm.applicableTier,
      expiresAt: promoForm.expiresAt || undefined,
      maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses) : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" />Promotion Codes</CardTitle>
        <CardDescription>Create discount codes to share with users for reduced subscription pricing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Form */}
        <div className="space-y-4 p-5 bg-muted/40 rounded-2xl border border-border/50">
          <p className="text-sm font-semibold text-foreground">New Promo Code</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Code</label>
              <Input placeholder="e.g. SPRING50" value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="rounded-xl font-mono" data-testid="input-billing-promo-code" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Discount %</label>
              <Input type="number" min={1} max={100} placeholder="e.g. 50" value={promoForm.discountPercent} onChange={e => setPromoForm(f => ({ ...f, discountPercent: e.target.value }))} className="rounded-xl" data-testid="input-billing-discount" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Applicable Tier</label>
              <select className="w-full h-10 rounded-xl border border-border px-3 bg-background text-foreground text-sm" value={promoForm.applicableTier} onChange={e => setPromoForm(f => ({ ...f, applicableTier: e.target.value }))}>
                <option value="all">Both tiers</option>
                <option value="event_owner_pro">Event Owner Pro only</option>
                <option value="vendor_pro">Vendor Pro only</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Max Uses (blank = unlimited)</label>
              <Input type="number" min={1} placeholder="e.g. 100" value={promoForm.maxUses} onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Expiry Date (optional)</label>
              <Input type="datetime-local" value={promoForm.expiresAt} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createCode.isPending || !promoForm.code || !promoForm.discountPercent} className="rounded-xl" data-testid="button-billing-create-promo">
            {createCode.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Tag className="w-4 h-4 mr-2" />Create Code</>}
          </Button>
        </div>

        {/* Existing Codes */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Active Codes</p>
          {loadingCodes ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            : codes.filter((c: any) => c.isActive).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active promo codes.</p>
            ) : (
              codes.filter((c: any) => c.isActive).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card" data-testid={`billing-promo-${c.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Tag className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-sm text-foreground">{c.code}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-xs">{c.discountPercent}% off</Badge>
                        {c.applicableTier && <Badge variant="outline" className="text-xs">{TIER_LABELS_PROMO[c.applicableTier] || c.applicableTier}</Badge>}
                        <Badge variant="outline" className="text-xs">{c.usesCount}{c.maxUses ? `/${c.maxUses}` : ''} uses</Badge>
                        {c.expiresAt && <Badge variant="outline" className="text-xs">Expires {format(new Date(c.expiresAt), "MMM d, yyyy")}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0 ml-3" onClick={() => revokeCode.mutate(c.id)} disabled={revokeCode.isPending} data-testid={`button-billing-revoke-${c.id}`}>
                    <XCircle className="w-4 h-4 mr-1" />Revoke
                  </Button>
                </div>
              ))
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const { data: profileData, isLoading: isLoadingProfile } = useProfile();
  const { mutate: upsertProfile, isPending: isSaving } = useUpsertProfile();
  const { mutate: portal, isPending: isPortal } = usePortalSession();
  const { data: events } = useEvents();
  const { data: notifications } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();
  const { mutate: sendNotification, isPending: isSendingNotif } = useSendNotification();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const validTabs = ["profile", "events", "notifications", "analytics", "map", "billing", "vendor-analytics"];
    if (tab && validTabs.includes(tab)) setActiveTab(tab);
  }, [location]);

  const profile = profileData?.profile;
  const userId = user?.id;
  const isAdmin = profile?.isAdmin === true;

  const isEventOwnerPro = isAdmin || (profile?.subscriptionTier === "event_owner_pro" && profile?.subscriptionStatus === "active");
  const isVendorPro = isAdmin || (profile?.subscriptionTier === "vendor_pro" && profile?.subscriptionStatus === "active");
  const hasActivePro = isAdmin || (profile?.subscriptionStatus === "active" && (profile?.subscriptionTier !== "free" && profile?.subscriptionTier !== null));

  const { data: analytics } = useOwnerAnalytics(isEventOwnerPro ? userId : undefined);

  const [form, setForm] = useState({
    profileType: profile?.profileType || "general",
    areaCode: profile?.areaCode || "",
    bio: profile?.bio || "",
    businessName: profile?.businessName || "",
    websiteUrl: profile?.websiteUrl || "",
  });
  const [notifForm, setNotifForm] = useState({ title: "", message: "", targetAudience: "vendor_pro" });
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [notifAreaCodes, setNotifAreaCodes] = useState<string[]>(() => profile?.notificationAreaCodes ?? []);
  const [notifAreaInput, setNotifAreaInput] = useState("");

  useEffect(() => {
    if (profile?.notificationAreaCodes) setNotifAreaCodes(profile.notificationAreaCodes);
  }, [profile?.notificationAreaCodes?.join(",")]);

  const { mutate: saveNotifAreas, isPending: isSavingAreas } = useMutation({
    mutationFn: (codes: string[]) => apiRequest("PATCH", "/api/profile/notification-areas", { notificationAreaCodes: codes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const addNotifArea = () => {
    const code = notifAreaInput.trim();
    if (!code || notifAreaCodes.includes(code) || notifAreaCodes.length >= 10) return;
    const next = [...notifAreaCodes, code];
    setNotifAreaCodes(next);
    setNotifAreaInput("");
    saveNotifAreas(next);
  };

  const removeNotifArea = (code: string) => {
    const next = notifAreaCodes.filter(c => c !== code);
    setNotifAreaCodes(next);
    saveNotifAreas(next);
  };

  if (profile && form.profileType === "general" && !form.areaCode && !form.bio) {
    setForm({
      profileType: profile.profileType || "general",
      areaCode: profile.areaCode || "",
      bio: profile.bio || "",
      businessName: profile.businessName || "",
      websiteUrl: profile.websiteUrl || "",
    });
  }

  const myEvents = events?.filter(e => e.createdBy === user?.id) || [];
  const attendingEventIds = (profileData?.attendance || []).filter((a: any) => a.status === "attending").map((a: any) => a.eventId);
  const attendingEvents = events?.filter(e => attendingEventIds.includes(e.id)) || [];
  const unreadCount = (notifications || []).filter((n: any) => !n.read).length;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <User className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Sign In Required</h2>
        <Button asChild size="lg" className="w-full rounded-xl"><a href="/api/login">Sign In</a></Button>
      </div>
    );
  }

  if (isLoadingProfile) {
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const currentTierLabel = isAdmin ? "All Access (Admin)" : TIER_LABELS[profile?.subscriptionTier || "free"];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-lg">
          <AvatarImage src={user?.profileImageUrl || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl"><User className="w-8 h-8" /></AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-foreground">{user?.firstName} {user?.lastName}</h1>
          <p className="text-muted-foreground">{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {profile && <Badge variant="secondary" className="capitalize">{tierToProfileType(profile.subscriptionTier, profile.subscriptionStatus).replace("_", " ")}</Badge>}
            {profile?.areaCode && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{profile.areaCode}</Badge>}
            {isAdmin && <Badge className="bg-amber-500 text-white"><ShieldCheck className="w-3 h-3 mr-1" />Admin — All Access</Badge>}
            {hasActivePro && !isAdmin && (
              <Badge className="bg-gradient-to-r from-primary to-amber-500 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />{currentTierLabel}
              </Badge>
            )}
          </div>
        </div>
        {!hasActivePro && (
          <Button className="rounded-xl bg-gradient-to-r from-primary to-amber-500 shadow-lg" onClick={() => setLocation("/upgrade")} data-testid="button-upgrade">
            <Crown className="w-4 h-4 mr-2" />Upgrade to Pro
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="profile" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Profile</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Billing</TabsTrigger>
          {isEventOwnerPro && (
            <>
              <TabsTrigger value="notifications" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm relative" data-testid="tab-notifications">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] inline-block text-center">{unreadCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-analytics">
                <BarChart3 className="w-4 h-4 mr-1.5" />Analytics
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Events</TabsTrigger>
              <TabsTrigger value="map" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-map">
                <Map className="w-4 h-4 mr-1.5" />Map
              </TabsTrigger>
            </>
          )}
          {isVendorPro && (
            <TabsTrigger value="vendor-analytics" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-vendor-analytics">
              <TrendingUp className="w-4 h-4 mr-1.5" />Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card>
            <CardHeader><CardTitle>Profile Settings</CardTitle><CardDescription>Manage your area code, business name, and bio.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block">Account Type</label>
                {(() => {
                  const current = PROFILE_TYPES.find(t => t.value === tierToProfileType(profile?.subscriptionTier, profile?.subscriptionStatus));
                  const Icon = current?.icon || Users;
                  return (
                    <div className="flex items-center gap-4 p-5 rounded-2xl border-2 border-primary bg-primary/5 w-fit" data-testid="display-account-type">
                      <Icon className="w-7 h-7 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{current?.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{current?.description}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Area Code / ZIP</label>
                  <Input data-testid="input-area-code" placeholder="e.g. 90210" value={form.areaCode} onChange={e => setForm(f => ({ ...f, areaCode: e.target.value }))} className="rounded-xl" />
                </div>
                {(tierToProfileType(profile?.subscriptionTier, profile?.subscriptionStatus) === "event_owner" || tierToProfileType(profile?.subscriptionTier, profile?.subscriptionStatus) === "vendor") && (
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Business Name</label>
                    <Input data-testid="input-business-name" placeholder="Your market or vendor name" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} className="rounded-xl" />
                  </div>
                )}
              </div>
              {isVendorPro && (
                <div>
                  <label className="text-sm font-semibold mb-1 block flex items-center gap-2">
                    Notification Area Codes
                    <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">Vendor Pro</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">Add extra ZIP / area codes to receive push notifications from events in those areas too. Up to 10 total.</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {notifAreaCodes.map(code => (
                      <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary" data-testid={`badge-notif-area-${code}`}>
                        <MapPin className="w-3 h-3" />
                        {code}
                        <button onClick={() => removeNotifArea(code)} className="ml-0.5 hover:text-destructive transition-colors" data-testid={`button-remove-notif-area-${code}`} aria-label={`Remove ${code}`}>
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    {notifAreaCodes.length === 0 && <p className="text-sm text-muted-foreground italic">No extra areas added yet.</p>}
                  </div>
                  {notifAreaCodes.length < 10 && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 90210"
                        value={notifAreaInput}
                        onChange={e => setNotifAreaInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addNotifArea()}
                        className="rounded-xl max-w-[160px]"
                        data-testid="input-notif-area-code"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addNotifArea}
                        disabled={!notifAreaInput.trim() || isSavingAreas}
                        className="rounded-xl"
                        data-testid="button-add-notif-area"
                      >
                        {isSavingAreas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" />Add</>}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-semibold mb-2 block">Bio</label>
                <Textarea data-testid="input-bio" placeholder="Tell the community about yourself..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="rounded-xl resize-none" rows={3} />
              </div>
              {(isEventOwnerPro || isVendorPro) && (
                <div>
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    Website URL <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">Pro Feature</span>
                  </label>
                  <Input
                    data-testid="input-website-url"
                    placeholder="https://yourwebsite.com"
                    value={form.websiteUrl}
                    onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                    className="rounded-xl"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEventOwnerPro ? "Shown on your event cards so attendees can visit your site." : "Shown on your vendor cards at events."}
                  </p>
                </div>
              )}
              <Button onClick={() => upsertProfile(form)} disabled={isSaving} className="rounded-xl" data-testid="button-save-profile">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS (Only for Event Owner Pro) */}
        {isEventOwnerPro && (
          <TabsContent value="events" className="mt-0 space-y-6">
            {myEvents.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-display font-bold mb-4">My Events</h3>
                {myEvents.map(event => (
                  <Card key={event.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{event.title}</CardTitle>
                        <CardDescription>{event.location} · {format(new Date(event.date), 'MMM d, yyyy')}</CardDescription>
                      </div>
                      <Link href={`/events/${event.id}`}>
                        <Button size="sm" variant="outline" className="rounded-xl">View Details</Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-3 text-sm mb-4">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" />{event.attendingCount || 0} attending</span>
                        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-primary" />{event.vendorSpacesUsed || 0}/{event.vendorSpaces || 0} vendor spaces</span>
                      </div>
                      <div className="border-t pt-4">
                        <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Map className="w-4 h-4 text-primary" />Quick Map Edit
                        </h5>
                        <EventMapEditor eventId={event.id} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {myEvents.length === 0 && (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No events yet. Start by adding your first market!</p>
                <Button asChild className="mt-4 rounded-xl" variant="outline">
                  <Link href="/add-event">Create Event</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        )}

        {/* NOTIFICATIONS (Event Owner Pro sees Admin tools + Personal alerts, Others just alerts) */}
        <TabsContent value="notifications" className="mt-0 space-y-6">
          {isEventOwnerPro && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" />Broadcast Notification</CardTitle>
                <CardDescription>Send an in-app push notification to users in your area.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Target Audience</label>
                  <select
                    className="w-full h-11 rounded-xl border border-border px-3 bg-background text-foreground text-sm"
                    value={notifForm.targetAudience}
                    onChange={e => setNotifForm(f => ({ ...f, targetAudience: e.target.value }))}
                    data-testid="select-target-audience"
                  >
                    <option value="vendor_pro">Vendor Pro accounts</option>
                    <option value="event_owner_pro">Event Owner Pro accounts</option>
                    <option value="general">General (free) accounts</option>
                    <option value="all">All accounts</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Notification Title</label>
                  <Input
                    data-testid="input-notif-title"
                    placeholder="e.g. New Market Open — Spring Edition!"
                    value={notifForm.title}
                    onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Message</label>
                  <Textarea
                    data-testid="input-notif-message"
                    placeholder="Write your message..."
                    value={notifForm.message}
                    onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))}
                    className="rounded-xl resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Link to Event (Optional)</label>
                  <select
                    className="w-full h-11 rounded-xl border border-border px-3 bg-background text-foreground text-sm"
                    value={selectedEventId || ""}
                    onChange={e => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
                    data-testid="select-event"
                  >
                    <option value="">No event link</option>
                    {myEvents.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
                <Button
                  className="rounded-xl w-full bg-gradient-to-r from-primary to-amber-500"
                  disabled={!notifForm.title || !notifForm.message || isSendingNotif}
                  onClick={() => {
                    sendNotification({ title: notifForm.title, message: notifForm.message, eventId: selectedEventId || undefined, targetAudience: notifForm.targetAudience });
                    setNotifForm({ title: "", message: "", targetAudience: "vendor_pro" });
                    setSelectedEventId(null);
                  }}
                  data-testid="button-send-notification"
                >
                  {isSendingNotif ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Notification</>}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>My Alerts</CardTitle><CardDescription>In-app alerts from event owners and the platform.</CardDescription></div>
              {unreadCount > 0 && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => markAllRead()}>Mark all read</Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(notifications || []).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No notifications yet.</p>
                  </div>
                )}
                {(notifications || []).map((n: any) => (
                  <div key={n.id} className={`p-4 rounded-xl border transition-all ${n.read ? 'bg-muted/30 border-border/30' : 'bg-primary/5 border-primary/20'}`} data-testid={`notification-${n.id}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</p>
                      </div>
                      {n.eventId && (
                        <Link href={`/events/${n.eventId}`}>
                          <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs">View Event</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENT OWNER ANALYTICS */}
        {isEventOwnerPro && (
          <TabsContent value="analytics" className="mt-0 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Events", value: analytics?.totalEvents ?? 0 },
                { label: "Unique Vendors", value: analytics?.vendors?.length ?? 0 },
                { label: "Avg Attending", value: analytics?.avgAttending ?? 0 },
                { label: "Avg Interested", value: analytics?.avgInterested ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                </div>
              ))}
            </div>
            {analytics?.repeatVendors?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Repeat Vendors</CardTitle><CardDescription>Vendors who've appeared at 2 or more of your events.</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.repeatVendors.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                        <span className="font-medium">{v.name}</span>
                        <Badge variant="secondary">{v.eventCount} events</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {analytics?.vendors?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>All Vendors Across Your Events</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.vendors.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                        <span className="font-medium">{v.name}</span>
                        <Badge variant="outline">{v.eventCount} event{v.eventCount !== 1 ? 's' : ''}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(!analytics || analytics.vendors?.length === 0) && (
              <div className="text-center py-12 bg-card rounded-2xl border border-dashed">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">No vendor data yet. Vendors will appear as they sign up to your events.</p>
              </div>
            )}
          </TabsContent>
        )}

        {/* VENDOR ANALYTICS (Vendor Pro + Admin) */}
        {isVendorPro && (
          <TabsContent value="vendor-analytics" className="mt-0">
            {userId && <VendorAnalyticsTab userId={userId} />}
          </TabsContent>
        )}

        {/* EVENT MAP (Event Owner Pro only) */}
        {isEventOwnerPro && (
          <TabsContent value="map" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Map className="w-5 h-5 text-primary" />Event Map Builder</CardTitle>
                <CardDescription>Select one of your events and design the vendor layout. Click an empty cell after typing a spot name to place it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Select Event</label>
                  <select
                    className="w-full h-11 rounded-xl border border-border px-3 bg-background text-foreground text-sm"
                    value={selectedEventId || ""}
                    onChange={e => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
                    data-testid="select-event-map"
                  >
                    <option value="">Choose an event...</option>
                    {myEvents.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
                {selectedEventId && (
                  <div className="pt-4 border-t">
                    <EventMapEditor eventId={selectedEventId} readOnly={false} />
                  </div>
                )}
                {!selectedEventId && (
                  <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                    <Map className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-muted-foreground">Select an event above to start building its vendor map.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* BILLING */}
        <TabsContent value="billing" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Subscription</CardTitle>
              <CardDescription>Manage your Pro subscription and billing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-6 rounded-2xl border-2 ${hasActivePro ? 'border-green-500/30 bg-green-50/50 dark:bg-green-900/10' : 'border-border bg-muted/50'}`}>
                <div className="flex items-center gap-3">
                  {hasActivePro ? <Crown className="w-7 h-7 text-amber-500" /> : <CreditCard className="w-7 h-7 text-muted-foreground" />}
                  <div>
                    <p className="font-bold text-lg text-foreground">{hasActivePro ? currentTierLabel : "Free Account"}</p>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin ? "Admin account — full platform access with all fees waived." : hasActivePro ? "Your Pro subscription is active." : "Upgrade to unlock premium features."}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Event Owner Pro", "Vendor Pro"].map(tier => (
                      <Badge key={tier} className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <CheckCircle className="w-3 h-3 mr-1" />{tier}
                      </Badge>
                    ))}
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700">
                      <Star className="w-3 h-3 mr-1" />All Fees Waived
                    </Badge>
                  </div>
                )}
              </div>
              {hasActivePro && !isAdmin ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => portal()} disabled={isPortal} className="rounded-xl" data-testid="button-manage-billing">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isPortal ? "Opening..." : "Manage Billing & Payment"}
                    </Button>
                    <Button variant="outline" onClick={() => portal()} disabled={isPortal} className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10" data-testid="button-cancel-subscription">
                      {isPortal ? "Opening..." : "Cancel Subscription"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Canceling keeps your Pro access until the end of the current billing period. No partial refunds.</p>
                </div>
              ) : !hasActivePro ? (
                <Button onClick={() => setLocation("/upgrade")} className="rounded-xl bg-gradient-to-r from-primary to-amber-500 shadow-lg" data-testid="button-go-upgrade">
                  <Crown className="w-4 h-4 mr-2" />View Pro Plans
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {/* ADMIN: Promo Code Management */}
          {isAdmin && <AdminPromoSection userId={userId || ""} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
