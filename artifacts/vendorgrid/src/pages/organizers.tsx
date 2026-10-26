import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, CalendarPlus, Camera, ClipboardList, CreditCard, Package, Smartphone, Check, Store, MapPinned } from "lucide-react";
import { useOrganizerActions } from "@/hooks/use-organizer-actions";

const benefits = [
  { icon: CalendarPlus, title: "Event listings", body: "Post your market with dates, location and details so makers and neighbors can find it from their phones." },
  { icon: ClipboardList, title: "Vendor applications", body: "Collect applications in one place, review who wants a booth, and keep your vendor list tidy." },
  { icon: CreditCard, title: "Stripe and Square registration payments", body: "Connect your own Stripe or Square account so registration fees go to you." },
  { icon: Smartphone, title: "Made for the phone in your pocket", body: "Every step works on mobile, whether you are at your desk or loading in at the lot." },
  { icon: Package, title: "Inventory management", body: "Track what you make and what you sell, so your booth stock and your listings stay in step." },
  { icon: Camera, title: "Photo listings of your wares", body: "Show shoppers what you sell — a potter's mugs, a quilter's table runners — with photo listings that travel with you to every market." },
];

const steps = [
  ["Post your event", "Add the basics. It takes a few minutes."],
  ["Open applications", "Makers apply and pay their registration."],
  ["Run a great market", "Manage your vendors and see how things are going."],
];

