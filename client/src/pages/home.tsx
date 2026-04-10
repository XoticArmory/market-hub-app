import { useState } from "react";
import { useEvents } from "@/hooks/use-events";
import { Link, useLocation } from "wouter";
import { Calendar, MapPin, ArrowRight, Loader2, Sparkles, Package, Users, Image as ImageIcon, Filter, Hash, ExternalLink, Share2, Link2, Check, ShieldCheck, Crown, ArrowUpDown, ArrowUp, ArrowDown, Mail, Download, ImageIcon as ImgIcon, X as XIcon } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiX, SiFacebook, SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useUserRegistrations } from "@/hooks/use-registrations";

function normalizeUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function getAnonSessionId(): string {
  const key = "vg_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

function trackAnonEventClick(eventId: number) {
  const sessionId = getAnonSessionId();
  fetch("/api/track/event-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, sessionId }),
  }).catch(() => {});
}

async function generateShareCard(event: any): Promise<{ dataUrl: string; blob: Blob }> {
  const W = 800, H = 440;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const wrapText = (text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 2) => {
    const words = text.split(" ");
    let line = "";
    let linesDrawn = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + " ";
      if (ctx.measureText(test).width > maxW && i > 0) {
        if (linesDrawn === maxLines - 1) { ctx.fillText(line.trimEnd() + "…", x, y); return; }
        ctx.fillText(line.trimEnd(), x, y);
        line = words[i] + " ";
        y += lineH;
        linesDrawn++;
      } else { line = test; }
    }
    ctx.fillText(line.trimEnd(), x, y);
  };

  const BannerH = 280;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = event.bannerUrl || `https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop&sig=${event.id}`;
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });

  if (img.naturalWidth > 0) {
    const aspect = img.naturalWidth / img.naturalHeight;
    const dw = Math.max(W, BannerH * aspect);
    const dh = Math.max(BannerH, W / aspect);
    const dx = (W - dw) / 2;
    const dy = (BannerH - dh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, BannerH);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, BannerH);
    grad.addColorStop(0, "#6366f1");
    grad.addColorStop(1, "#8b5cf6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, BannerH);
  }

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(0, 0, W, BannerH);

  const dateStr = format(new Date(event.date), "MMM d, yyyy");
  const datePad = 12, dateFontSize = 15;
  ctx.font = `bold ${dateFontSize}px system-ui, sans-serif`;
  const dateW = ctx.measureText(dateStr).width + datePad * 2;
  const dateH = 34;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  drawRoundedRect(W - dateW - 20, 20, dateW, dateH, 8);
  ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  ctx.textAlign = "center";
  ctx.fillText(dateStr, W - dateW / 2 - 20, 20 + dateH / 2 + 5);
  ctx.textAlign = "left";

  if (event.areaCode) {
    ctx.font = `bold 13px system-ui, sans-serif`;
    const acW = ctx.measureText(`#${event.areaCode}`).width + 20;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    drawRoundedRect(20, 20, acW, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(`#${event.areaCode}`, 30, 40);
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, BannerH, W, H - BannerH);

  ctx.font = `bold 26px system-ui, sans-serif`;
  ctx.fillStyle = "#1a1a2e";
  wrapText(event.title, 28, BannerH + 38, W - 56, 32, 2);

  ctx.font = `15px system-ui, sans-serif`;
  ctx.fillStyle = "#64748b";
  const loc = event.location || "";
  wrapText(loc.length > 70 ? loc.slice(0, 68) + "…" : loc, 28, BannerH + 82, W - 56, 20, 1);

  const infoY = BannerH + 108;
  ctx.font = `13px system-ui, sans-serif`;
  ctx.fillStyle = "#94a3b8";
  const attending = event.attendingCount || 0;
  const interested = event.interestedCount || 0;
  ctx.fillText(`${attending} attending · ${interested} interested`, 28, infoY);

  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, H - 44, W, 44);
  ctx.font = `bold 14px system-ui, sans-serif`;
  ctx.fillStyle = "#6366f1";
  ctx.fillText("VendorGrid", 28, H - 16);
  ctx.font = `13px system-ui, sans-serif`;
  ctx.fillStyle = "#64748b";
  const eventPath = `/events/${event.id}`;
  ctx.textAlign = "right";
  ctx.fillText(`vendorgrid.net${eventPath}`, W - 28, H - 16);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
      resolve({ dataUrl: canvas.toDataURL("image/png"), blob });
    }, "image/png");
  });
}

