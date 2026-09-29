import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, ChevronRight, CreditCard, MapPinned, Package, Send, Sparkles, Store } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { usePortalSession } from "@/hooks/use-stripe";
import { PRO_TIERS } from "@/lib/shared-routes";

type Feature = {
  name: string;
  detail?: string;
  free: string | null;
  pro: string;
};

const featureGroups: { title: string; features: Feature[] }[] = [
  {
    title: "Find your people",
    features: [
      { name: "Browse and find events", free: "Included", pro: "Included" },
      { name: "In-app new-event alerts", detail: "For your base profile area", free: "Included", pro: "Included" },
      { name: "Extra notification areas", free: null, pro: "Up to 10 saved area codes" },
      { name: "Website URL on your profile", free: null, pro: "Included" },
      { name: "Send broadcast notifications", free: null, pro: "Included" },
      { name: "Private My File Folder", free: null, pro: "Included" },
    ],
  },
  {
    title: "For vendors",
    features: [
      { name: "Vendor business profile", free: null, pro: "Included" },
      { name: "Register for vendor spaces in VendorGrid", detail: "External organizer registration options may still be available", free: null, pro: "Included" },
      { name: "Create a vendor listing / card", detail: "Showcase your work with up to 10 photos", free: null, pro: "Included" },
      { name: "Inventory and catalog tools", detail: "Variants, allocations, sales, COGS, and reporting", free: null, pro: "Included" },
      { name: "Profile and inventory analytics", free: null, pro: "Included" },
    ],
  },
  {
    title: "For organizers",
    features: [
      { name: "Host and manage multi-day events", free: null, pro: "Included" },
      { name: "Create and manage event maps", detail: "Public maps can still be viewed on Free", free: null, pro: "Event owners" },
      { name: "Upload and manage event documents", free: null, pro: "Event owners" },
      { name: "Manage your event's vendors", free: null, pro: "Event owners" },
      { name: "Event analytics", free: null, pro: "Event owners" },
      { name: "Connect a payment processor", free: null, pro: "Event owners" },
    ],
  },
  {
    title: "Platform fees",
    features: [
      { name: "In-app registration fee", detail: "Where VendorGrid handles a vendor-space registration", free: null, pro: "0%" },
    ],
  },
];

const linkStyle = "font-semibold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
// Annual checkout is $99 in the existing /upgrade plans and API checkout configuration.
const ANNUAL_PRICE = "$99";

