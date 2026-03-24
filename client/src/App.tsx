import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect, useState } from "react";
import { Bell, Lightbulb, X, Send, Loader2, CheckCircle2, Rocket, Plus, Pencil, Trash2, Calendar, Users, Clock } from "lucide-react";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { AdminPreviewProvider } from "@/contexts/admin-preview";

import Home from "@/pages/home";
import EventDetail from "@/pages/event-detail";
import AddEvent from "@/pages/add-event";
import Chat from "@/pages/chat";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import SetupPage from "@/pages/setup";
import TourPage from "@/pages/tour";
import AuthPage from "@/pages/auth";
import UpgradePage from "@/pages/upgrade";
import NotFound from "@/pages/not-found";

function OnboardingGuard() {
  const { isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (location === "/tour" || location === "/setup" || location === "/upgrade" || location === "/auth" || location.startsWith("/api")) return;
    const profileLoaded = profileData !== undefined;
    if (!profileLoaded) return;
    const profile = profileData?.profile;
    if (!profile || !profile.onboardingComplete) {
      const hasActiveSub = profile?.subscriptionStatus === "active" && profile?.subscriptionTier !== "free";
      setLocation(hasActiveSub ? "/setup" : "/tour");
    }
  }, [isAuthenticated, profileData, location]);

  return null;
}