function ShareButton({ event }: { event: any }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [imgCopied, setImgCopied] = useState(false);
  const eventId = event.id;
  const eventTitle = event.title;
  const eventUrl = `${window.location.origin}/events/${eventId}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(eventUrl).then(() => {
      setCopied(true);
      toast({ title: "Link copied!", description: "Event link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = (platform: "twitter" | "facebook" | "whatsapp") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = encodeURIComponent(`Check out this market event: ${eventTitle}`);
    const url = encodeURIComponent(eventUrl);
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleShareCard = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCardLoading(true);
    setCardDataUrl(null);
    setCardBlob(null);
    setCardOpen(true);
    try {
      const { dataUrl, blob } = await generateShareCard(event);
      setCardDataUrl(dataUrl);
      setCardBlob(blob);
    } catch {
      toast({ title: "Couldn't generate card", description: "Please try again.", variant: "destructive" });
      setCardOpen(false);
    } finally {
      setCardLoading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": cardBlob })]);
      setImgCopied(true);
      toast({ title: "Image copied!", description: "Paste it into any post or message." });
      setTimeout(() => setImgCopied(false), 2500);
    } catch {
      toast({ title: "Copy not supported", description: "Try downloading and sharing the image instead.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const a = document.createElement("a");
    a.href = cardDataUrl;
    a.download = `vendorgrid-event-${eventId}.png`;
    a.click();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Share event"
            data-testid={`button-share-event-${eventId}`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <DropdownMenuItem onClick={handleCopy} data-testid={`menu-share-copy-${eventId}`} className="gap-2">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareCard} data-testid={`menu-share-card-${eventId}`} className="gap-2">
            <ImgIcon className="w-4 h-4" /> Share Event Card
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleShare("twitter")} data-testid={`menu-share-twitter-${eventId}`} className="gap-2">
            <SiX className="w-4 h-4" /> Share on X
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare("facebook")} data-testid={`menu-share-facebook-${eventId}`} className="gap-2">
            <SiFacebook className="w-4 h-4" /> Share on Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare("whatsapp")} data-testid={`menu-share-whatsapp-${eventId}`} className="gap-2">
            <SiWhatsapp className="w-4 h-4" /> Share on WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cardOpen} onOpenChange={(open) => { if (!open) setCardOpen(false); }}>
        <DialogContent className="max-w-xl" onClick={(e) => e.stopPropagation()} data-testid={`dialog-share-card-${eventId}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" />Share Event Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cardLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating card…</p>
              </div>
            ) : cardDataUrl ? (
              <>
                <a
                  href={eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-border shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  title="Click to open the event page"
                  data-testid={`link-share-card-preview-${eventId}`}
                >
                  <img src={cardDataUrl} alt={eventTitle} className="w-full h-auto" />
                </a>
                <p className="text-xs text-center text-muted-foreground">Click the image to open the event page</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={handleCopyImage}
                    data-testid={`button-copy-card-image-${eventId}`}
                  >
                    {imgCopied ? <Check className="w-4 h-4 text-green-500" /> : <ImgIcon className="w-4 h-4" />}
                    {imgCopied ? "Image Copied!" : "Copy Image"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={handleDownload}
                    data-testid={`button-download-card-${eventId}`}
                  >
                    <Download className="w-4 h-4" /> Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={handleCopy}
                    data-testid={`button-copy-link-from-card-${eventId}`}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                    {copied ? "Link Copied!" : "Copy Link"}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Home() {
  const [areaInput, setAreaInput] = useState("");
  const [areaFilter, setAreaFilter] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"nearest" | "furthest">("nearest");
  const { data: events, isLoading: isLoadingEvents } = useEvents(areaFilter);
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isAdmin = profile?.isAdmin === true;
  const isVendorPro = isAdmin || (profile?.subscriptionTier === "vendor_pro" && profile?.subscriptionStatus === "active");
  const { data: myRegistrations = [] } = useUserRegistrations();
  const registeredEventIds = new Set(
    (myRegistrations as any[])
      .filter((r: any) => r.status !== "canceled")
      .map((r: any) => r.eventId)
  );

  const postQueries = useQueries({
    queries: (events || []).map((event) => ({
      queryKey: ["/api/events", event.id, "posts"],
      queryFn: async () => {
        const res = await fetch(`/api/events/${event.id}/posts`);
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!events,
    })),
  });

  const isLoadingPosts = postQueries.some((q) => q.isLoading);
  const allPosts = postQueries.flatMap((q) => q.data || []);

  const postsByEventId = new Map(
    (events || []).map((event, i) => [event.id, postQueries[i]?.data || []])
  );

  const sortedEvents = [...(events || [])].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return sortOrder === "nearest" ? diff : -diff;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero */}
      <section className="relative rounded-3xl overflow-hidden glass-panel">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop" alt="Artisan Market" className="w-full h-full object-cover opacity-20 dark:opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        </div>
        <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:w-2/3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 w-fit border border-primary/20">
            <Sparkles className="w-4 h-4" /><span>Support Local Creators</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">Discover & Connect with Local Markets</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">See what vendors are bringing to upcoming events, claim your spot, and chat with fellow artisans in your community.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/events/new" className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
              Host an Event <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/chat" className="px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all duration-200">
              Join the Chat
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs defaultValue="markets" className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Community Board</h2>
            <p className="text-muted-foreground mt-2">Explore registered markets and vendor collections.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Hash className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  data-testid="input-area-filter"
                  placeholder="Filter by area code..."
                  value={areaInput}
                  onChange={e => setAreaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setAreaFilter(areaInput || undefined); }}
                  className="pl-9 rounded-xl h-10 w-48 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => setAreaFilter(areaInput || undefined)} className="rounded-xl h-10" data-testid="button-filter">
                <Filter className="w-4 h-4" />
              </Button>
              {areaFilter && (
                <Button size="sm" variant="ghost" onClick={() => { setAreaFilter(undefined); setAreaInput(""); }} className="rounded-xl h-10 text-muted-foreground text-sm">
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/50 border border-border/50 rounded-xl p-1 h-10">
              <Button
                size="sm"
                variant={sortOrder === "nearest" ? "default" : "ghost"}
                className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
                onClick={() => setSortOrder("nearest")}
                data-testid="button-sort-nearest"
              >
                <ArrowUp className="w-3 h-3" />Nearest
              </Button>
              <Button
                size="sm"
                variant={sortOrder === "furthest" ? "default" : "ghost"}
                className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
                onClick={() => setSortOrder("furthest")}
                data-testid="button-sort-furthest"
              >
                <ArrowDown className="w-3 h-3" />Furthest
              </Button>
            </div>
            <TabsList className="bg-muted/50 p-1 rounded-xl h-10 w-fit">
              <TabsTrigger value="markets" className="rounded-lg px-5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5" />Markets
              </TabsTrigger>
              <TabsTrigger value="items" className="rounded-lg px-5 h-8 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-sm">
                <ImageIcon className="w-3.5 h-3.5" />Community Items
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="markets" className="mt-0">
          {areaFilter && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-sm py-1.5 px-3"><Hash className="w-3 h-3 mr-1" />Area: {areaFilter}</Badge>
            </div>
          )}
          {isLoadingEvents ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" /><p>Loading markets...</p>
            </div>
          ) : events?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{areaFilter ? `No events in area ${areaFilter}` : "No events scheduled"}</h3>
              <p className="text-muted-foreground mb-6">Be the first to add a local market event to the board.</p>
              <Link href="/events/new" className="text-primary font-medium hover:underline">Create an event</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedEvents.map((event, i) => {
                const eventPosts = postsByEventId.get(event.id) || [];
                const uniqueVendors = Array.from(new Set(eventPosts.map((p: any) => p.vendorId)));
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }} key={event.id}>
                    <div className="group h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      {/* Image — clickable link to event */}
                      <Link href={`/events/${event.id}`} className="block shrink-0" onClick={() => { if (!isAuthenticated) trackAnonEventClick(event.id); }}>
                        <div className="h-48 bg-muted relative overflow-hidden">
                          <img src={(event as any).bannerUrl || `https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop&sig=${event.id}`} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {event.canceledAt ? (
                            <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                              CANCELED
                            </div>
                          ) : (
                            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur text-foreground px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex flex-col items-center">
                              <span className="text-primary">{format(new Date(event.date), 'MMM')}</span>
                              <span className="text-xl leading-none">{format(new Date(event.date), 'dd')}</span>
                            </div>
                          )}
                          {event.areaCode && (
                            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-semibold text-foreground flex items-center gap-1">
                              <Hash className="w-3 h-3" />{event.areaCode}
                            </div>
                          )}
                          {uniqueVendors.length > 0 && (
                            <div className="absolute bottom-4 left-4 flex -space-x-2">
                              {eventPosts.slice(0, 3).map((post: any) => (
                                <Avatar key={post.id} className="w-8 h-8 border-2 border-background ring-2 ring-primary/20">
                                  <AvatarImage src={post.vendorAvatar || ""} />
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{post.vendorName?.charAt(0) || "V"}</AvatarFallback>
                                </Avatar>
                              ))}
                              {uniqueVendors.length > 3 && <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{uniqueVendors.length - 3}</div>}
                            </div>
                          )}
                        </div>
                      </Link>
                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col">
                        {/* Title row with share + optional website link */}
                        <div className="flex items-start gap-2 mb-2">
                          <Link href={`/events/${event.id}`} className="flex-1 min-w-0">
                            <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">{event.title}</h3>
                          </Link>
                          {(event as any).contactEmail && (
                            <a
                              href={`mailto:${(event as any).contactEmail}`}
                              className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title={`Email organizer: ${(event as any).contactEmail}`}
                              data-testid={`link-event-email-${event.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {(event as any).creatorWebsiteUrl && (
                            <a
                              href={normalizeUrl((event as any).creatorWebsiteUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Visit organizer's website"
                              data-testid={`link-event-website-${event.id}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <ShareButton event={event} />
                        </div>
                        {/* Details — link to event */}
                        <Link href={`/events/${event.id}`} className="flex-1 flex flex-col">
                          <div className="space-y-2 mb-4 flex-1">
                            <div className="flex items-start gap-2 text-muted-foreground text-sm">
                              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" /><span className="line-clamp-2">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Users className="w-4 h-4 shrink-0 text-primary/70" />
                              <span>{event.attendingCount || 0} attending · {event.interestedCount || 0} interested</span>
                            </div>
                            {(event.vendorSpaces || 0) > 0 && (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Package className="w-4 h-4 shrink-0 text-primary/70" />
                                <span>{(event.vendorSpaces || 0) - (event.vendorSpacesUsed || 0)} vendor spaces remaining</span>
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Card footer */}
                        <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-auto gap-2">
                          <span className="text-sm font-medium text-muted-foreground shrink-0">{eventPosts.length} items listed</span>
                          <div className="flex items-center gap-2">
                            {/* Vendor Registration button — only for active, non-owned events */}
                            {!event.canceledAt && event.createdBy !== user?.id && (
                              registeredEventIds.has(event.id) ? (
                                <Badge className="rounded-xl gap-1.5 h-8 px-3 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700" data-testid={`badge-registered-${event.id}`}>
                                  <ShieldCheck className="w-3.5 h-3.5" />Registered
                                </Badge>
                              ) : isVendorPro ? (
                                <Button
                                  size="sm"
                                  className="rounded-xl gap-1.5 h-8 text-xs"
                                  onClick={(e) => { e.preventDefault(); navigate(`/events/${event.id}`); }}
                                  data-testid={`button-vendor-registration-card-${event.id}`}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />Vendor Registration
                                </Button>
                              ) : isAuthenticated ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl gap-1.5 h-8 text-xs border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  onClick={(e) => { e.preventDefault(); navigate("/upgrade"); }}
                                  data-testid={`button-upgrade-card-${event.id}`}
                                >
                                  <Crown className="w-3.5 h-3.5" />Register
                                </Button>
                              ) : null
                            )}
                            <Link href={`/events/${event.id}`}>
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-0">
          {isLoadingPosts ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : allPosts.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No items posted by vendors yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allPosts.map((post: any) => (
                <Link href={`/events/${post.eventId}`} key={post.id}>
                  <div className="group bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="aspect-square bg-muted relative">
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt={post.vendorName || "Vendor item"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                          <Package className="w-10 h-10 mb-2" /><span className="text-xs uppercase tracking-tighter">No Photo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                        <p className="text-white text-xs font-medium line-clamp-1">{post.vendorName}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-foreground font-medium line-clamp-2 min-h-[2.5rem]">{post.itemsDescription}</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-3">{events?.find((e: any) => e.id === post.eventId)?.title || "Event"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
