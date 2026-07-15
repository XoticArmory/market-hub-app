import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart3, TrendingUp, Package, DollarSign, Loader2 } from "lucide-react";

interface CatalogSummaryItem {
  catalogItemId: number;
  itemName: string;
  sellPriceCents: number;
  totalAssigned: number;
  assignments: { eventId: number; eventTitle: string; quantityAssigned: number }[];
  cogs: { category: string; amountCents: number }[];
  directCogsCents: number;
  marginCents: number;
}

interface SaleRecord {
  id: number;
  catalogItemId: number;
  eventId: number;
  quantitySold: number;
  soldAt: string;
  itemName: string;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryAnalyticsPage() {
  const [, setLocation] = useLocation();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier && profile.subscriptionTier !== "free";

  const { data: catalogSummary, isLoading: loadingCatalog } = useQuery<{ items: CatalogSummaryItem[] }>({
    queryKey: ["/api/vendor/catalog/inventory"],
    enabled: hasActivePro === true,
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery<SaleRecord[]>({
    queryKey: ["/api/vendor/inventory/sales"],
    enabled: hasActivePro === true,
  });

  const isLoading = loadingCatalog || loadingSales;

  const items = catalogSummary?.items || [];

  const salesByItem = sales.reduce<Record<number, number>>((acc, s) => {
    acc[s.catalogItemId] = (acc[s.catalogItemId] || 0) + s.quantitySold;
    return acc;
  }, {});

  const totalRevenue = sales.reduce((s, r) => {
    const item = items.find(i => i.catalogItemId === r.catalogItemId);
    return s + r.quantitySold * (item?.sellPriceCents ?? 0);
  }, 0);

  const totalUnits = sales.reduce((s, r) => s + r.quantitySold, 0);
  const totalAssigned = items.reduce((s, i) => s + i.totalAssigned, 0);
  const sellThrough = totalAssigned > 0 ? Math.round((totalUnits / totalAssigned) * 100) : 0;

  const topItems = [...items]
    .map(i => ({ ...i, sold: salesByItem[i.catalogItemId] || 0 }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  const salesByEvent = sales.reduce<Record<number, { eventId: number; qty: number; revenue: number }>>((acc, s) => {
    const item = items.find(i => i.catalogItemId === s.catalogItemId);
    if (!acc[s.eventId]) acc[s.eventId] = { eventId: s.eventId, qty: 0, revenue: 0 };
    acc[s.eventId].qty += s.quantitySold;
    acc[s.eventId].revenue += s.quantitySold * (item?.sellPriceCents ?? 0);
    return acc;
  }, {});

  const eventPerformance = Object.values(salesByEvent).sort((a, b) => b.revenue - a.revenue);

  if (!hasActivePro) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Inventory Analytics</h2>
        <p className="text-muted-foreground mb-6">Upgrade to VendorGrid Pro to view analytics.</p>
        <Button onClick={() => setLocation("/upgrade")}>Upgrade to Pro</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inventory")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-pink-500/10">
            <BarChart3 className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Inventory Analytics</h1>
            <p className="text-sm text-muted-foreground">Sales performance across all events</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Total Revenue" value={formatPrice(totalRevenue)} color="text-primary" />
            <MetricCard icon={<Package className="w-4 h-4" />} label="Units Sold" value={String(totalUnits)} color="text-emerald-600" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Sell-through" value={`${sellThrough}%`} color="text-blue-600" />
            <MetricCard icon={<BarChart3 className="w-4 h-4" />} label="Catalog Items" value={String(items.length)} color="text-orange-600" />
          </div>

          {topItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topItems.map((item, idx) => {
                  const revenue = item.sold * item.sellPriceCents;
                  const margin = item.sold > 0 ? ((item.sellPriceCents - item.directCogsCents) / item.sellPriceCents) * 100 : 0;
                  const maxSold = topItems[0]?.sold || 1;
                  return (
                    <div key={item.catalogItemId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-muted-foreground w-5 flex-shrink-0">#{idx + 1}</span>
                          <span className="font-medium truncate">{item.itemName}</span>
                          {item.sold === 0 && <Badge variant="outline" className="text-xs flex-shrink-0">No sales yet</Badge>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-sm text-muted-foreground">{item.sold} sold</span>
                          <span className="text-sm font-semibold text-primary">{formatPrice(revenue)}</span>
                          {margin > 0 && <Badge variant="secondary" className="text-xs">{Math.round(margin)}% margin</Badge>}
                        </div>
                      </div>
                      <Progress value={maxSold > 0 ? (item.sold / maxSold) * 100 : 0} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {eventPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {eventPerformance.map(ev => (
                  <div key={ev.eventId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">Event #{ev.eventId}</p>
                      <p className="text-xs text-muted-foreground">{ev.qty} units sold</p>
                    </div>
                    <span className="font-semibold text-primary">{formatPrice(ev.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catalog Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(item => {
                  const sold = salesByItem[item.catalogItemId] || 0;
                  const eventCount = item.assignments?.length || 0;
                  return (
                    <div key={item.catalogItemId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{item.itemName}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{formatPrice(item.sellPriceCents)} / unit</span>
                          <span>{eventCount} event{eventCount !== 1 ? "s" : ""}</span>
                          <span>{item.totalAssigned} allocated</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{sold} sold</div>
                        {item.directCogsCents > 0 && (
                          <div className="text-xs text-muted-foreground">COGS: {formatPrice(item.directCogsCents)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {sales.length === 0 && items.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3" />
              <p className="font-medium">No data yet</p>
              <p className="text-sm mt-1">Log items and allocate them to events to see analytics.</p>
              <Button className="mt-4" variant="outline" onClick={() => setLocation("/inventory")}>
                Go to Inventory
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon, label, value, color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