function FeedbackButton() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => { setSubject(""); setMessage(""); setSubmitted(false); }, 300);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        title="Send a suggestion"
        data-testid="button-feedback"
      >
        <Lightbulb className="w-5 h-5 text-foreground" />
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Share an Idea
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Thank you!</p>
                <p className="text-sm text-muted-foreground mt-1">Your suggestion has been sent to the team. We read every one.</p>
              </div>
              <Button onClick={handleClose} className="rounded-xl mt-2" data-testid="button-feedback-close">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Have an idea to make VendorGrid better? We'd love to hear it.</p>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Subject</label>
                <Input
                  placeholder="e.g. Add a dark mode toggle"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="rounded-xl"
                  data-testid="input-feedback-subject"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Your Suggestion</label>
                <Textarea
                  placeholder="Describe your idea or improvement..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={4}
                  data-testid="input-feedback-message"
                />
              </div>
              {submit.isError && (
                <p className="text-sm text-destructive">{(submit.error as any)?.message || "Something went wrong."}</p>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="rounded-xl flex-1" onClick={handleClose}>Cancel</Button>
                <Button
                  className="rounded-xl flex-1 bg-gradient-to-r from-primary to-amber-500"
                  disabled={!subject.trim() || !message.trim() || submit.isPending}
                  onClick={() => submit.mutate()}
                  data-testid="button-feedback-submit"
                >
                  {submit.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  released: { label: "Released", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

function RoadmapButton() {
  const { isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const isAdmin = profileData?.profile?.isAdmin === true;

  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", expectedDate: "", tiersAffected: [] as string[], status: "planned" });

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/roadmap"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/roadmap", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] }); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/roadmap/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] }); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/roadmap/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] }); },
  });

  const resetForm = () => { setShowForm(false); setEditingItem(null); setForm({ title: "", description: "", expectedDate: "", tiersAffected: [], status: "planned" }); };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({ title: item.title, description: item.description, expectedDate: item.expectedDate || "", tiersAffected: item.tiersAffected || [], status: item.status });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    if (editingItem) updateMutation.mutate({ id: editingItem.id, ...form });
    else createMutation.mutate(form);
  };

  const tierOptions = [
    { value: "event_owner_pro", label: "Event Owner Pro" },
    { value: "vendor_pro", label: "Vendor Pro" },
    { value: "all", label: "All Users" },
  ];

  const toggleTier = (val: string) => {
    setForm(f => ({
      ...f,
      tiersAffected: f.tiersAffected.includes(val) ? f.tiersAffected.filter(t => t !== val) : [...f.tiersAffected, val],
    }));
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        title="Product Roadmap"
        data-testid="button-roadmap"
      >
        <Rocket className="w-5 h-5 text-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col rounded-2xl p-0 gap-0">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Rocket className="w-5 h-5 text-primary" />
              Product Roadmap
              {isAdmin && !showForm && (
                <Button size="sm" variant="outline" className="ml-auto rounded-lg text-xs h-7" onClick={() => setShowForm(true)} data-testid="button-roadmap-add">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {showForm && isAdmin && (
              <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30 mb-4">
                <p className="text-sm font-semibold">{editingItem ? "Edit Item" : "New Roadmap Item"}</p>
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="rounded-lg"
                  data-testid="input-roadmap-title"
                />
                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="rounded-lg resize-none"
                  rows={3}
                  data-testid="input-roadmap-description"
                />
                <Input
                  placeholder="Expected date (e.g. Q2 2026)"
                  value={form.expectedDate}
                  onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))}
                  className="rounded-lg"
                  data-testid="input-roadmap-date"
                />
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Status</p>
                  <div className="flex gap-2">
                    {(["planned", "in_progress", "released"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        data-testid={`button-roadmap-status-${s}`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Tiers Affected</p>
                  <div className="flex flex-wrap gap-2">
                    {tierOptions.map(t => (
                      <button
                        key={t.value}
                        onClick={() => toggleTier(t.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.tiersAffected.includes(t.value) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        data-testid={`button-roadmap-tier-${t.value}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="rounded-lg flex-1 text-sm" onClick={resetForm}>Cancel</Button>
                  <Button
                    className="rounded-lg flex-1 text-sm"
                    disabled={!form.title.trim() || !form.description.trim() || createMutation.isPending || updateMutation.isPending}
                    onClick={handleSubmit}
                    data-testid="button-roadmap-submit"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? "Save Changes" : "Add Item"}
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Rocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No roadmap items yet.</p>
                {isAdmin && <p className="text-xs mt-1">Click "Add Item" to get started.</p>}
              </div>
            ) : (
              items.map((item: any) => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
                return (
                  <div key={item.id} className="border border-border/60 rounded-xl p-4 hover:border-border transition-colors bg-card" data-testid={`card-roadmap-${item.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {item.tiersAffected?.length > 0 && item.tiersAffected.map((t: string) => (
                            <span key={t} className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                              {tierOptions.find(o => o.value === t)?.label ?? t}
                            </span>
                          ))}
                        </div>
                        <p className="font-semibold text-sm text-foreground" data-testid={`text-roadmap-title-${item.id}`}>{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                        {item.expectedDate && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                            <Calendar className="w-3 h-3" />
                            {item.expectedDate}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" data-testid={`button-roadmap-edit-${item.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm("Delete this roadmap item?")) deleteMutation.mutate(item.id); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            data-testid={`button-roadmap-delete-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const count = unreadData?.count || 0;

  if (!isAuthenticated) return null;

  return (
    <Link
      href="/profile?tab=notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
      data-testid="link-notifications-bell"
    >
      <Bell className="w-5 h-5 text-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none" data-testid="badge-unread-count">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/events/new" component={AddEvent} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/chat" component={Chat} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/tour" component={TourPage} />
      <Route path="/setup" component={SetupPage} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminPreviewProvider>
      <TooltipProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden relative">
              <header className="flex h-14 items-center px-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-20 justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-foreground" />
                  <h1 className="md:hidden font-display font-semibold text-lg">VendorGrid</h1>
                </div>
                <div className="flex items-center gap-1">
                  <RoadmapButton />
                  <FeedbackButton />
                  <NotificationBell />
                </div>
              </header>
              <main className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="p-4 md:p-8 lg:p-12 h-full">
                  <OnboardingGuard />
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
      </AdminPreviewProvider>
    </QueryClientProvider>
  );
}

export default App;
