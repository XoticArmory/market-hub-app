import { useState } from "react";
import { useProfile, useUpsertProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { usePortalSession } from "@/hooks/use-stripe";
import { useNotifications, useMarkAllRead } from "@/hooks/use-notifications";
import { useSendNotification } from "@/hooks/use-notifications";
import { useOwnerAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Store, Package, Users, CreditCard, CheckCircle, Loader2, MapPin, ShieldCheck, Bell, BarChart3, Map, Star, Crown, Send } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEvents } from "@/hooks/use-events";
import { format } from "date-fns";
import { EventMapEditor } from "@/components/EventMapEditor";

const PROFILE_TYPES = [
  { value: "event_owner", label: "Event Owner", icon: Store, description: "I organize and host local markets and events." },
  { value: "vendor", label: "Vendor", icon: Package, description: "I sell products and crafts at local markets." },
  { value: "general", label: "General", icon: Users, description: "I attend markets as a customer or community member." },
];

const TIER_LABELS: Record<string, string> = {
  event_owner_pro: "Event Owner Pro",
  vendor_pro: "Vendor Pro",
  general_pro: "General Pro",
  free: "Free",
};

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const { data: profileData, isLoading: isLoadingProfile } = useProfile();
  const { mutate: upsertProfile, isPending: isSaving } = useUpsertProfile();
  const { mutate: portal, isPending: isPortal } = usePortalSession();
  const { data: events } = useEvents();
  const { data: notifications } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();
  const { mutate: sendNotification, isPending: isSendingNotif } = useSendNotification();
  const [, setLocation] = useLocation();

  const profile = profileData?.profile;
  const userId = user?.id;
  const isEventOwnerPro = profile?.subscriptionTier === "event_owner_pro" && profile?.subscriptionStatus === "active";
  const isVendorPro = profile?.subscriptionTier === "vendor_pro" && profile?.subscriptionStatus === "active";
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier !== "free";

  const { data: analytics } = useOwnerAnalytics(isEventOwnerPro ? userId : undefined);

  const [form, setForm] = useState({
    profileType: profile?.profileType || "general",
    areaCode: profile?.areaCode || "",
    bio: profile?.bio || "",
    businessName: profile?.businessName || "",
  });
  const [notifForm, setNotifForm] = useState({ title: "", message: "" });
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

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

  const currentTierLabel = TIER_LABELS[profile?.subscriptionTier || "free"];

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
            {profile && <Badge variant="secondary" className="capitalize">{profile.profileType?.replace("_", " ")}</Badge>}
            {profile?.areaCode && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{profile.areaCode}</Badge>}
            {profile?.isAdmin && <Badge className="bg-amber-500 text-white"><ShieldCheck className="w-3 h-3 mr-1" />Admin</Badge>}
            {hasActivePro && (
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12 flex-wrap gap-1">
          <TabsTrigger value="profile" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">My Profile</TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Events</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm relative" data-testid="tab-notifications">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] inline-block text-center">{unreadCount}</span>
            )}
          </TabsTrigger>
          {isEventOwnerPro && (
            <TabsTrigger value="analytics" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-1.5" />Analytics
            </TabsTrigger>
          )}
          {isEventOwnerPro && (
            <TabsTrigger value="push" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-push">
              <Bell className="w-4 h-4 mr-1.5" />Push Notify
            </TabsTrigger>
          )}
          {isEventOwnerPro && (
            <TabsTrigger value="map" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-map">
              <Map className="w-4 h-4 mr-1.5" />Event Map
            </TabsTrigger>
          )}
          <TabsTrigger value="billing" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Billing</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card>
            <CardHeader><CardTitle>Profile Settings</CardTitle><CardDescription>Choose your role and area code to connect with your local community.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-3 block">Account Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PROFILE_TYPES.map(({ value, label, icon: Icon, description }) => (
                    <button key={value} type="button" data-testid={`profile-type-${value}`}
                      onClick={() => setForm(f => ({ ...f, profileType: value }))}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${form.profileType === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
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
                  <Input data-testid="input-area-code" placeholder="e.g. 90210" value={form.areaCode} onChange={e => setForm(f => ({ ...f, areaCode: e.target.value }))} className="rounded-xl" />
                </div>
                {(form.profileType === "event_owner" || form.profileType === "vendor") && (
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Business Name</label>
                    <Input data-testid="input-business-name" placeholder="Your market or vendor name" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} className="rounded-xl" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Bio</label>
                <Textarea data-testid="input-bio" placeholder="Tell the community about yourself..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="rounded-xl resize-none" rows={3} />
              </div>
              <Button onClick={() => upsertProfile(form)} disabled={isSaving} className="rounded-xl" data-testid="button-save-profile">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="mt-0 space-y-6">
          {myEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-display font-bold mb-4">My Posted Markets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myEvents.map(event => (
                  <Link href={`/events/${event.id}`} key={event.id}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-5">
                        <h4 className="font-bold text-foreground">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'MMM d, yyyy')} · {event.location}</p>
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

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Notifications</CardTitle><CardDescription>In-app alerts from event owners and the platform.</CardDescription></div>
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

        {/* ANALYTICS (Event Owner Pro only) */}
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

        {/* PUSH NOTIFICATIONS (Event Owner Pro only) */}
        {isEventOwnerPro && (
          <TabsContent value="push" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Send Push Notification</CardTitle>
                <CardDescription>Send a notification to Vendor Pro accounts in your area code or who have attended your events in the last 3 years.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    placeholder="Tell vendors what's happening..."
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
                    sendNotification({ title: notifForm.title, message: notifForm.message, eventId: selectedEventId || undefined });
                    setNotifForm({ title: "", message: "" });
                    setSelectedEventId(null);
                  }}
                  data-testid="button-send-notification"
                >
                  {isSendingNotif ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send to Vendor Pros</>}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Notifications will be sent to Vendor Pro accounts in your area code and those who've attended your events.</p>
              </CardContent>
            </Card>
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
                  <EventMapEditor eventId={selectedEventId} readOnly={false} />
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
        <TabsContent value="billing" className="mt-0">
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
                      {hasActivePro ? "Your Pro subscription is active." : "Upgrade to unlock premium features."}
                    </p>
                  </div>
                </div>
              </div>
              {hasActivePro ? (
                <Button variant="outline" onClick={() => portal()} disabled={isPortal} className="rounded-xl" data-testid="button-manage-billing">
                  {isPortal ? "Opening..." : "Manage Billing"}
                </Button>
              ) : (
                <Button onClick={() => setLocation("/upgrade")} className="rounded-xl bg-gradient-to-r from-primary to-amber-500 shadow-lg" data-testid="button-go-upgrade">
                  <Crown className="w-4 h-4 mr-2" />View Pro Plans
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