function Availability({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground"><span aria-hidden="true">—</span><span className="sr-only">Not included</span></span>;
  return <span className="inline-flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{value}</span></span>;
}

export default function ProPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: profileData, isLoading: isProfileLoading, isError: isProfileError, refetch } = useProfile();
  const portal = usePortalSession();
  const profile = profileData?.profile;
  const hasActivePro = profile?.subscriptionStatus === "active" && profile?.subscriptionTier !== "free";
  const checkingAccount = isAuthLoading || (isAuthenticated && isProfileLoading);
  const accountError = isAuthenticated && isProfileError;

  useEffect(() => {
    const title = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const previous = [description?.content, ogTitle?.content, ogDescription?.content];
    const pageTitle = "VendorGrid Pro Pricing & Benefits | VendorGrid";
    const pageDescription = "Explore VendorGrid Pro for vendors and market organizers. Compare Free and Pro tools, see monthly and annual pricing, and choose the right plan.";
    document.title = pageTitle;
    if (description) description.content = pageDescription;
    if (ogTitle) ogTitle.content = pageTitle;
    if (ogDescription) ogDescription.content = pageDescription;
    return () => {
      document.title = title;
      if (description && previous[0] !== undefined) description.content = previous[0];
      if (ogTitle && previous[1] !== undefined) ogTitle.content = previous[1];
      if (ogDescription && previous[2] !== undefined) ogDescription.content = previous[2];
    };
  }, []);

  const action = (placement: string, inverse = false) => {
    const classes = inverse
      ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#fff3e7] px-6 py-3 text-sm font-bold text-[#412b22] transition-colors hover:bg-[#ffe3c9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb477] focus-visible:ring-offset-2 focus-visible:ring-offset-[#412b22]"
      : "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

    if (checkingAccount) {
      return <div className="h-12 w-48 animate-pulse rounded-xl bg-[#d9b9a1]/40" role="status" aria-label="Checking subscription" data-testid={`status-pro-loading-${placement}`} />;
    }
    if (accountError) {
      return <button type="button" onClick={() => void refetch()} className={classes} data-testid={`button-retry-pro-${placement}`}>Couldn’t check your plan. Retry <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>;
    }
    if (isAuthenticated && hasActivePro) {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 text-sm font-bold ${inverse ? "text-[#fff3e7]" : "text-foreground"}`} data-testid={`status-active-pro-${placement}`}>
            <Check className="h-4 w-4" aria-hidden="true" /> You’re on Pro
          </span>
          <button type="button" onClick={() => portal.mutate()} disabled={portal.isPending} className={`${classes} disabled:cursor-wait disabled:opacity-60`} data-testid={`button-manage-pro-${placement}`}>
            <CreditCard className="h-4 w-4" aria-hidden="true" /> {portal.isPending ? "Opening billing…" : "Manage subscription"}
          </button>
        </div>
      );
    }
    return (
      <Link href={isAuthenticated ? "/upgrade" : "/auth?mode=signup&next=%2Fupgrade"} className={classes} data-testid={`link-upgrade-pro-${placement}`}>
        {isAuthenticated ? "Choose a Pro plan" : "Sign in to choose a plan"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-6xl pb-14 text-foreground">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#412b22] text-[#fff3e7]" aria-labelledby="pro-title">
        <div className="pointer-events-none absolute -right-24 -top-36 h-[28rem] w-[28rem] rounded-full border border-[#b87343]/35" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-9 -top-20 h-[20rem] w-[20rem] rounded-full border border-[#b87343]/25" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-[58%] h-48 border-l border-[#b87343]/20" aria-hidden="true" />
        <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16 lg:px-16 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#ffb477]"><Sparkles className="h-4 w-4" aria-hidden="true" /> VendorGrid Pro</span>
            <h1 id="pro-title" className="mt-6 max-w-2xl font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
              More room for what you’re building.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f1d9c8] sm:text-lg">
              For vendors growing their market presence and organizers bringing better events to life.
            </p>
            <div className="mt-8">{action("hero", true)}</div>
            <p className="mt-4 text-xs leading-relaxed text-[#d9b9a1]">Plan selection, subscription terms, and checkout happen on the upgrade page.</p>
          </div>
          <div className="rounded-2xl border border-[#d9b9a1]/25 bg-[#583c2f]/90 p-6 shadow-xl shadow-[#24160f]/15 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffb477]">One Pro membership</span>
            <div className="mt-5 flex items-baseline gap-2">
              <strong className="font-display text-4xl font-bold tracking-tight sm:text-5xl" data-testid="text-pro-monthly-price">{PRO_TIERS.vendor_pro.displayPrice}</strong>
              <span className="text-sm text-[#e6c9b6]">/ month</span>
            </div>
            <p className="mt-1 text-sm text-[#f1d9c8]">Billed monthly, recurring</p>
            <div className="my-6 h-px bg-[#d9b9a1]/25" />
            <div className="flex items-baseline gap-2">
              <strong className="font-display text-2xl font-bold" data-testid="text-pro-annual-price">{ANNUAL_PRICE}</strong>
              <span className="text-sm text-[#e6c9b6]">/ year</span>
            </div>
            <p className="mt-1 text-sm text-[#f1d9c8]">Billed annually, recurring</p>
            <p className="mt-6 border-t border-[#d9b9a1]/25 pt-5 text-sm leading-relaxed text-[#e6c9b6]">
              Both plans include a 14-day free trial. Choose your billing schedule before subscribing.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 border-b border-border px-1 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16" aria-labelledby="pro-possibilities">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Made for both sides of the market</span>
          <h2 id="pro-possibilities" className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">Your work deserves good tools.</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="border-l-2 border-primary pl-5">
            <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-bold">For vendors</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Make a vendor card, keep tabs on inventory, and register for participating event spaces inside VendorGrid.</p>
          </div>
          <div className="border-l-2 border-primary/60 pl-5">
            <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-bold">For organizers</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Plan multi-day markets, manage vendors and maps, and see how your events are doing.</p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="pro-comparison">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The details</span>
            <h2 id="pro-comparison" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Free is a good start. Pro goes further.</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">You can always explore public events, maps, and vendor cards without Pro.</p>
        </div>
        <div className="space-y-8 md:hidden">
          {featureGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{group.title}</h3>
              <div className="space-y-3">
                {group.features.map((feature) => (
                  <article key={feature.name} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <h4 className="font-semibold">{feature.name}</h4>
                    {feature.detail && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.detail}</p>}
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                      <div>
                        <dt className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Free</dt>
                        <dd><Availability value={feature.free} /></dd>
                      </div>
                      <div>
                        <dt className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Pro</dt>
                        <dd className="font-medium"><Availability value={feature.pro} /></dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block" role="region" aria-label="Free and Pro feature comparison" tabIndex={0}>
          <table className="w-full min-w-[610px] border-collapse text-left text-sm">
            <caption className="sr-only">VendorGrid Free and Pro features by audience</caption>
            <thead className="bg-secondary/60">
              <tr>
                <th scope="col" className="w-[52%] px-5 py-5 font-display text-base font-bold sm:px-7">What’s included</th>
                <th scope="col" className="w-[20%] px-4 py-5 font-display text-base font-bold">Free</th>
                <th scope="col" className="w-[28%] border-l border-primary/15 bg-primary/10 px-4 py-5 font-display text-base font-bold text-primary sm:px-6">Pro <span className="block text-xs font-medium text-muted-foreground">Monthly or annual</span></th>
              </tr>
            </thead>
            {featureGroups.map((group) => (
              <tbody key={group.title}>
                <tr className="border-t border-border bg-secondary/25">
                  <th scope="rowgroup" colSpan={3} className="px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary sm:px-7">{group.title}</th>
                </tr>
                {group.features.map((feature) => (
                  <tr key={feature.name} className="border-t border-border/70">
                    <th scope="row" className="px-5 py-4 align-top font-semibold sm:px-7">
                      {feature.name}
                      {feature.detail && <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{feature.detail}</span>}
                    </th>
                    <td className="px-4 py-4 align-top text-muted-foreground"><Availability value={feature.free} /></td>
                    <td className="border-l border-primary/15 bg-primary/[0.035] px-4 py-4 align-top font-medium sm:px-6"><Availability value={feature.pro} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Organizer tools apply when you own an event. Vendor-space registration depends on the event’s setup; external organizer registration may remain available without Pro. Existing non-Pro in-app registrations may carry a 0.5% platform fee.</p>
      </section>

      <section className="grid gap-8 rounded-[1.75rem] bg-secondary/50 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14" aria-labelledby="pro-faq">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Good to know</span>
          <h2 id="pro-faq" className="mt-3 font-display text-3xl font-bold sm:text-4xl">A few things before you decide.</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">No pressure. The right tools are the ones you’ll actually use.</p>
        </div>
        <Accordion type="single" collapsible className="overflow-hidden rounded-2xl border border-border bg-card px-5 sm:px-7">
          <AccordionItem value="upgrade">
            <AccordionTrigger data-testid="button-pro-faq-upgrade" className="min-h-16 text-left font-semibold hover:no-underline hover:text-primary">How do I upgrade?</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">Choose a monthly or annual plan on the <Link href="/upgrade" className={linkStyle} data-testid="link-pro-faq-upgrade">upgrade page</Link>. You’ll review the terms and complete checkout there. You’ll need to sign in first.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="trial">
            <AccordionTrigger data-testid="button-pro-faq-trial" className="min-h-16 text-left font-semibold hover:no-underline hover:text-primary">Is there a free trial?</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">Yes. Both the monthly and annual Pro plans include a 14-day free trial. Your selected plan renews at its listed rate after the trial unless you cancel.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="cancel">
            <AccordionTrigger data-testid="button-pro-faq-cancel" className="min-h-16 text-left font-semibold hover:no-underline hover:text-primary">Can I cancel?</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">Yes. Go to <Link href="/profile?tab=billing" className={linkStyle} data-testid="link-pro-faq-billing">Profile → Billing</Link> and select “Manage Billing &amp; Payment” to open the subscription portal. Your Pro access continues through the current billing period; there are no partial-period refunds.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="free">
            <AccordionTrigger data-testid="button-pro-faq-free" className="min-h-16 text-left font-semibold hover:no-underline hover:text-primary">What can I do for free?</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">Browse events and public event maps and vendor cards, and receive in-app new-event alerts for your base profile area. You can also follow an organizer’s external registration instructions where offered.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="who">
            <AccordionTrigger data-testid="button-pro-faq-who" className="min-h-16 text-left font-semibold hover:no-underline hover:text-primary">Who is Pro for?</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">Vendors who want a listing, in-app registration and inventory tools, and organizers who need event planning, vendor management and analytics. One Pro plan includes both sets of tools; event-owner features apply to events you own.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <aside className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card px-6 py-8 sm:flex-row sm:items-center sm:px-9">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Package className="h-4 w-4" aria-hidden="true" /> Ready when you are</span>
          <h2 className="mt-2 font-display text-2xl font-bold">Make more of your next market.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Find your fit, then choose the plan that works for you.</p>
        </div>
        {action("footer")}
      </aside>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><Send className="h-3.5 w-3.5" aria-hidden="true" /> Built for the people behind local markets.</span>
        <Link href="/faq" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-pro-more-help">More help <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}