import { useState } from "react";
import { useAdminSettings, useAdminUsers, useUpsertSetting, useClaimAdmin } from "@/hooks/use-admin";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Settings, Users, DollarSign, Loader2, User, BarChart3, CalendarDays, Package, Trash2 } from "lucide-react";
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

function StatCard({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
  const { data: profileData, isLoading: loadingProfile } = useProfile();
  const { data: settings, isLoading: loadingSettings } = useAdminSettings();
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: allEvents, isLoading: loadingEvents } = useAdminAllEvents();
  const { data: registrations, isLoading: loadingRegs } = useAdminRegistrations();
  const { mutate: upsertSetting, isPending: savingSetting } = useUpsertSetting();
  const { mutate: claimAdmin, isPending: claimingAdmin } = useClaimAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settingInputs, setSettingInputs] = useState<Record<string, string>>({});

  const isAdmin = profileData?.profile?.isAdmin === true;

  const deleteEvent = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border shadow-lg space-y-6">
        <ShieldCheck className="w-16 h-16 text-amber-500 mx-auto" />
        <h2 className="text-3xl font-display font-bold">Admin Panel</h2>
        <Button asChild size="lg" className="w-full rounded-xl"><a href="/api/login">Sign In</a></Button>
      </div>
    );
  }

  if (loadingProfile) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border shadow-lg space-y-6">
        <ShieldCheck className="w-16 h-16 text-amber-500 mx-auto" />
        <div>
          <h2 className="text-3xl font-display font-bold mb-2">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Your email must be in the <code className="bg-muted px-1 rounded">ADMIN_EMAILS</code> environment variable.</p>
        </div>
        <Button onClick={() => claimAdmin()} disabled={claimingAdmin} className="w-full rounded-xl" data-testid="button-claim-admin">
          {claimingAdmin ? "Verifying..." : "Claim Admin Access"}
        </Button>
      </div>
    );
  }

  const tierKeys = [
    { key: "stripe_price_event_owner_pro", label: "Event Owner Pro Price ID ($19.95/mo)" },
    { key: "stripe_price_vendor_pro", label: "Vendor Pro Price ID ($9.95/mo)" },
    { key: "stripe_price_general_pro", label: "General Pro Price ID ($4.95/mo)" },
  ];

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
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12 flex-wrap">
          <TabsTrigger value="dashboard" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><BarChart3 className="w-4 h-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><CalendarDays className="w-4 h-4" />Events</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><DollarSign className="w-4 h-4" />Payments</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"><Settings className="w-4 h-4" />Settings</TabsTrigger>
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
                <StatCard label="Free Accounts" value={stats.nonProAccounts} />
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

        {/* USERS */}
        <TabsContent value="users" className="mt-0">
          <Card>
            <CardHeader><CardTitle>All Users</CardTitle><CardDescription>View and manage all registered users, their tiers, and admin access.</CardDescription></CardHeader>
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
                      <Button
                        size="sm"
                        variant={u.isAdmin ? "destructive" : "outline"}
                        className="rounded-xl text-xs h-8 shrink-0"
                        onClick={() => toggleAdmin.mutate({ userId: u.userId, isAdmin: !u.isAdmin })}
                      >
                        {u.isAdmin ? "Remove Admin" : "Make Admin"}
                      </Button>
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
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl h-8 shrink-0"
                        onClick={() => deleteEvent.mutate(e.id)}
                      >
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

        {/* PAYMENTS */}
        <TabsContent value="payments" className="mt-0">
          <Card>
            <CardHeader><CardTitle>Vendor Registrations</CardTitle><CardDescription>All vendor space bookings and fees collected.</CardDescription></CardHeader>
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
            <CardHeader><CardTitle>Stripe Price Configuration</CardTitle><CardDescription>Set the Stripe Price IDs for each pro subscription tier. Find these in your Stripe Dashboard under Products.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {tierKeys.map(({ key, label }) => {
                const current = (settings || []).find((s: any) => s.key === key)?.value;
                return (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-semibold block">{label}</label>
                    {current && <p className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded-lg">{current}</p>}
                    <div className="flex gap-3">
                      <Input
                        placeholder="price_..."
                        value={settingInputs[key] || ""}
                        onChange={e => setSettingInputs(p => ({ ...p, [key]: e.target.value }))}
                        className="rounded-xl font-mono text-sm"
                        data-testid={`input-${key}`}
                      />
                      <Button
                        disabled={savingSetting || !settingInputs[key]}
                        onClick={() => { upsertSetting({ key, value: settingInputs[key] }); setSettingInputs(p => ({ ...p, [key]: "" })); }}
                        className="rounded-xl shrink-0"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-2">Quick Setup:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-300 text-xs">
                  <li>Connect your Stripe account via the Replit Stripe integration</li>
                  <li>Create 3 monthly recurring products in Stripe Dashboard</li>
                  <li>Copy each Price ID (starts with <code>price_</code>) and paste above</li>
                  <li>Set <code>STRIPE_WEBHOOK_SECRET</code> in environment secrets</li>
                  <li>Set <code>ADMIN_EMAILS</code> to your email address (currently controls admin access)</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Environment Variables</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { key: "STRIPE_SECRET_KEY", desc: "Your Stripe secret key" },
                  { key: "STRIPE_WEBHOOK_SECRET", desc: "Your Stripe webhook endpoint secret" },
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
      </Tabs>
    </div>
  );
}
