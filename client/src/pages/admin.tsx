import { useState } from "react";
import { useAdminSettings, useAdminUsers, useUpsertSetting, useClaimAdmin } from "@/hooks/use-admin";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Settings, Users, DollarSign, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { isAuthenticated } = useAuth();
  const { data: profileData, isLoading: loadingProfile } = useProfile();
  const { data: settings, isLoading: loadingSettings } = useAdminSettings();
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const { mutate: upsertSetting, isPending: savingSetting } = useUpsertSetting();
  const { mutate: claimAdmin, isPending: claimingAdmin } = useClaimAdmin();
  const { toast } = useToast();

  const [priceId, setPriceId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const isAdmin = profileData?.profile?.isAdmin === true;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Admin Access</h2>
        <Button asChild size="lg" className="w-full rounded-xl"><a href="/api/login">Sign In</a></Button>
      </div>
    );
  }

  if (loadingProfile) {
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg space-y-6">
        <ShieldCheck className="w-16 h-16 text-amber-500 mx-auto" />
        <div>
          <h2 className="text-3xl font-display font-bold mb-2">Admin Panel</h2>
          <p className="text-muted-foreground">Your email must be in the <code className="bg-muted px-1 rounded text-sm">ADMIN_EMAILS</code> environment variable to access this panel.</p>
        </div>
        <Button onClick={() => claimAdmin()} disabled={claimingAdmin} className="w-full rounded-xl" data-testid="button-claim-admin">
          {claimingAdmin ? "Verifying..." : "Claim Admin Access"}
        </Button>
      </div>
    );
  }

  const getPriceIdSetting = () => (settings || []).find((s: any) => s.key === "stripe_price_id")?.value || "";
  
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage settings, payments, and users.</p>
        </div>
      </div>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
          <TabsTrigger value="payments" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <DollarSign className="w-4 h-4" />Payments
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Users className="w-4 h-4" />Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Settings className="w-4 h-4" />Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Payment Configuration</CardTitle>
              <CardDescription>Configure the Stripe Price ID for the $5/month event owner subscription. Find this in your Stripe dashboard under Products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Current Price ID</label>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded-xl">{getPriceIdSetting() || "Not configured"}</p>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Set Stripe Price ID</label>
                <div className="flex gap-3">
                  <Input
                    data-testid="input-stripe-price-id"
                    placeholder="price_1234567890..."
                    value={priceId}
                    onChange={e => setPriceId(e.target.value)}
                    className="rounded-xl font-mono"
                  />
                  <Button
                    data-testid="button-save-price-id"
                    disabled={savingSetting || !priceId}
                    onClick={() => { upsertSetting({ key: "stripe_price_id", value: priceId }); setPriceId(""); }}
                    className="rounded-xl shrink-0"
                  >
                    {savingSetting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-300">
                  <li>Connect your Stripe account via the Replit Stripe integration</li>
                  <li>Create a $5/month recurring product in your Stripe dashboard</li>
                  <li>Copy the Price ID (starts with <code>price_</code>) and paste it above</li>
                  <li>Set <code>STRIPE_WEBHOOK_SECRET</code> in environment secrets for subscription tracking</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-2">
                  {(settings || []).map((s: any) => (
                    <div key={s.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <span className="font-mono text-sm text-muted-foreground">{s.key}</span>
                      <span className="font-mono text-sm text-foreground truncate max-w-[200px]">{s.value}</span>
                    </div>
                  ))}
                  {(settings || []).length === 0 && <p className="text-muted-foreground text-sm">No settings configured yet.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <Card>
            <CardHeader><CardTitle>Registered Users</CardTitle><CardDescription>View all users and their profile types and subscription statuses.</CardDescription></CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-3">
                  {(users || []).map((u: any) => (
                    <div key={u.userId} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl" data-testid={`user-row-${u.userId}`}>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.user?.profileImageUrl || ""} />
                        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{u.user?.firstName} {u.user?.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{u.user?.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {u.profileType && <Badge variant="secondary" className="capitalize">{u.profileType.replace("_", " ")}</Badge>}
                        {u.profileType === "event_owner" && (
                          <Badge variant={u.subscriptionStatus === "active" ? "default" : "outline"} className={u.subscriptionStatus === "active" ? "bg-green-500" : ""}>
                            {u.subscriptionStatus || "inactive"}
                          </Badge>
                        )}
                        {u.isAdmin && <Badge className="bg-amber-500 text-white">Admin</Badge>}
                      </div>
                    </div>
                  ))}
                  {(users || []).length === 0 && <p className="text-muted-foreground text-sm">No users found.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Environment variables are managed in the Replit Secrets panel. Required variables:</p>
              <div className="space-y-2">
                {[
                  { key: "STRIPE_SECRET_KEY", desc: "Your Stripe secret key (sk_live_... or sk_test_...)" },
                  { key: "STRIPE_WEBHOOK_SECRET", desc: "Your Stripe webhook endpoint secret" },
                  { key: "ADMIN_EMAILS", desc: "Comma-separated admin email addresses" },
                  { key: "SESSION_SECRET", desc: "Random session secret (already set)" },
                ].map(item => (
                  <div key={item.key} className="p-3 bg-muted/50 rounded-xl">
                    <p className="font-mono text-sm font-semibold text-foreground">{item.key}</p>
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
