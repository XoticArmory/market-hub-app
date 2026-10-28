import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowRight, Calendar, CalendarPlus, Check, Crown, Download, ExternalLink,
  Hash, Link2, Mail, MapPin, Navigation, Package, Phone, Share2, ShieldCheck, Users,
} from "lucide-react";
import { SiX, SiFacebook, SiWhatsapp } from "react-icons/si";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useUserRegistrations } from "@/hooks/use-registrations";
import { getNextDate, normalizeUrl, trackAnonEventClick } from "@/lib/event-helpers";

function ShareButton({ event }: { event: any }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const eventId = event.id;
  const eventTitle = event.title;
  const eventUrl = `${window.location.origin}/events/${eventId}`;
  const ogShareUrl = `${window.location.origin}/api/og/events/${eventId}`;

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
    const url = encodeURIComponent(ogShareUrl);
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer,width=600,height=500");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Share event"
          aria-label={`Share ${eventTitle}`}
          data-testid={`button-share-event-${eventId}`}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <DropdownMenuItem onClick={handleCopy} data-testid={`menu-share-copy-${eventId}`} className="gap-2">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Link"}
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
  );
}


function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function CalendarButton({ event }: { event: any }) {
  const title = event.title;
  const location = event.location || "";
  const eventDate = new Date(event.date);
  const nextDay = new Date(eventDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Dates formatted as YYYYMMDD for all-day Google Calendar events
  const gcalDate = `${format(eventDate, "yyyyMMdd")}/${format(nextDay, "yyyyMMdd")}`;
  const eventUrl = `https://www.vendorgrid.net/events/${event.id}`;
  const description = `View event details at ${eventUrl}`;

  const handleGoogle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: gcalDate,
      details: description,
      location,
    });
    window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank", "noopener,noreferrer,width=700,height=600");
  };

  const handleIcs = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const start = formatIcsDate(eventDate);
    const end = formatIcsDate(nextDay);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//VendorGrid//EN",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `URL:${eventUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Add to calendar"
          aria-label={`Add ${title} to calendar`}
          data-testid={`button-calendar-${event.id}`}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <DropdownMenuItem onClick={handleGoogle} data-testid={`menu-cal-google-${event.id}`} className="gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />Google Calendar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleIcs} data-testid={`menu-cal-ics-${event.id}`} className="gap-2">
          <Download className="w-4 h-4" />Apple / Outlook (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type EventCardProps = {
  event: any;
  index?: number;
  /** Vendor posts for this event (the board passes its per-event query data). */
  posts?: any[];
  /** City label resolved for the event's ZIP, when known. */
  cityName?: string | null;
  /** Map mode: card clicks select the event instead of navigating. */
  mapMode?: boolean;
  onSelect?: () => void;
};

/**
 * The board's event card, shared verbatim with the location pages so a
 * listing looks identical everywhere it appears.
 */
export function EventCard({ event, index = 0, posts = [], cityName = null, mapMode = false, onSelect }: EventCardProps) {
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
  const [, navigate] = useLocation();
  const nextDate = getNextDate(event);
  const uniqueVendors = Array.from(new Set(posts.map((p: any) => p.vendorId)));

  return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.4 }} onClick={() => { if (mapMode) onSelect?.(); }}>
        <div className="group h-full bg-card rounded-2xl overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
          {/* Image — clickable link to event */}
          <Link href={`/events/${event.id}`} className="block shrink-0" onClick={(e) => { if (mapMode) e.preventDefault(); else if (!isAuthenticated) trackAnonEventClick(event.id); }}>
            <div className="h-48 bg-muted relative overflow-hidden">
              <img src={(event as any).bannerUrl || `https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop&sig=${event.id}`} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {event.canceledAt ? (
                <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                  CANCELED
                </div>
              ) : (
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur text-foreground px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex flex-col items-center">
                  <span className="text-primary">{format(nextDate, 'MMM')}</span>
                  <span className="text-xl leading-none">{format(nextDate, 'dd')}</span>
                </div>
              )}
              {event.areaCode && (
                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-semibold text-foreground flex flex-col gap-0.5">
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{event.areaCode}</span>
                  {cityName && (
                    <span className="text-[10px] font-normal text-muted-foreground leading-none">{cityName}</span>
                  )}
                </div>
              )}
              {uniqueVendors.length > 0 && (
                <div className="absolute bottom-4 left-4 flex items-center" role="group" aria-label={`${uniqueVendors.length} vendors listing at ${event.title}`} title="Vendors listing at this market">
                  <div className="flex -space-x-2" aria-hidden="true">
                  {posts.slice(0, 3).map((post: any) => (
                    <Avatar key={post.id} title={post.vendorName || "Vendor"} className="w-8 h-8 border-2 border-background ring-2 ring-primary/20">
                      <AvatarImage src={post.vendorAvatar || ""} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{post.vendorName?.charAt(0) || "V"}</AvatarFallback>
                    </Avatar>
                  ))}
                  {uniqueVendors.length > 3 && <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{uniqueVendors.length - 3}</div>}
                  </div>
                  <span className="ml-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground">Vendors</span>
                </div>
              )}
            </div>
          </Link>
          {/* Content */}
          <div className="p-6 flex-1 flex flex-col">
            {/* Title row with share + optional website link */}
            <div className="flex items-start gap-2 mb-2">
              <Link href={`/events/${event.id}`} className="flex-1 min-w-0" onClick={(e) => { if (mapMode) e.preventDefault(); }}>
                <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">{event.title}</h3>
              </Link>
              {(() => {
                const cardRegType = (event as any).vendorRegistrationType as string | undefined;
                const cardRegUrl = (event as any).vendorRegistrationUrl as string | undefined;
                const cardContactEmail = (event as any).contactEmail as string | undefined;
                // Website URL to use in the ExternalLink icon (never use email/phone reg URLs as links)
                const websiteUrl = (event as any).eventWebsiteUrl ||
                  (cardRegType !== 'email' && cardRegType !== 'phone' ? cardRegUrl : undefined) ||
                  (event as any).creatorWebsiteUrl;
                return (<>
                  {/* General contact email icon */}
                  {cardContactEmail && (
                    <a
                      href={`mailto:${cardContactEmail}`}
                      className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Email organizer"
                       aria-label={`Email organizer of ${event.title}`}
                      data-testid={`link-event-email-${event.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {/* Email registration icon — only shown when contactEmail isn't already visible */}
                  {!cardContactEmail && cardRegType === 'email' && cardRegUrl && (
                    <a
                      href={`mailto:${cardRegUrl}`}
                      className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Apply via email"
                       aria-label={`Apply to ${event.title} by email`}
                      data-testid={`link-event-reg-email-${event.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {/* Phone registration icon */}
                  {cardRegType === 'phone' && cardRegUrl && (
                    <a
                      href={`tel:${cardRegUrl.replace(/\s/g, '')}`}
                      className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Apply via phone"
                       aria-label={`Apply to ${event.title} by phone`}
                      data-testid={`link-event-reg-phone-${event.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {/* Website / external registration link */}
                  {websiteUrl && (
                    <a
                      href={normalizeUrl(websiteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title={
                        (event as any).eventWebsiteUrl ? "Visit event website" :
                        cardRegUrl && cardRegType !== 'email' && cardRegType !== 'phone' ? "Visit market website / registration" :
                        "Visit organizer's website"
                      }
                       aria-label={`Visit website for ${event.title}`}
                      data-testid={`link-event-website-${event.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </>);
              })()}
              {event.location && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Get directions on Google Maps"
                   aria-label={`Get directions to ${event.title}`}
                  data-testid={`link-event-maps-${event.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Navigation className="w-3.5 h-3.5" />
                </a>
              )}
              <CalendarButton event={event} />
              <ShareButton event={event} />
            </div>
            {/* Details — link to event */}
            <Link href={`/events/${event.id}`} className="flex-1 flex flex-col" onClick={(e) => { if (mapMode) e.preventDefault(); }}>
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-start gap-2 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" /><span className="line-clamp-2">{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4 shrink-0 text-primary/70" />
                  <span>
                    {format(nextDate, 'h:mm a')}
                    {(event as any).endTime && <> – {format(new Date((event as any).endTime), 'h:mm a')}</>}
                  </span>
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
              <span className="text-sm font-medium text-muted-foreground shrink-0">{posts.length} items listed</span>
              <div className="flex items-center gap-2">
                {/* Vendor Registration / Apply button — only for active, non-owned events */}
                {!event.canceledAt && event.createdBy !== user?.id && (() => {
                  const regType = (event as any).vendorRegistrationType as string | undefined;
                  const regUrl = (event as any).vendorRegistrationUrl as string | undefined;
                  const hasDirectReg = regType && regType !== 'vendorgrid' && regUrl;

                  if (registeredEventIds.has(event.id)) {
                    return (
                      <Badge className="rounded-xl gap-1.5 h-8 px-3 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700" data-testid={`badge-registered-${event.id}`}>
                        <ShieldCheck className="w-3.5 h-3.5" />Registered
                      </Badge>
                    );
                  }

                  // Direct-registration events: Apply button works for everyone
                  if (hasDirectReg) {
                    const handleApply = (e: React.MouseEvent) => {
                      e.preventDefault();
                      if (regType === 'email') {
                        window.location.href = `mailto:${regUrl}`;
                      } else if (regType === 'phone') {
                        window.location.href = `tel:${regUrl!.replace(/\s/g, '')}`;
                      } else {
                        window.open(normalizeUrl(regUrl!), '_blank', 'noopener,noreferrer');
                      }
                    };
                    // External apply (form/site): the button leaves
                    // VendorGrid — say so with icon + label.
                    const isExternalApply = regType !== 'email' && regType !== 'phone';
                    const ApplyIcon = regType === 'email' ? Mail : regType === 'phone' ? Phone : ExternalLink;
                    return (
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 h-8 text-xs"
                        onClick={handleApply}
                        title={isExternalApply ? "Apply on the organizer's site (leaves VendorGrid)" : undefined}
                        aria-label={isExternalApply ? `Apply to ${event.title} on the organizer's site (leaves VendorGrid)` : undefined}
                        data-testid={`button-apply-card-${event.id}`}
                      >
                        <ApplyIcon className="w-3.5 h-3.5" />Apply
                      </Button>
                    );
                  }

                  // VendorGrid registration or no registration set
                  if (isVendorPro) {
                    return (
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 h-8 text-xs"
                        onClick={(e) => { e.preventDefault(); navigate(`/events/${event.id}`); }}
                        data-testid={`button-vendor-registration-card-${event.id}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />Vendor Registration
                      </Button>
                    );
                  }

                  if (isAuthenticated) {
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-1.5 h-8 text-xs border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={(e) => { e.preventDefault(); navigate("/pro"); }}
                        data-testid={`button-upgrade-card-${event.id}`}
                      >
                        <Crown className="w-3.5 h-3.5" />Register
                      </Button>
                    );
                  }

                  // Logged-out user on a VendorGrid-registration event — show Apply → event detail
                  if (regType === 'vendorgrid' || !regType) {
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-1.5 h-8 text-xs"
                        onClick={(e) => { e.preventDefault(); navigate(`/events/${event.id}`); }}
                        data-testid={`button-apply-guest-card-${event.id}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />Apply
                      </Button>
                    );
                  }

                  return null;
                })()}
                <Link href={`/events/${event.id}`} aria-label={`View ${event.title} details`}>
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
}
