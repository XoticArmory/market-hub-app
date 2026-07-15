import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, TrendingUp, Package, DollarSign, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CatalogSummaryItem {
  catalogItemId: number;
  itemName: string;
  quantity: number;
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

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function InventoryAnalyticsPage() {
  const [, setLocation] = useLocation();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier && profile.subscriptionTier !== "free";

  const { data: catalogSummary, isLoading: loadingCatalog } = useQuery<{ items: CatalogSummaryItem[] }>({
    queryKey: ["/api/vendor/cogs/inventory"],
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

  const totalCatalogValue = items.reduce((s, i) => s + i.quantity * i.sellPriceCents, 0);

  const allocatedItems = items.filter(i => (i.assignments?.length ?? 0) > 0).length;
  const unallocatedItems = items.length - allocatedItems;

  const topItems = [...items]
    .map(i => ({ ...i, sold: salesByItem[i.catalogItemId] || 0 }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  const chartData = topItems.map(item => ({
    name: truncate(item.itemName, 14),
    sold: item.sold,
  }));

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
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Total Revenue" value={formatPrice(totalRevenue)} color="text-primary" />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Total Value" value={formatPrice(totalCatalogValue)} color="text-violet-600" />
            <MetricCard icon={<Package className="w-4 h-4" />} label="Units Sold" value={String(totalUnits)} color="text-emerald-600" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Sell-through" value={`${sellThrough}%`} color="text-blue-600" />
          </div>

          {/* Allocated vs Unallocated */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Allocated to Events</span>
                </div>
                <div className="text-3xl font-bold">{allocatedItems}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {items.length > 0 ? `${Math.round((allocatedItems / items.length) * 100)}% of catalog` : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1 text-orange-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Not Yet Allocated</span>
                </div>
                <div className="text-3xl font-bold">{unallocatedItems}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {unallocatedItems > 0 ? "Allocate from Inventory hub" : "All items allocated"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Items Bar Chart */}
          {topItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Items by Units Sold</CardTitle>
              </CardHeader>
              <CardContent>
                {topItems.some(i => i.sold > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(val: number) => [`${val} sold`, "Units"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No sales recorded yet — chart will appear once you log sales at an event.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Event Performance */}
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

          {/* Catalog Overview */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catalog Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(item => {
                  const sold = salesByItem[item.catalogItemId] || 0;
                  const eventCount = item.assignments?.length || 0;
                  const allocated = (item.assignments ?? []).reduce((s, a) => s + a.quantityAssigned, 0);
                  return (
                    <div key={item.catalogItemId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{item.itemName}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{formatPrice(item.sellPriceCents)} / unit</span>
                          <span>{eventCount} event{eventCount !== 1 ? "s" : ""}</span>
                          <span>{allocated} allocated</span>
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
