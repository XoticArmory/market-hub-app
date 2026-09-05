import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRegistrations, useSetManualFeeStatus } from "@/hooks/use-registrations";
import { useEvents } from "@/hooks/use-events";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, ChevronDown, CheckCircle2, Circle, 
  ExternalLink, Mail, FileText, Eye, Loader2, Store, 
  Clock, Info, AlertCircle, ArrowRight, Phone, LogIn
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UnifiedMarket {
  id: string;
  type: 'registration' | 'owned';
  event: any;
  registration?: any;
}

function formatCurrency(cents: number) {
  if (!cents) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function isValidDate(d: any) {
  return d instanceof Date && !isNaN(d.getTime());
}

function formatExtraDates(dates: any) {
  if (!Array.isArray(dates) || dates.length === 0) return null;
  const formatted = dates.flatMap((entry: any) => {
    const start = new Date(entry?.date ?? entry);
    if (!isValidDate(start)) return [];

    let label = format(start, "MMM d, yyyy");
    if (entry?.endTime) {
      const end = new Date(entry.endTime);
      if (isValidDate(end)) {
        label += `, ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
      }
    }
    return [label];
  });
  return formatted.length > 0 ? formatted.join(", ") : "Date unavailable";
}

export default function ManageMarketsPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: registrations = [], isLoading: loadingRegs, error: errorRegs } = useUserRegistrations();
  const { data: events = [], isLoading: loadingEvents, error: errorEvents } = useEvents();

  const markets = useMemo(() => {
    if (!user) return [];
    
    const unified: UnifiedMarket[] = [];
    const handledEventIds = new Set<number>();
    
    const activeRegs = registrations.filter((r: any) => r.status !== 'canceled' && !r.event?.canceledAt);
    for (const reg of activeRegs) {
      if (!reg.event) continue;
      unified.push({
        id: `reg-${reg.id}`,
        type: 'registration',
        event: reg.event,
        registration: reg
      });
      handledEventIds.add(reg.event.id);
    }
    
    const ownedEvents = events.filter((e: any) => e.createdBy === user.id && !e.canceledAt);
    for (const event of ownedEvents) {
      if (!handledEventIds.has(event.id)) {
        unified.push({
          id: `own-${event.id}`,
          type: 'owned',
          event: event
        });
        handledEventIds.add(event.id);
      }
    }
    
    unified.sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
    
    return unified;
  }, [registrations, events, user]);

  const isLoading = loadingRegs || loadingEvents;
  const error = errorRegs || errorEvents;

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto py-16 md:py-24">
        <div className="bg-card border border-border/60 rounded-3xl p-8 md:p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Manage Your Markets</h1>
          <p className="text-muted-foreground mb-7">
            Sign in to view your registered markets, hosted events, fee status, and event documents.
          </p>
          <Button asChild className="rounded-xl px-7">
            <a href="/auth">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Manage Your Markets</h1>
        </div>
        <p className="text-lg text-muted-foreground pl-1">Your dependable command center for upcoming events.</p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl h-24 animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
          <div>
            <h3 className="font-semibold text-destructive">Failed to load markets</h3>
            <p className="text-sm text-destructive/80 mt-1">Please try refreshing the page.</p>
          </div>
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border/60 border-dashed rounded-3xl text-center shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 text-muted-foreground">
            <Store className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-display font-semibold mb-2">No upcoming markets</h3>
          <p className="text-muted-foreground max-w-sm mb-6">You haven't registered for any events yet. Find an event and claim your spot to get started.</p>
          <Link href="/">
            <Button className="rounded-xl px-6 bg-gradient-to-r from-primary to-amber-500 font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300">
              Browse Events
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map(m => <MarketCard key={m.id} data={m} />)}
        </div>
      )}
    </div>
  );
}

function MarketCard({ data }: { data: UnifiedMarket }) {
  const [expanded, setExpanded] = useState(false);
  const { event, registration, type } = data;

  const eventDate = new Date(event.date);
  
  let timeStr = "";
  if (isValidDate(eventDate)) {
    timeStr = format(eventDate, "h:mm a");
    if (event.endTime) {
      const endD = new Date(event.endTime);
      if (isValidDate(endD)) {
        timeStr += ` - ${format(endD, "h:mm a")}`;
      }
    }
  }

  const isPast = eventDate.getTime() < Date.now();
  const spotPrice = event.spotPrice || 0;
  const vendorSpaces = event.vendorSpaces || 0;
  const vendorSpacesUsed = event.vendorSpacesUsed || 0;

  return (
    <div className={`bg-card border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${expanded ? 'border-primary/30' : 'border-border/40 hover:border-primary/20'} ${isPast ? 'opacity-75 grayscale-[0.2]' : ''}`}>
      <button 
        onClick={() => setExpanded(!expanded)} 
        aria-expanded={expanded}
        className="w-full text-left p-5 flex flex-col md:flex-row md:items-center gap-4 focus:outline-none focus-visible:bg-muted/50"
      >
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/10 flex flex-col items-center justify-center shrink-0 border border-primary/20">
          <span className="text-xs font-bold uppercase text-primary tracking-wider leading-none mb-1">
            {isValidDate(eventDate) ? format(eventDate, "MMM") : "-"}
          </span>
          <span className="text-xl font-display font-black text-foreground leading-none">
            {isValidDate(eventDate) ? format(eventDate, "d") : "-"}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-lg md:text-xl truncate pr-4">{event.title}</h3>
            {isPast && <Badge variant="outline" className="text-xs bg-muted whitespace-nowrap">Past Event</Badge>}
            {event.canceledAt && <Badge variant="destructive" className="text-xs whitespace-nowrap">Canceled</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" /> 
              {timeStr || 'Time TBA'}
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> 
              <span className="truncate">{event.location}</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:flex-col md:items-end gap-3 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/50 shrink-0">
          <StatusBadge type={type} registration={registration} />
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group">
            <span className="md:hidden group-hover:text-foreground transition-colors">{expanded ? 'Less Details' : 'View Details'}</span>
            <div className={`p-1.5 rounded-full bg-muted/50 transition-transform duration-300 ${expanded ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-border/50 bg-muted/5"
          >
            <div className="p-5 md:p-6 space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Event Information
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {event.description || "No description provided."}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mt-5 p-4 bg-card rounded-xl border border-border/60 shadow-sm">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Location</p>
                        <p className="font-medium text-foreground">{event.location || 'TBA'} {event.areaCode && <span className="text-muted-foreground font-normal ml-1">({event.areaCode})</span>}</p>
                      </div>
                      
                      {event.extraDates && Array.isArray(event.extraDates) && event.extraDates.length > 0 && (
                        <div className="col-span-2 sm:col-span-1">
                           <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Additional Dates</p>
                           <p className="font-medium text-foreground">{formatExtraDates(event.extraDates)}</p>
                        </div>
                      )}
                      
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Event Status</p>
                        <p className="font-medium capitalize text-foreground">
                          {event.canceledAt ? <span className="text-destructive font-semibold">Canceled</span> : (event.status || 'Scheduled')}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Created</p>
                        <p className="font-medium text-foreground">{isValidDate(new Date(event.createdAt)) ? format(new Date(event.createdAt), "MMM d, yyyy") : '-'}</p>
                      </div>

                      {vendorSpaces > 0 && (
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Vendor Spaces</p>
                          <p className="font-medium text-foreground">{vendorSpacesUsed} / {vendorSpaces} booked</p>
                        </div>
                      )}
                      
                      {spotPrice > 0 && (
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Space Price</p>
                          <p className="font-medium text-foreground">{formatCurrency(spotPrice)}</p>
                        </div>
                      )}
                      {event.boothWidth && event.boothDepth && (
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Booth Size</p>
                          <p className="font-medium text-foreground">{event.boothWidth} × {event.boothDepth} ft</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {type === 'registration' && registration && (
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Store className="w-4 h-4" /> Your Spot
                      </h4>
                      <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-0.5">Reserved Space</p>
                            <p className="font-semibold text-foreground">
                              {registration.spotName || "General Vendor Spot"}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 shrink-0">
                            {event.vendorRegistrationType === 'vendorgrid' ? 'VendorGrid' : 'External'}
                          </Badge>
                        </div>
                        
                        <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-4 text-sm">
                           <div>
                             <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Registered On</p>
                             <p className="font-medium">{isValidDate(new Date(registration.createdAt)) ? format(new Date(registration.createdAt), "MMM d, yyyy") : '-'}</p>
                           </div>
                           <div>
                             <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Amount + Fee</p>
                             <p className="font-medium">{formatCurrency((registration.amountCents || 0) + (registration.feeCents || 0))}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {type === 'registration' && (
                    <FeeBox registration={registration} event={event} />
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Documents & Forms
                    </h4>
                    <DocumentList documents={registration?.documents || event?.documents || []} />
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Quick Links
                    </h4>
                    <div className="flex flex-col gap-2">
                      <Link href={`/events/${event.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors group bg-card shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Eye className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm text-foreground">View Event Page</span>
                        <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                      
                      {event.eventWebsiteUrl && (
                        <a href={event.eventWebsiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors group bg-card shadow-sm">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm text-foreground">Event Website</span>
                        </a>
                      )}

                      {event.vendorRegistrationUrl && event.vendorRegistrationType !== 'vendorgrid' && (
                        <a 
                          href={
                            event.vendorRegistrationType === 'email' ? `mailto:${event.vendorRegistrationUrl}` :
                            event.vendorRegistrationType === 'phone' ? `tel:${event.vendorRegistrationUrl}` :
                            event.vendorRegistrationUrl
                          } 
                          target={event.vendorRegistrationType === 'email' || event.vendorRegistrationType === 'phone' ? undefined : "_blank"} 
                          rel="noreferrer" 
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors group bg-card shadow-sm"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {event.vendorRegistrationType === 'email' ? <Mail className="w-4 h-4" /> : 
                             event.vendorRegistrationType === 'phone' ? <Phone className="w-4 h-4" /> :
                             <ExternalLink className="w-4 h-4" />}
                          </div>
                          <span className="font-medium text-sm text-foreground">
                            {event.vendorRegistrationType === 'email' ? 'Register via Email' :
                             event.vendorRegistrationType === 'phone' ? 'Register via Phone' :
                             'External Registration Form'}
                          </span>
                        </a>
                      )}
                      
                      {event.contactEmail && (
                        <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors group bg-card shadow-sm">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Mail className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm text-foreground">Contact Organizer</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ type, registration }: { type: 'registration' | 'owned', registration?: any }) {
  if (type === 'owned') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
        <Store className="w-3.5 h-3.5" /> Event Owner
      </span>
    );
  }
  
  if (!registration) return null;
  
  switch(registration.status) {
    case 'pending': 
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">Pending Review</span>;
    case 'approved': 
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">Accepted</span>;
    case 'paid': 
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">Confirmed</span>;
    case 'rejected': 
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">Declined</span>;
    default: 
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{registration.status}</span>;
  }
}

function FeeBox({ registration, event }: { registration: any, event: any }) {
  const { mutate: setFeeStatus, isPending } = useSetManualFeeStatus();
  
  if (!registration) return null;
  
  const isVendorGrid = event.vendorRegistrationType === 'vendorgrid';
  
  if (isVendorGrid) {
    const isFree = registration.amountCents === 0;
    const isPaid = registration.status === 'paid' || (registration.status === 'approved' && isFree);
    
    return (
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Store className="w-4 h-4 opacity-0" /> Registration Fee
        </h4>
        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Automated Payment</p>
            <p className="text-xs text-muted-foreground mt-0.5">Processed securely via VendorGrid</p>
          </div>
          <div className="flex items-center gap-2">
             {isPaid ? (
               <span className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/50">
                 <CheckCircle2 className="w-4 h-4" />
                 {isFree ? 'Free Event' : 'Paid in Full'}
               </span>
             ) : (
               <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                 <Circle className="w-4 h-4" />
                 Unpaid / Pending
               </span>
             )}
          </div>
        </div>
      </div>
    );
  }
  
  const isChecked = registration.manualFeePaid;
  
  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Store className="w-4 h-4 opacity-0" /> Registration Fee
      </h4>
      <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-sm">Payment Status</p>
          <p className="text-xs text-muted-foreground mt-0.5">Track external payment manually</p>
        </div>
        <button 
          onClick={() => setFeeStatus({ registrationId: registration.id, paid: !isChecked })}
          disabled={isPending}
          aria-pressed={isChecked}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-all shadow-sm ${isChecked ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {isPending ? (
             <Loader2 className="w-4 h-4 animate-spin" />
          ) : isChecked ? (
             <CheckCircle2 className="w-4 h-4" />
          ) : (
             <Circle className="w-4 h-4" />
          )}
          {isChecked ? 'Marked as Paid' : 'Mark as Paid'}
        </button>
      </div>
    </div>
  )
}

function DocumentList({ documents }: { documents: any[] }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-card border border-border/60 border-dashed rounded-xl text-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">No documents attached</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Important files from the organizer will appear here.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {documents.map((doc, idx) => (
        <a 
          key={idx} 
          href={doc.downloadUrl || doc.fileUrl}
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors group bg-card shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{doc.title || doc.fileName}</p>
            <p className="text-xs text-muted-foreground truncate uppercase">{doc.fileType || 'Document'}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
