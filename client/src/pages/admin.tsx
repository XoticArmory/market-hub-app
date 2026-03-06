import { useState } from "react";
import { useAdminSettings, useAdminUsers, useUpsertSetting, useClaimAdmin } from "@/hooks/use-admin";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Settings, Users, DollarSign, Loader2, User, BarChart3, CalendarDays, Package, Trash2, TrendingUp, RefreshCw, CreditCard, CheckCircle, XCircle, RotateCcw, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TIER_LABELS: Record<string, string> = {
  event_owner_pro: "Event Owner Pro",
  vendor_pro: "Vendor Pro",
  general_pro: "General Pro",
  free: "Free",
};

function useAdminStats() {
  return useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
  });
}

function useAdminAllEvents() {
  return useQuery({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const res = await fetch("/api/admin/events", { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });
}

function useAdminRegistrations() {
  return useQuery({
    queryKey: ["/api/admin/registrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/registrations", { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });
}

function useSquarePayments() {
  return useQuery<any[]>({
    queryKey: ["/api/admin/square/payments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/square/payments", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });
}

function useSquareLocations() {
  return useQuery<any[]>({
    queryKey: ["/api/admin/square/locations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/square/locations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function PromoCodesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ code: "", type: "discount", discountPercent: "", applicableTier: "", expiresAt: "", maxUses: "" });

  const { data: codes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/promo-codes"],
    queryFn: async () => { const r = await fetch("/api/admin/promo-codes", { credentials: "include" }); return r.json(); },
  });

  const createCode = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] }); setForm({ code: "", type: "discount", discountPercent: "", applicableTier: "", expiresAt: "", maxUses: "" }); toast({ title: "Promo code created" }); },
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
    if (!form.code || !form.type) return;
    createCode.mutate({
      code: form.code,
      type: form.type,
      discountPercent: form.type === "discount" ? parseInt(form.discountPercent) || undefined : undefined,
      applicableTier: form.applicableTier || undefined,
      expiresAt: form.expiresAt || undefined,
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" />Create Promo Code</CardTitle><CardDescription>Discount codes reduce subscription price at checkout. Temporary admin codes grant admin access until revoked.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Code</label>
              <Input placeholder="e.g. LAUNCH50" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="rounded-xl font-mono" data-testid="input-new-promo-code" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Type</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl" data-testid="select-promo-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount (% off subscription)</SelectItem>
                  <SelectItem value="temp_admin">Temporary Admin Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "discount" && (
              <>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Discount %</label>
                  <Input type="number" min={1} max={100} placeholder="e.g. 50" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} className="rounded-xl" data-testid="input-discount-percent" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Applicable Tier (optional)</label>
                  <Select value={form.applicableTier || "all"} onValueChange={v => setForm(f => ({ ...f, applicableTier: v === "all" ? "" : v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tiers</SelectItem>
                      <SelectItem value="event_owner_pro">Event Owner Pro only</SelectItem>
                      <SelectItem value="vendor_pro">Vendor Pro only</SelectItem>
                      <SelectItem value="general_pro">General Pro only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-semibold mb-2 block">Expires At (optional)</label>
              <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="rounded-xl" data-testid="input-expires-at" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Max Uses (optional, blank = unlimited)</label>
              <Input type="number" min={1} placeholder="e.g. 100" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className="rounded-xl" data-testid="input-max-uses" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createCode.isPending || !form.code} className="rounded-xl" data-testid="button-create-promo">
            {createCode.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Tag className="w-4 h-4 mr-2" />Create Code</>}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Codes */}
      <Card>
        <CardHeader><CardTitle>Active Promo Codes</CardTitle><CardDescription>Revoking a code immediately deactivates it. Revoking a temp admin code also removes admin access from all users who used it.</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : codes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No promo codes yet.</p>
          ) : (
            <div className="space-y-3">
              {codes.map((c: any) => (
                <div key={c.id} className={`flex items-center justify-between p-4 rounded-2xl border ${c.isActive ? 'border-border bg-card' : 'border-border/30 bg-muted/30 opacity-60'}`} data-testid={`promo-code-row-${c.id}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${c.type === 'temp_admin' ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                      {c.type === 'temp_admin' ? <ShieldCheck className="w-4 h-4 text-amber-500" /> : <Tag className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <p className="font-mono font-bold text-foreground">{c.code}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{c.type === 'temp_admin' ? 'Temp Admin' : `${c.discountPercent}% off`}</Badge>
                        {c.applicableTier && <Badge variant="outline" className="text-xs">{TIER_LABELS[c.applicableTier] || c.applicableTier}</Badge>}
                        {c.expiresAt && <Badge variant="outline" className="text-xs">Expires {format(new Date(c.expiresAt), 'MMM d, yyyy')}</Badge>}
                        <Badge variant="outline" className="text-xs">{c.usesCount}{c.maxUses ? `/${c.maxUses}` : ''} uses</Badge>
                        {!c.isActive && <Badge variant="destructive" className="text-xs">Revoked</Badge>}
                      </div>
                    </div>
                  </div>
                  {c.isActive && (
                    <Button size="sm" variant="outline" className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => revokeCode.mutate(c.id)} disabled={revokeCode.isPending} data-testid={`button-revoke-${c.id}`}>
                      <XCircle className="w-4 h-4 mr-1" />Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const { data: settings } = useAdminSettings();
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const { mutate: upsertSetting, isPending: savingSetting } = useUpsertSetting();
  const { mutate: claimAdmin, isPending: claimingAdmin } = useClaimAdmin();
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: allEvents, isLoading: loadingEvents } = useAdminAllEvents();
  const { data: registrations, isLoading: loadingRegs } = useAdminRegistrations();
  const { data: squarePayments, isLoading: loadingSquare, refetch: refetchPayments } = useSquarePayments();
  const { data: squareLocations, isLoading: loadingLocations } = useSquareLocations();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [settingInputs, setSettingInputs] = useState<Record<string, string>>({});
  const [refundDialog, setRefundDialog] = useState<{ paymentId: string; amount: number } | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [subDialog, setSubDialog] = useState<any>(null);
  const [subTier, setSubTier] = useState("free");
  const [subStatus, setSubStatus] = useState("active");

  const toggleAdmin = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      apiRequest("POST", `/api/admin/users/${userId}/admin`, { isAdmin }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Admin access updated." }); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/events"] }); toast({ title: "Event deleted." }); },
  });

  const issueRefund = useMutation({
    mutationFn: ({ paymentId, amountCents, reason }: any) =>
      apiRequest("POST", "/api/admin/square/refund", { paymentId, amountCents, reason }),
    onSuccess: () => {
      toast({ title: "Refund issued successfully." });
      setRefundDialog(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/square/payments"] });
    },
    onError: (e: any) => toast({ title: "Refund failed", description: e.message, variant: "destructive" }),
  });

  const updateSubscription = useMutation({
    mutationFn: ({ userId, tier, status }: any) =>
      apiRequest("POST", "/api/admin/square/activate-subscription", { userId, tier, status }),
    onSuccess: () => {
      toast({ title: "Subscription updated." });
      setSubDialog(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  if (!profile?.isAdmin) {
    window.location.href = "/";
    return null;
  }

  const squareKeys = [
    { key: "square_location_id", label: "Square Location ID", placeholder: "LXX...", hint: "Found in Square Dashboard → Account & Settings → Locations" },
    { key: "square_application_id", label: "Square Application ID (optional)", placeholder: "sq0idp-...", hint: "Found in Square Developer Console → Applications" },
  ];

  const squareTotalRevenue = (squarePayments || [])
    .filter((p: any) => p.status === 'COMPLETED')
    .reduce((sum: number, p: any) => sum + (p.amountMoney?.amount || 0), 0);

  const squareTodayRevenue = (squarePayments || [])
    .filter((p: any) => p.status === 'COMPLETED' && new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, p: any) => sum + (p.amountMoney?.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Full platform control and visibility.</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><BarChart3 className="w-4 h-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><CalendarDays className="w-4 h-4" />Events</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><Package className="w-4 h-4" />Payments</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg px-4 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><Settings className="w-4 h-4" />Settings</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="mt-0 space-y-6">
          {loadingStats ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Events" value={stats.totalEvents} />
                <StatCard label="Total Users" value={stats.totalUsers} />
                <StatCard label="Pro Accounts" value={stats.totalProAccounts} sub="active subscriptions" />
                <StatCard label="Total Revenue" value={`$${((stats.totalRevenueCents || 0) / 100).toFixed(2)}`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="General Users" value={stats.totalGeneralUsers} />
                <StatCard label="Vendors" value={stats.totalVendors} />
                <StatCard label="Event Owners" value={stats.totalEventOwners} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(stats.tierCounts || {}).filter(([k]) => k !== 'free').map(([tier, count]) => (
                  <StatCard key={tier} label={TIER_LABELS[tier] || tier} value={count as number} sub={tier === 'event_owner_pro' ? `~$${((count as number) * 19.95).toFixed(2)}/mo` : tier === 'vendor_pro' ? `~$${((count as number) * 9.95).toFixed(2)}/mo` : `~$${((count as number) * 4.95).toFixed(2)}/mo`} />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Active Events by Area Code</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(stats.eventsByArea || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([area, count]) => (
                        <div key={area} className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                          <span className="font-medium text-sm">{area}</span>
                          <Badge variant="secondary">{count as number} events</Badge>
                        </div>
                      ))}
                      {Object.keys(stats.eventsByArea || {}).length === 0 && <p className="text-muted-foreground text-sm">No events yet.</p>}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Vendors by Area Code</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(stats.vendorsByArea || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([area, count]) => (
                        <div key={area} className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                          <span className="font-medium text-sm">{area}</span>
                          <Badge variant="secondary">{count as number} vendors</Badge>
                        </div>
                      ))}
                      {Object.keys(stats.vendorsByArea || {}).length === 0 && <p className="text-muted-foreground text-sm">No vendors yet.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No stats available.</p>
          )}
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments" className="mt-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>Vendor Space Registrations</CardTitle><CardDescription>All vendor space bookings and platform fees collected.</CardDescription></CardHeader>
            <CardContent>
              {loadingRegs ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
                <>
                  {registrations && registrations.length > 0 && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Total platform fees collected: ${(((registrations || []).filter((r: any) => r.status === 'paid').reduce((s: number, r: any) => s + (r.feeCents || 0), 0)) / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {(registrations || []).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
                        <Package className="w-8 h-8 text-primary/50 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{r.vendorName}</p>
                          <p className="text-sm text-muted-foreground truncate">{r.eventTitle} · {r.spotName || r.spotId || 'General'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">${((r.amountCents || 0) / 100).toFixed(2)}</p>
                          {(r.feeCents || 0) > 0 && <p className="text-xs text-amber-600">fee: ${(r.feeCents / 100).toFixed(2)}</p>}
                        </div>
                        <Badge variant={r.status === 'paid' ? 'default' : 'outline'} className={r.status === 'paid' ? 'bg-green-500' : ''}>{r.status}</Badge>
                        {r.isPro && <Badge variant="outline" className="text-blue-600 border-blue-300">Pro</Badge>}
                      </div>
                    ))}
                    {(registrations || []).length === 0 && <p className="text-muted-foreground text-sm">No registrations yet.</p>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Square Payments</h2>
              <p className="text-sm text-muted-foreground">Live transaction data from your Square account.</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetchPayments()} data-testid="button-refresh-payments">
              <RefreshCw className="w-4 h-4" />Refresh
            </Button>
          </div>

          {loadingSquare ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (squarePayments || []).length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="font-semibold text-muted-foreground mb-2">No Square transactions found</p>
                <p className="text-sm text-muted-foreground">Configure your Square Access Token and Location ID in Settings, then payments will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Square Revenue" value={`$${(squareTotalRevenue / 100).toFixed(2)}`} />
                <StatCard label="Today's Square" value={`$${(squareTodayRevenue / 100).toFixed(2)}`} />
                <StatCard label="Square Txns" value={(squarePayments || []).filter((p: any) => p.status === 'COMPLETED').length} />
                <StatCard label="Pending" value={(squarePayments || []).filter((p: any) => p.status !== 'COMPLETED').length} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Transaction History</CardTitle>
                  <CardDescription>Recent Square payments. Click Refund to issue a refund for any completed payment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-3 font-semibold text-muted-foreground">ID</th>
                          <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Amount</th>
                          <th className="text-center py-3 px-3 font-semibold text-muted-foreground">Status</th>
                          <th className="py-3 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(squarePayments || []).map((payment: any) => (
                          <tr key={payment.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors" data-testid={`payment-row-${payment.id}`}>
                            <td className="py-3 px-3 text-muted-foreground text-xs">{payment.createdAt ? format(new Date(payment.createdAt), "MMM d, yyyy h:mm a") : "—"}</td>
                            <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{payment.id?.slice(0, 12)}...</td>
                            <td className="py-3 px-3 text-right font-semibold">${((payment.amountMoney?.amount || 0) / 100).toFixed(2)}</td>
                            <td className="py-3 px-3 text-center">
                              {payment.status === 'COMPLETED' ? (
                                <Badge className="bg-green-500 text-white gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>
                              ) : payment.status === 'CANCELED' ? (
                                <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Canceled</Badge>
                              ) : (
                                <Badge variant="outline">{payment.status}</Badge>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {payment.status === 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs rounded-lg gap-1"
                                  onClick={() => { setRefundDialog({ paymentId: payment.id, amount: payment.amountMoney?.amount || 0 }); setRefundAmount(""); }}
                                  data-testid={`button-refund-${payment.id}`}
                                >
                                  <RotateCcw className="w-3 h-3" />Refund
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="mt-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>All Users</CardTitle><CardDescription>View and manage all registered users, their tiers, and admin access. Use "Set Subscription" to manually activate/change subscription status.</CardDescription></CardHeader>
            <CardContent>
              {loadingUsers ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
                <div className="space-y-3">
                  {(users || []).map((u: any) => (
                    <div key={u.userId} className="flex flex-wrap items-center gap-4 p-4 bg-muted/40 rounded-xl" data-testid={`user-row-${u.userId}`}>
                      <Avatar className="w-10 h-10"><AvatarImage src={u.user?.profileImageUrl || ""} /><AvatarFallback><User className="w-4 h-4" /></AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{u.user?.firstName} {u.user?.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{u.user?.email}</p>
                        {u.areaCode && <p className="text-xs text-muted-foreground">Area: {u.areaCode}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="capitalize">{u.profileType?.replace("_", " ")}</Badge>
                        <Badge variant={u.subscriptionTier !== 'free' && u.subscriptionStatus === 'active' ? 'default' : 'outline'} className={u.subscriptionTier !== 'free' && u.subscriptionStatus === 'active' ? 'bg-green-500' : ''}>
                          {u.subscriptionTier !== 'free' ? TIER_LABELS[u.subscriptionTier] || u.subscriptionTier : 'Free'}
                        </Badge>
                        {u.isAdmin && <Badge className="bg-amber-500 text-white">Admin</Badge>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs h-8"
                          onClick={() => { setSubDialog(u); setSubTier(u.subscriptionTier || 'free'); setSubStatus(u.subscriptionStatus === 'active' ? 'active' : 'inactive'); }}
                          data-testid={`button-sub-${u.userId}`}
                        >
                          <CreditCard className="w-3 h-3 mr-1" />Subscription
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isAdmin ? "destructive" : "outline"}
                          className="rounded-xl text-xs h-8"
                          onClick={() => toggleAdmin.mutate({ userId: u.userId, isAdmin: !u.isAdmin })}
                        >
                          {u.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(users || []).length === 0 && <p className="text-muted-foreground text-sm">No users found.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="mt-0">
          <Card>
            <CardHeader><CardTitle>All Events</CardTitle><CardDescription>View and manage all events on the platform.</CardDescription></CardHeader>
            <CardContent>
              {loadingEvents ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
                <div className="space-y-3">
                  {(allEvents || []).map((e: any) => (
                    <div key={e.id} className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl" data-testid={`event-row-${e.id}`}>
                      <CalendarDays className="w-8 h-8 text-primary/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{e.title}</p>
                        <p className="text-sm text-muted-foreground">{e.location} · {new Date(e.date).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">By {e.creatorName} · {e.attendingCount} attending</p>
                      </div>
                      {e.areaCode && <Badge variant="outline">{e.areaCode}</Badge>}
                      <Button size="sm" variant="destructive" className="rounded-xl h-8 shrink-0" onClick={() => deleteEvent.mutate(e.id)}>
                        <Trash2 className="w-3 h-3 mr-1" />Delete
                      </Button>
                    </div>
                  ))}
                  {(allEvents || []).length === 0 && <p className="text-muted-foreground text-sm">No events yet.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REGISTRATIONS */}
        <TabsContent value="payments" className="mt-0">
          <Card>
            <CardHeader><CardTitle>Vendor Space Registrations</CardTitle><CardDescription>All vendor space bookings and platform fees collected.</CardDescription></CardHeader>
            <CardContent>
              {loadingRegs ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
                <>
                  {registrations && registrations.length > 0 && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Total platform fees collected: ${(((registrations || []).filter((r: any) => r.status === 'paid').reduce((s: number, r: any) => s + (r.feeCents || 0), 0)) / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {(registrations || []).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
                        <Package className="w-8 h-8 text-primary/50 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{r.vendorName}</p>
                          <p className="text-sm text-muted-foreground truncate">{r.eventTitle} · {r.spotName || r.spotId || 'General'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">${((r.amountCents || 0) / 100).toFixed(2)}</p>
                          {(r.feeCents || 0) > 0 && <p className="text-xs text-amber-600">fee: ${(r.feeCents / 100).toFixed(2)}</p>}
                        </div>
                        <Badge variant={r.status === 'paid' ? 'default' : 'outline'} className={r.status === 'paid' ? 'bg-green-500' : ''}>{r.status}</Badge>
                        {r.isPro && <Badge variant="outline" className="text-blue-600 border-blue-300">Pro</Badge>}
                      </div>
                    ))}
                    {(registrations || []).length === 0 && <p className="text-muted-foreground text-sm">No registrations yet.</p>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>Square Configuration</CardTitle><CardDescription>Configure your Square account credentials. The Access Token must be set as the <code className="bg-muted px-1 rounded text-xs">SQUARE_ACCESS_TOKEN</code> secret in environment settings.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {/* Location ID — show auto-detected locations first */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold block">Square Location ID</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Required for creating payment links. Select from your Square account below or enter manually.</p>
                </div>
                {(() => {
                  const currentLocationId = (settings || []).find((s: any) => s.key === 'square_location_id')?.value;
                  return currentLocationId ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-300">Location configured</p>
                        <p className="text-xs font-mono text-green-600 dark:text-green-400 truncate">{currentLocationId}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg shrink-0" onClick={() => setSettingInputs(p => ({ ...p, square_location_id: currentLocationId }))}>Change</Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">No location configured — payment links won't work until this is set.</p>
                    </div>
                  );
                })()}

                {/* Auto-detected locations from Square API */}
                {loadingLocations ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading your Square locations...</div>
                ) : (squareLocations || []).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Square Locations — click to select</p>
                    {(squareLocations || []).map((loc: any) => (
                      <div key={loc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/30">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{loc.name || 'Unnamed Location'}</p>
                          <p className="text-xs font-mono text-muted-foreground">{loc.id}</p>
                          {loc.address?.addressLine1 && <p className="text-xs text-muted-foreground">{loc.address.addressLine1}, {loc.address.locality}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant={loc.status === 'ACTIVE' ? 'default' : 'outline'} className={loc.status === 'ACTIVE' ? 'bg-green-500 text-xs' : 'text-xs'}>{loc.status}</Badge>
                          <Button
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            onClick={() => { upsertSetting({ key: 'square_location_id', value: loc.id }); toast({ title: `Location "${loc.name}" saved.` }); }}
                            data-testid={`button-select-location-${loc.id}`}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-muted/40 rounded-xl text-sm text-muted-foreground">
                    No locations found in your Square account. <a href="https://squareup.com/dashboard/locations" target="_blank" rel="noopener noreferrer" className="text-primary underline">Create one in Square Dashboard →</a>
                  </div>
                )}

                {/* Manual input fallback */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Or enter manually:</p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="LXX..."
                      value={settingInputs['square_location_id'] || ""}
                      onChange={e => setSettingInputs(p => ({ ...p, square_location_id: e.target.value }))}
                      className="rounded-xl font-mono text-sm"
                      data-testid="input-square_location_id"
                    />
                    <Button
                      disabled={savingSetting || !settingInputs['square_location_id']}
                      onClick={() => { upsertSetting({ key: 'square_location_id', value: settingInputs['square_location_id'] }); setSettingInputs(p => ({ ...p, square_location_id: "" })); }}
                      className="rounded-xl shrink-0"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pricing Settings */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Tag className="w-4 h-4" />Plan Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: "square_plan_event_owner_pro", label: "Event Owner Pro Plan ID" },
                    { key: "square_plan_vendor_pro", label: "Vendor Pro Plan ID" },
                    { key: "square_plan_general_pro", label: "General Pro Plan ID" },
                  ].map(item => (
                    <div key={item.key} className="space-y-2">
                      <label className="text-sm font-medium">{item.label}</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="plan_..."
                          value={settingInputs[item.key] || (settings || []).find((s: any) => s.key === item.key)?.value || ""}
                          onChange={e => setSettingInputs(p => ({ ...p, [item.key]: e.target.value }))}
                          className="rounded-xl font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          disabled={savingSetting}
                          onClick={() => upsertSetting({ key: item.key, value: settingInputs[item.key] || "" })}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <PromoCodesTab />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200 mt-6">
                <p className="font-semibold mb-1">✓ Square API Connected</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Your production Square Access Token is working. Select a location above to enable payment links, or create one at <a href="https://squareup.com/dashboard/locations" target="_blank" className="underline font-medium" rel="noopener noreferrer">squareup.com/dashboard/locations</a>.</p>
                <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">Webhook URL: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/api/square/webhook</code></p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle><CardDescription>Current subscription prices. These are fixed and applied when generating Square payment links.</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { tier: "Event Owner Pro", price: "$9.95/mo", key: "event_owner_pro" },
                  { tier: "Vendor Pro", price: "$4.95/mo", key: "vendor_pro" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="font-medium text-sm">{item.tier}</span>
                    <Badge variant="secondary" className="font-mono">{item.price}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Required Environment Secrets</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { key: "SQUARE_ACCESS_TOKEN", desc: "Your Square production access token (required for payments)" },
                  { key: "ADMIN_EMAILS", desc: "Comma-separated admin emails (e.g. you@email.com)" },
                  { key: "SESSION_SECRET", desc: "Random session signing secret" },
                ].map(item => (
                  <div key={item.key} className="p-3 bg-muted/50 rounded-xl">
                    <p className="font-mono text-sm font-semibold">{item.key}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMO CODES */}
        <TabsContent value="promo-codes" className="mt-0 space-y-6">
          <PromoCodesTab />
        </TabsContent>
      </Tabs>

      {/* REFUND DIALOG */}
      <Dialog open={!!refundDialog} onOpenChange={() => setRefundDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Issue Refund</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Payment ID: <code className="bg-muted px-1 rounded text-xs">{refundDialog?.paymentId}</code></p>
            <div>
              <label className="text-sm font-semibold mb-2 block">Refund Amount ($) — leave blank for full refund</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={`Max: $${((refundDialog?.amount || 0) / 100).toFixed(2)}`}
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                className="rounded-xl"
                data-testid="input-refund-amount"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRefundDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl"
                disabled={issueRefund.isPending}
                onClick={() => issueRefund.mutate({
                  paymentId: refundDialog!.paymentId,
                  amountCents: refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined,
                  reason: "Admin-issued refund",
                })}
                data-testid="button-confirm-refund"
              >
                {issueRefund.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUBSCRIPTION MANAGEMENT DIALOG */}
      <Dialog open={!!subDialog} onOpenChange={() => setSubDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Manage Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">User: <strong>{subDialog?.user?.firstName} {subDialog?.user?.lastName}</strong> ({subDialog?.user?.email})</p>
            <div>
              <label className="text-sm font-semibold mb-2 block">Subscription Tier</label>
              <Select value={subTier} onValueChange={setSubTier}>
                <SelectTrigger className="rounded-xl" data-testid="select-sub-tier"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="event_owner_pro">Event Owner Pro ($19.95/mo)</SelectItem>
                  <SelectItem value="vendor_pro">Vendor Pro ($9.95/mo)</SelectItem>
                  <SelectItem value="general_pro">General Pro ($4.95/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Status</label>
              <Select value={subStatus} onValueChange={setSubStatus}>
                <SelectTrigger className="rounded-xl" data-testid="select-sub-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSubDialog(null)}>Cancel</Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={updateSubscription.isPending}
                onClick={() => updateSubscription.mutate({ userId: subDialog.userId, tier: subTier, status: subStatus })}
                data-testid="button-save-subscription"
              >
                {updateSubscription.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