export default function OrganizersPage() {
  const [shown, setShown] = useState(false);
  const [annual, setAnnual] = useState(false);
  const { startTrialHref, postEventHref, actionsReady, hostAccess, retryAccess } = useOrganizerActions(annual ? "annual" : "monthly");
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (hostAccess.status === "ready" && hostAccess.canHost) {
      setLocation("/events/new", { replace: true });
    }
  }, [hostAccess.status, hostAccess.canHost, setLocation]);

  useEffect(() => {
    if (hostAccess.status !== "ready" || hostAccess.canHost) return;
    const t = document.title;
    document.title = "For Organizers | VendorGrid";
    const id = requestAnimationFrame(() => setShown(true));
    return () => { document.title = t; cancelAnimationFrame(id); };
  }, [hostAccess.status, hostAccess.canHost]);

  if (hostAccess.status === "error") {
    return <div className="mx-auto max-w-md py-16 text-center" role="alert">
      <h1 className="font-display text-2xl font-bold">Couldn't check your account</h1>
      <p className="mt-3 text-muted-foreground">Please try again so we can take you to the right place.</p>
      <button type="button" onClick={retryAccess} className="mt-5 min-h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground">Try again</button>
    </div>;
  }
  if (hostAccess.status === "loading" || hostAccess.canHost) {
    return <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground" role="status" aria-live="polite" data-testid="organizer-access-loading">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden="true" />
      {hostAccess.canHost ? "Opening event form…" : "Checking your account…"}
    </div>;
  }

  const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-50";
  const primary = `${base} bg-primary text-primary-foreground hover:bg-primary/90`;
  const secondary = `${base} border border-border bg-card text-foreground hover:bg-secondary`;

  const cta = (id: string, label: string, href: string, cls: string, arrow = false) =>
    actionsReady ? (
      <Link href={href} className={cls} data-testid={`link-${id}`}>{label}{arrow && <ArrowRight className="h-4 w-4" aria-hidden="true" />}</Link>
    ) : (
      <button type="button" disabled className={`${cls} cursor-not-allowed opacity-50`} data-testid={`button-${id}`}>{label}</button>
    );

  const reveal = `transition-all duration-700 motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"}`;

  return (
    <div className="mx-auto max-w-6xl pb-14 text-foreground">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#412b22] text-[#fff3e7]" aria-labelledby="org-title">
        <div className="pointer-events-none absolute -right-24 -top-36 h-[28rem] w-[28rem] rounded-full border border-[#b87343]/35" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-9 -top-20 h-[20rem] w-[20rem] rounded-full border border-[#b87343]/25" aria-hidden="true" />
        <div className={`relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16 lg:px-16 lg:py-20 ${reveal}`}>
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#ffb477]"><MapPinned className="h-4 w-4" aria-hidden="true" /> For vendors and organizers — one membership</span>
            <h1 id="org-title" className="mt-6 max-w-2xl font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">Host your market. Skip the spreadsheet.</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f1d9c8] sm:text-lg">VendorGrid helps neighborhood market organizers list events, take vendor applications, and collect registration payments, with no commission to us on registrations. And if you sell at markets, the same membership manages your inventory, shows off your wares with photos, and alerts you when a new event opens near you.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {cta("post-event-hero", "Post an event", postEventHref, `${base} bg-[#fff3e7] text-[#412b22] hover:bg-[#ffe3c9]`, true)}
              {cta("start-trial-hero", "Start free trial", startTrialHref, `${base} border border-[#d9b9a1]/50 text-[#fff3e7] hover:bg-[#583c2f]`)}
            </div>
            <p className="mt-4 text-xs text-[#d9b9a1]">Browse this page freely. No sign-in needed to read on.</p>
          </div>
          <div className="rounded-2xl border border-[#d9b9a1]/25 bg-[#583c2f]/90 p-6 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffb477]">0% platform commission</span>
            <p className="mt-4 font-display text-3xl font-bold leading-tight">You keep your registration fees.</p>
            <p className="mt-3 text-sm leading-relaxed text-[#e6c9b6]">VendorGrid takes 0% of what you collect on registrations. Standard Stripe or Square processing fees still apply, and vendor-side fees depend on their plan and registration code.</p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="org-benefits">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">What you get</span>
        <h2 id="org-benefits" className="mt-2 max-w-xl font-display text-3xl font-bold sm:text-4xl">Everything a neighborhood market actually needs.</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <article key={b.title} className={`group rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${i % 2 ? "sm:mt-6" : ""}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><b.icon className="h-5 w-5" aria-hidden="true" /></span>
              <h3 className="mt-4 font-display text-xl font-bold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-secondary/50 px-6 py-10 sm:px-10 sm:py-12" aria-labelledby="org-how">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">How it works</span>
        <h2 id="org-how" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Three steps to a full roster.</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="border-l-2 border-primary pl-5">
              <span className="font-display text-3xl font-bold text-primary">{i + 1}</span>
              <h3 className="mt-1 font-display text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="org-pricing">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">VendorGrid Pro</span>
            <h2 id="org-pricing" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Simple pricing, try it first.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Every plan starts with a 14-day free trial. Pick monthly or annual.</p>
            <div className="mt-6 inline-flex rounded-xl border border-border bg-muted/50 p-1" role="group" aria-label="Billing period">
              {[false, true].map((a) => (
                <button key={String(a)} type="button" aria-pressed={annual === a} onClick={() => setAnnual(a)} data-testid={`button-billing-${a ? "annual" : "monthly"}`}
                  className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${annual === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {a ? "Annual" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-baseline gap-2" aria-live="polite">
              <strong className="font-display text-5xl font-bold" data-testid="text-organizer-price">{annual ? "$99" : "$14.95"}</strong>
              <span className="text-sm text-muted-foreground">{annual ? "/ year" : "/ month"}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {["14-day free trial", "0% platform commission on registrations", "Event listings and vendor applications", "Stripe and Square registration payments", "Inventory management and photo listings of your wares", "Notifications of new events in your area"].map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{f}</li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {cta("start-trial-pricing", "Start free trial", startTrialHref, primary, true)}
              {cta("post-event-pricing", "Post an event", postEventHref, secondary)}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Standard Stripe or Square processing fees still apply. Vendor-side fees depend on plan and registration code.</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">After the 14-day trial, Pro renews at $14.95/month or $99/year unless canceled. Review the terms before checkout.</p>
          </div>
        </div>
      </section>

      <aside className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-border bg-card px-6 py-8 sm:flex-row sm:items-center sm:px-9">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Store className="h-4 w-4" aria-hidden="true" /> Compare plans</span>
          <h2 className="mt-2 font-display text-2xl font-bold">Want the full feature list?</h2>
        </div>
        <Link href="/pro" className={secondary} data-testid="link-organizers-pro">See VendorGrid Pro <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </aside>
    </div>
  );
}
