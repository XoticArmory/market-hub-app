import { useState } from "react";
import { useProfile, useUpsertProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionStatus, useCreateCheckout, usePortalSession } from "@/hooks/use-stripe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Store, Package, Users, CreditCard, CheckCircle, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useEvents } from "@/hooks/use-events";
import { format } from "date-fns";
import { Link } from "wouter";

const PROFILE_TYPES = [
  { value: "event_owner", label: "Event Owner", icon: Store, description: "I organize and host local markets and events." },
  { value: "vendor", label: "Vendor", icon: Package, description: "I sell products and crafts at local markets." },
  { value: "general", label: "General", icon: Users, description: "I attend markets as a customer or community member." },
];

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const { data: profileData, isLoading: isLoadingProfile } = useProfile();
  const { data: subStatus } = useSubscriptionStatus();
  const { mutate: upsertProfile, isPending: isSaving } = useUpsertProfile();
  const { mutate: checkout, isPending: isCheckingOut } = useCreateCheckout();
  const { mutate: portal, isPending: isPortal } = usePortalSession();
  const { data: events } = useEvents();
  const [, setLocation] = useLocation();

  const profile = profileData?.profile;
  const authUser = profileData?.user;

  const [form, setForm] = useState({
    profileType: profile?.profileType || "general",
    areaCode: profile?.areaCode || "",
    bio: profile?.bio || "",
    businessName: profile?.businessName || "",
  });

  // Sync form when profile loads
  if (profile && form.profileType === "general" && !form.areaCode && !form.bio) {
    setForm({
      profileType: profile.profileType || "general",
      areaCode: profile.areaCode || "",
      bio: profile.bio || "",
      businessName: profile.businessName || "",
    });
  }

  const myEvents = events?.filter(e => e.createdBy === user?.id) || [];
  const attendingEventIds = (profileData?.attendance || []).filter((a: any) => a.status === "attending").map((a: any) => a.eventId);
  const attendingEvents = events?.filter(e => attendingEventIds.includes(e.id)) || [];

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <User className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Sign In Required</h2>
        <Button asChild size="lg" className="w-full rounded-xl">
          <a href="/api/login">Sign In</a>
        </Button>
      </div>
    );
  }

  if (isLoadingProfile) {
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const handleSave = () => {
    upsertProfile(form);
  };

  const isEventOwner = profile?.profileType === "event_owner";
  const isActive = profile?.subscriptionStatus === "active";

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
          {profile && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="capitalize">{profile.profileType?.replace("_", " ")}</Badge>
              {profile.areaCode && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{profile.areaCode}</Badge>}
              {profile.isAdmin && <Badge className="bg-amber-500 text-white"><ShieldCheck className="w-3 h-3 mr-1" />Admin</Badge>}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
          <TabsTrigger value="profile" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">My Profile</TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">My Events</TabsTrigger>
          {isEventOwner && (
            <TabsTrigger value="billing" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Billing</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card>
            <CardHeader><CardTitle>Profile Settings</CardTitle><CardDescription>Choose your role and area code to connect with your local community.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block">Account Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PROFILE_TYPES.map(({ value, label, icon: Icon, description }) => (
                    <button
                      key={value}
                      type="button"
                      data-testid={`profile-type-${value}`}
                      onClick={() => setForm(f => ({ ...f, profileType: value }))}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${form.profileType === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <Icon className={`w-7 h-7 mb-3 ${form.profileType === value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Area Code / ZIP</label>
                  <Input
                    data-testid="input-area-code"
                    placeholder="e.g. 90210"
                    value={form.areaCode}
                    onChange={e => setForm(f => ({ ...f, areaCode: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                {(form.profileType === "event_owner" || form.profileType === "vendor") && (
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Business Name</label>
                    <Input
                      data-testid="input-business-name"
                      placeholder="Your market or vendor name"
                      value={form.businessName}
                      onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Bio</label>
                <Textarea
                  data-testid="input-bio"
                  placeholder="Tell the community about yourself or your business..."
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-xl" data-testid="button-save-profile">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-0 space-y-6">
          {isEventOwner && myEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-display font-bold mb-4">My Posted Markets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myEvents.map(event => (
                  <Link href={`/events/${event.id}`} key={event.id}>
                    <Card className="hover-elevate cursor-pointer">
                      <CardContent className="p-5">
                        <h4 className="font-bold text-foreground">{event.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
                        <div className="flex flex-wrap gap-3 mt-3 text-sm">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" />{event.attendingCount || 0} attending</span>
                          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-primary" />{event.vendorSpacesUsed || 0}/{event.vendorSpaces || 0} vendor spaces</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {attendingEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-display font-bold mb-4">Events I'm Attending</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendingEvents.map(event => (
                  <Link href={`/events/${event.id}`} key={event.id}>
                    <Card className="hover-elevate cursor-pointer">
                      <CardContent className="p-5">
                        <h4 className="font-bold text-foreground">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{event.location}</p>
                        <div className="mt-2 flex gap-2">
                          <Badge variant="outline"><Users className="w-3 h-3 mr-1" />{event.attendingCount || 0} attending</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {myEvents.length === 0 && attendingEvents.length === 0 && (
            <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No events yet. Browse markets and mark your attendance!</p>
            </div>
          )}
        </TabsContent>

        {isEventOwner && (
          <TabsContent value="billing" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Subscription</CardTitle>
                <CardDescription>A monthly subscription is required to post and manage market events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`p-6 rounded-2xl border-2 ${isActive ? 'border-green-500/30 bg-green-50/50 dark:bg-green-900/10' : 'border-border bg-muted/50'}`}>
                  <div className="flex items-center gap-3">
                    {isActive ? <CheckCircle className="w-7 h-7 text-green-500" /> : <CreditCard className="w-7 h-7 text-muted-foreground" />}
                    <div>
                      <p className="font-bold text-lg text-foreground">{isActive ? "Active Subscription" : "No Active Subscription"}</p>
                      <p className="text-sm text-muted-foreground">{isActive ? "You can post and manage market events." : "$5/month — required to post events."}</p>
                    </div>
                  </div>
                </div>
                {isActive ? (
                  <Button variant="outline" onClick={() => portal()} disabled={isPortal} className="rounded-xl" data-testid="button-manage-billing">
                    {isPortal ? "Opening..." : "Manage Billing"}
                  </Button>
                ) : (
                  <Button onClick={() => checkout()} disabled={isCheckingOut} className="rounded-xl bg-gradient-to-r from-primary to-amber-500 shadow-lg" data-testid="button-subscribe">
                    {isCheckingOut ? "Redirecting..." : "Subscribe for $5/month"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
