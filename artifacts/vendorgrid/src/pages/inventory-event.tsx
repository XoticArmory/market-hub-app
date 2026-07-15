import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ShoppingCart, Package, TrendingUp, Loader2, Plus } from "lucide-react";

interface EventSummaryItem {
  catalogItemId: number;
  itemName: string;
  quantityAssigned: number;
  totalSold: number;
  priceCents: number;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const eid = Number(eventId);

  const [logSaleOpen, setLogSaleOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EventSummaryItem | null>(null);
  const [saleQty, setSaleQty] = useState("");

  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${eid}`],
  });

  const { data: summary = [], isLoading } = useQuery<EventSummaryItem[]>({
    queryKey: [`/api/vendor/inventory/event-summary/${eid}`],
    enabled: !isNaN(eid),
  });

  const logSale = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vendor/inventory/sales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vendor/inventory/event-summary/${eid}`] });
      toast({ title: "Sale logged!" });
      setLogSaleOpen(false);
      setSelectedItem(null);
      setSaleQty("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalRevenue = summary.reduce((s, item) => s + item.totalSold * item.priceCents, 0);
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
          {event?.date && (
            <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          )}
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
            <div className="text-2xl font-bold">{totalAssigned}</div>
            <div className="text-xs text-muted-foreground">Units brought</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{totalSold}</div>
            <div className="text-xs text-muted-foreground">Units sold</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{formatPrice(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
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
                      <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                        <span>Brought: {item.quantityAssigned}</span>
                        <span className="text-emerald-600 font-medium">Sold: {item.totalSold}</span>
                        <span>Remaining: {remaining}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Sell-through</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      <div className="mt-2 text-sm font-medium text-primary">
                        Revenue: {formatPrice(item.totalSold * item.priceCents)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                      onClick={() => {
                        setSelectedItem(item);
                        setSaleQty("");
                        setLogSaleOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Log Sale
                    </Button>
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
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
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
              <div className="p-2 rounded-lg bg-primary/5 text-sm text-center font-medium">
                Revenue: {formatPrice(Number(saleQty) * (selectedItem?.priceCents ?? 0))}
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
    </div>
  );
}
