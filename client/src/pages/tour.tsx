import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Store, Package, Users, Crown, ArrowRight, ArrowLeft,
  CalendarCheck, MapPin, CreditCard, BarChart3, ClipboardList,
  Search, Ticket, Star, Heart, ShoppingBag, Bell, MessageSquare,
  Check
} from "lucide-react";

const SLIDES = [
  {
    id: "welcome",
    tag: "Welcome to VendorGrid",
    title: "The Artisan Market Platform",
    subtitle: "Connecting event organizers, artisan vendors, and community members — all in one place.",
    bg: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    accent: "text-primary",
    illustration: (
      <div className="flex items-center justify-center gap-6 py-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white shadow-lg">
            <Store className="w-8 h-8" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">Event Owner</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-12 h-0.5 bg-primary/30 rounded" />
          <div className="w-12 h-0.5 bg-blue-400/30 rounded" />
          <div className="w-12 h-0.5 bg-purple-400/30 rounded" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white shadow-xl border-4 border-white dark:border-gray-900">
            <Store className="w-10 h-10" />
          </div>
          <span className="text-sm font-bold text-foreground">VendorGrid</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-12 h-0.5 bg-primary/30 rounded" />
          <div className="w-12 h-0.5 bg-blue-400/30 rounded" />
          <div className="w-12 h-0.5 bg-purple-400/30 rounded" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <Package className="w-8 h-8" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">Vendor</span>
        </div>
      </div>
    ),
  },
  {
    id: "event_owner",
    tag: "Event Owner",
    title: "Run Your Markets with Confidence",
    subtitle: "Everything you need to organize, promote, and manage artisan markets and pop-up events.",
    bg: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20",
    accent: "text-primary",
    iconBg: "from-primary to-amber-500",
    icon: Store,
    features: [
      { icon: CalendarCheck, text: "Create and publish events with custom dates, descriptions, and vendor space counts" },
      { icon: ClipboardList, text: "Review and approve vendor applications for each event" },
      { icon: CreditCard, text: "Accept vendor registration payments via Square or Stripe Connect" },
      { icon: BarChart3, text: "Track attendance, registrations, and available spots in real time" },
      { icon: Bell, text: "Send notifications to registered vendors about event updates" },
      { icon: MapPin, text: "Reach vendors and community members in your local area" },
    ],
    proBadge: "Event Owner Pro — $24.95/mo",
    proColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    id: "vendor",
    tag: "Vendor",
    title: "Grow Your Artisan Business",
    subtitle: "Discover events, secure vendor spaces, and get your products in front of eager customers.",
    bg: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20",
    accent: "text-blue-600 dark:text-blue-400",
    iconBg: "from-blue-500 to-cyan-500",
    icon: Package,
    features: [
      { icon: Search, text: "Browse and filter events by location, date, and vendor space availability" },
      { icon: Ticket, text: "Register for vendor spaces and pay securely online" },
      { icon: ShoppingBag, text: "Create a vendor profile and showcase your products or crafts" },
      { icon: Star, text: "Build your reputation with reviews and event history" },
      { icon: MessageSquare, text: "Message event owners directly to ask questions" },
      { icon: Bell, text: "Get notified about new events in your area automatically" },
    ],
    proBadge: "Vendor Pro — $14.95/mo",
    proColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    id: "community",
    tag: "Community Member",
    title: "Discover Your Local Market Scene",
    subtitle: "Find artisan markets near you, meet vendors, and support your local creative economy.",
    bg: "from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20",
    accent: "text-purple-600 dark:text-purple-400",
    iconBg: "from-purple-500 to-pink-500",
    icon: Users,
    features: [
      { icon: MapPin, text: "Discover artisan markets and pop-up events in your local area" },
      { icon: Heart, text: "Mark events as 'Interested' or 'Attending' to save your calendar" },
      { icon: Search, text: "Browse vendor profiles and preview their products before you go" },
      { icon: Bell, text: "Get notified when new events are posted near you" },
      { icon: Star, text: "Leave reviews and feedback to help vendors and organizers improve" },
      { icon: Users, text: "Join a growing community of artisan market enthusiasts — always free" },
    ],
    freeBadge: "Always Free",
    freeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  {
    id: "pricing",
    tag: "Choose Your Plan",
    title: "Start Free, Upgrade Anytime",
    subtitle: "Community membership is always free. Upgrade to unlock powerful tools for owners and vendors.",
    bg: "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/20",
    accent: "text-foreground",
  },
];

export default function TourPage() {
  const [, setLocation] = useLocation();
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;
  const isFirst = slide === 0;

  const goNext = () => {
    if (isLast) {
      setLocation("/setup");
    } else {
      setSlide(s => s + 1);
    }
  };

  const goPrev = () => setSlide(s => s - 1);

  const skip = () => setLocation("/setup");

  return (
    <div className={`min-h-screen bg-gradient-to-br ${current.bg} flex items-center justify-center p-4 transition-all duration-500`}>
      <div className="w-full max-w-2xl">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              data-testid={`dot-${i}`}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slide
                  ? "w-8 h-2.5 bg-primary"
                  : "w-2.5 h-2.5 bg-primary/20 hover:bg-primary/40"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-border/40 overflow-hidden">

          {/* Slide: Welcome */}
          {current.id === "welcome" && (
            <div className="p-8 md:p-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
                <Store className="w-4 h-4" /> {current.tag}
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">{current.title}</h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">{current.subtitle}</p>
              {current.illustration}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/40">
                {[
                  { icon: Store, label: "Event Owners", color: "text-primary", bg: "bg-primary/10" },
                  { icon: Package, label: "Artisan Vendors", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
                  { icon: Users, label: "Community", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slide: Event Owner or Vendor or Community */}
          {(current.id === "event_owner" || current.id === "vendor" || current.id === "community") && (
            <div className="p-8 md:p-12">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.iconBg} flex items-center justify-center text-white shadow-md shrink-0`}>
                  {current.icon && <current.icon className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${current.proBadge ? current.proColor : current.freeColor}`}>
                      {current.id === "community" ? (
                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {current.freeBadge}</span>
                      ) : (
                        <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> {current.proBadge}</span>
                      )}
                    </span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground">{current.title}</h2>
                </div>
              </div>
              <p className="text-muted-foreground mb-8">{current.subtitle}</p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {current.features?.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${current.iconBg} flex items-center justify-center text-white shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-foreground leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slide: Pricing */}
          {current.id === "pricing" && (
            <div className="p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 border border-primary/20">
                  <Crown className="w-4 h-4" /> {current.tag}
                </div>
                <h2 className="text-3xl font-display font-bold text-foreground mb-3">{current.title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{current.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {/* Event Owner Pro */}
                <div className="relative rounded-2xl border-2 border-primary bg-primary/5 p-5 flex flex-col">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">Most Popular</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white mb-3 mt-2">
                    <Store className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">Event Owner Pro</h3>
                  <div className="text-2xl font-display font-bold text-primary mb-1">$24.95<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground my-3 flex-1">
                    {["Create unlimited events", "Accept vendor payments", "Vendor management tools", "Analytics dashboard"].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button
                    data-testid="button-subscribe-owner"
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-amber-500 text-sm mt-2"
                    onClick={() => setLocation("/upgrade?plan=event_owner_pro&next=/setup")}
                  >
                    Subscribe
                  </Button>
                </div>

                {/* Vendor Pro */}
                <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20 p-5 flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white mb-3">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">Vendor Pro</h3>
                  <div className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400 mb-1">$14.95<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground my-3 flex-1">
                    {["Register for vendor spaces", "Vendor profile & portfolio", "Event discovery tools", "Direct owner messaging"].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button
                    data-testid="button-subscribe-vendor"
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-sm mt-2"
                    onClick={() => setLocation("/upgrade?plan=vendor_pro&next=/setup")}
                  >
                    Subscribe
                  </Button>
                </div>

                {/* Community Free */}
                <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 p-5 flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">Community</h3>
                  <div className="text-2xl font-display font-bold text-purple-600 dark:text-purple-400 mb-1">Free<span className="text-sm font-normal text-muted-foreground"> forever</span></div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground my-3 flex-1">
                    {["Browse all events", "Discover local vendors", "Mark attendance", "Community feed"].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-purple-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button
                    data-testid="button-continue-free"
                    variant="outline"
                    className="w-full h-10 rounded-xl border-purple-300 dark:border-purple-700 text-sm mt-2"
                    onClick={() => setLocation("/setup")}
                  >
                    Continue Free
                  </Button>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">Cancel anytime · No contracts · Secure payments via Stripe</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between px-8 md:px-12 pb-8">
            <Button
              data-testid="button-prev"
              variant="ghost"
              className="rounded-xl"
              onClick={goPrev}
              disabled={isFirst}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <button
              data-testid="button-skip"
              onClick={skip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              {isLast ? "" : "Skip tour"}
            </button>

            {!isLast && (
              <Button
                data-testid="button-next"
                className="rounded-xl bg-gradient-to-r from-primary to-amber-500"
                onClick={goNext}
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {isLast && (
              <Button
                data-testid="button-get-started"
                className="rounded-xl bg-gradient-to-r from-primary to-amber-500"
                onClick={() => setLocation("/setup")}
              >
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {slide + 1} of {SLIDES.length}
        </p>
      </div>
    </div>
  );
}
