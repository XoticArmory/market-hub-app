import { useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ShoppingCart, Package, Loader2, Plus, TrendingUp, DollarSign, Calendar, Pencil } from "lucide-react";

interface EventSummaryItem {
  catalogItemId: number;
  itemName: string;
  quantityAssigned: number;
  totalSold: number;
  priceCents: number;
  costCents: number;
  revenueCents: number;
  profitCents: number;
  afterMarketReport: boolean;
}

interface Event {
  id: number;
  title: string;
  date: string | null;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const eid = Number(eventId);

  // Date filter from ?date=YYYY-MM-DD (set when navigating from a multi-day event)
  const dateParam = new URLSearchParams(search).get("date") ?? "";

  const [logSaleOpen, setLogSaleOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EventSummaryItem | null>(null);
  const [saleQty, setSaleQty] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventSummaryItem | null>(null);
  const [editForm, setEditForm] = useState({ itemName: "", price: "", quantityAssigned: "", totalSold: "" });

  function openEdit(item: EventSummaryItem) {
    setEditItem(item);
    setEditForm({
      itemName: item.itemName,
      price: String(item.priceCents / 100),
      quantityAssigned: String(item.quantityAssigned),
      totalSold: String(item.totalSold),
    });
    setEditOpen(true);
  }

  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${eid}`],
  });

  const summaryUrl = dateParam
    ? `/api/vendor/inventory/event-summary/${eid}?date=${dateParam}`
    : `/api/vendor/inventory/event-summary/${eid}`;

  const { data: summary = [], isLoading } = useQuery<EventSummaryItem[]>({
    queryKey: [summaryUrl],
    enabled: !isNaN(eid),
  });

  const logSale = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendor/inventory/sales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [summaryUrl] });
      toast({ title: "Sale logged!" });
      setLogSaleOpen(false);
      setSelectedItem(null);
      setSaleQty("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/vendor/inventory/event-item", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [summaryUrl] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/catalog"] });
      toast({ title: "Item updated!" });
      setEditOpen(false);
      setEditItem(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleSaveEdit() {
    if (!editItem) return;
    const newName = editForm.itemName.trim();
    const newPrice = Math.round(Number(editForm.price) * 100);
    const newQtyAssigned = Number(editForm.quantityAssigned);
    const newTotalSold = Number(editForm.totalSold);
    if (!newName) { toast({ title: "Item name required", variant: "destructive" }); return; }
    if (newQtyAssigned < 0 || newTotalSold < 0) { toast({ title: "Quantities cannot be negative", variant: "destructive" }); return; }
    if (newTotalSold > newQtyAssigned) { toast({ title: "Sold cannot exceed quantity brought", variant: "destructive" }); return; }
    editItemMutation.mutate({
      catalogItemId: editItem.catalogItemId,
      eventId: eid,
      itemName: newName,
      priceCents: newPrice,
      quantityAssigned: newQtyAssigned,
      totalSold: newTotalSold,
      ...(dateParam ? { date: dateParam } : {}),
    });
  }

  const totalRevenue = summary.reduce((s, item) => s + item.revenueCents, 0);
  const totalProfit = summary.reduce((s, item) => s + item.profitCents, 0);
  const totalAssigned = summary.reduce((s, item) => s + item.quantityAssigned, 0);
  const totalSold = summary.reduce((s, item) => s + item.totalSold, 0);
  const sellThrough = totalAssigned > 0 ? Math.round((totalSold / totalAssigned) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inventory")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{event?.title || "Event Inventory"}</h1>
          {dateParam ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <p className="text-sm font-medium text-primary">
                {(() => {
                  const [y, m, d] = dateParam.split("-").map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
                })()}
              </p>
            </div>
          ) : event?.date ? (
            <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{summary.length}</div>
            <div className="text-xs text-muted-foreground">Item types</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalSold} <span className="text-base text-muted-foreground font-normal">/ {totalAssigned}</span></div>
            <div className="text-xs text-muted-foreground">Units sold / brought</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{formatPrice(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatPrice(totalProfit)}</div>
            <div className="text-xs text-muted-foreground">Total profit</div>
          </CardContent>
        </Card>
      </div>

      {sellThrough > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall sell-through</span>
              <span className="text-sm font-bold">{sellThrough}%</span>
            </div>
            <Progress value={sellThrough} className="h-2" />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : summary.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2" />
          <p className="font-medium">No items allocated to this event</p>
          <p className="text-sm mt-1">Allocate items from the Inventory hub first.</p>
          <Button className="mt-4" variant="outline" onClick={() => setLocation("/inventory")}>
            Go to Inventory
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Items at this event</h2>
          {summary.map(item => {
            const remaining = item.quantityAssigned - item.totalSold;
            const pct = item.quantityAssigned > 0 ? Math.round((item.totalSold / item.quantityAssigned) * 100) : 0;
            return (
              <Card key={item.catalogItemId}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{item.itemName}</p>
                        <Badge variant="outline">{formatPrice(item.priceCents)}</Badge>
                        {item.afterMarketReport && (
                          <Badge variant="secondary" className="text-xs">After Market Report</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-sm mt-2">
                        <span className="text-muted-foreground">Brought</span>
                        <span className="text-muted-foreground">Sold</span>
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium">{item.quantityAssigned}</span>
                        <span className="font-medium text-emerald-600">{item.totalSold}</span>
                        <span className="font-medium">{remaining}</span>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Sell-through</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>

                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-primary">{formatPrice(item.revenueCents)}</span>
                          <span className="text-muted-foreground text-xs">revenue</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span className={`font-medium ${item.profitCents >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {formatPrice(item.profitCents)}
                          </span>
                          <span className="text-muted-foreground text-xs">profit</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remaining <= 0}
                        onClick={() => {
                          setSelectedItem(item);
                          setSaleQty("");
                          setLogSaleOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Log Sale
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={logSaleOpen} onOpenChange={open => { if (!open) { setLogSaleOpen(false); setSelectedItem(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Sale — {selectedItem?.itemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brought</span>
                <span className="font-medium">{selectedItem?.quantityAssigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already sold</span>
                <span className="font-medium">{selectedItem?.totalSold}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium">{(selectedItem?.quantityAssigned ?? 0) - (selectedItem?.totalSold ?? 0)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Quantity sold this session</Label>
              <Input
                type="number"
                min="1"
                max={selectedItem ? selectedItem.quantityAssigned - selectedItem.totalSold : undefined}
                placeholder="0"
                value={saleQty}
                onChange={e => setSaleQty(e.target.value)}
              />
            </div>
            {saleQty && Number(saleQty) > 0 && (
              <div className="p-2 rounded-lg bg-primary/5 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium text-primary">{formatPrice(Number(saleQty) * (selectedItem?.priceCents ?? 0))}</span>
                </div>
                {(selectedItem?.costCents ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit</span>
                    <span className="font-medium text-emerald-600">
                      {formatPrice(Number(saleQty) * ((selectedItem?.priceCents ?? 0) - (selectedItem?.costCents ?? 0)))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setLogSaleOpen(false); setSelectedItem(null); }}>Cancel</Button>
            <Button
              disabled={!saleQty || Number(saleQty) <= 0 || logSale.isPending}
              onClick={() => {
                if (!selectedItem) return;
                logSale.mutate({
                  catalogItemId: selectedItem.catalogItemId,
                  eventId: eid,
                  quantitySold: Number(saleQty),
                });
              }}
            >
              {logSale.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ShoppingCart className="w-4 h-4 mr-2" />
              Log Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM DIALOG */}
      <Dialog open={editOpen} onOpenChange={open => { if (!open) { setEditOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Item name</Label>
              <Input
                value={editForm.itemName}
                onChange={e => setEditForm(f => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Handmade Candle"
              />
            </div>
            <div className="space-y-1">
              <Label>Sell price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantity brought</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.quantityAssigned}
                  onChange={e => setEditForm(f => ({ ...f, quantityAssigned: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Quantity sold</Label>
                <Input
                  type="number"
                  min="0"
                  max={editForm.quantityAssigned}
                  value={editForm.totalSold}
                  onChange={e => setEditForm(f => ({ ...f, totalSold: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            {Number(editForm.quantityAssigned) > 0 && (
              <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                Remaining: <span className="font-medium text-foreground">{Math.max(0, Number(editForm.quantityAssigned) - Number(editForm.totalSold))}</span>
              </div>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editItemMutation.isPending}>
              {editItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
