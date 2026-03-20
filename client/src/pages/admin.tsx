import { useState } from "react";
import { useAdminSettings, useAdminUsers, useUpsertSetting, useClaimAdmin } from "@/hooks/use-admin";
import { useRealProfile } from "@/hooks/use-profile";
import { useAdminPreview } from "@/contexts/admin-preview";
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
import { ShieldCheck, Settings, Users, Loader2, User, BarChart3, CalendarDays, Package, Trash2, CreditCard, CheckCircle, XCircle, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TIER_LABELS: Record<string, string> = {
  event_owner_pro: "Event Owner Pro",
  vendor_pro: "Vendor Pro",
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
  const { data: profileData } = useRealProfile();
  const profile = profileData?.profile;
  const { previewTier, setPreviewTier } = useAdminPreview();
  const { data: settings } = useAdminSettings();
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const { mutate: upsertSetting, isPending: savingSetting } = useUpsertSetting();
  const { mutate: claimAdmin, isPending: claimingAdmin } = useClaimAdmin();
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: allEvents, isLoading: loadingEvents } = useAdminAllEvents();
  const { data: registrations, isLoading: loadingRegs } = useAdminRegistrations();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [settingInputs, setSettingInputs] = useState<Record<string, string>>({});
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

  const updateSubscription = useMutation({
    mutationFn: ({ userId, tier, status }: any) =>
      apiRequest("POST", "/api/admin/stripe/activate-subscription", { userId, tier, status }),
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Full platform control and visibility.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Preview as:</span>
            <Select value={previewTier ?? "none"} onValueChange={v => setPreviewTier(v === "none" ? null : v as any)}>
              <SelectTrigger className="rounded-xl w-48 h-9 text-sm" data-testid="select-preview-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— My real view —</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="event_owner_pro">Event Owner Pro</SelectItem>
                <SelectItem value="vendor_pro">Vendor Pro</SelectItem>
                <SelectItem value="free">Free user</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {previewTier && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-medium px-3 py-1.5 rounded-lg" data-testid="banner-preview-active">
              <ShieldCheck className="w-3.5 h-3.5" />
              Previewing as: <span className="font-semibold capitalize">{previewTier.replace(/_/g, " ")}</span>
              <button className="ml-1 opacity-60 hover:opacity-100" onClick={() => setPreviewTier(null)}>✕</button>
            </div>
          )}
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

          <Card>
            <CardContent className="py-8 text-center">
              <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold text-muted-foreground mb-1">Subscription payments processed by Stripe</p>
              <p className="text-sm text-muted-foreground">View your subscription revenue and customer billing history in the <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Dashboard →</a></p>
            </CardContent>
          </Card>
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
            <CardHeader>
              <CardTitle>Stripe Setup</CardTitle>
              <CardDescription>Two environment secrets are required, then you're ready to accept subscriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* 1 — Secret Key */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block">1. Stripe Secret Key</label>
                <p className="text-xs text-muted-foreground">Found in your <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Dashboard → API keys</a>. Starts with <code className="bg-muted px-1 rounded">sk_live_</code> (production) or <code className="bg-muted px-1 rounded">sk_test_</code> (test mode).</p>
                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border/30">
                  <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">Add <code className="bg-muted px-1 rounded font-mono">STRIPE_SECRET_KEY</code> as an environment secret in the Replit Secrets panel. Never paste it here.</p>
                </div>
              </div>

              {/* 2 — Webhook Secret */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-semibold block">2. Stripe Webhook Secret</label>
                <p className="text-xs text-muted-foreground">Set <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> as an environment secret. After adding your webhook endpoint in Stripe, copy the signing secret it provides.</p>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/30 text-xs">
                  <p className="font-semibold mb-1">Webhook endpoint to add in Stripe Dashboard:</p>
                  <code className="font-mono text-primary">POST /api/stripe/webhook</code>
                  <p className="text-muted-foreground mt-1">Events to subscribe: <span className="font-mono">checkout.session.completed, customer.subscription.updated, customer.subscription.deleted</span></p>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMO CODES */}
        <TabsContent value="promo-codes" className="mt-0 space-y-6">
          <PromoCodesTab />
        </TabsContent>
      </Tabs>

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
