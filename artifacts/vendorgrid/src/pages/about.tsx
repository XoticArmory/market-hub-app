import { Link } from "wouter";
import { ArrowRight, CalendarDays, MapPin, Store, Users } from "lucide-react";

const audiences = [
  {
    label: "For vendors",
    title: "Find your next good market.",
    description: "Explore local events, see available vendor spaces, and find the right places to bring what you make.",
    icon: Store,
  },
  {
    label: "For organizers",
    title: "Make room for your community.",
    description: "List your event, share the details, and give vendors a clear way to discover your market and its spaces.",
    icon: CalendarDays,
  },
  {
    label: "For shoppers",
    title: "Know what’s happening nearby.",
    description: "Browse markets and events around you, discover new makers, and make a plan to stop by.",
    icon: MapPin,
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl pb-10 text-foreground">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#412b22] px-6 py-12 text-[#fff3e7] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-[#b87343]/40" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-2 -top-14 h-56 w-56 rounded-full border border-[#b87343]/30" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffb477]">A little about us</span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Good markets bring people together.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f1d9c8] sm:text-lg">
            VendorGrid is a place to discover local markets and connect the people who make them happen: vendors, organizers, and shoppers.
          </p>
          <Link
            href="/"
            data-testid="link-about-browse"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb477] focus-visible:ring-offset-2 focus-visible:ring-offset-[#412b22]"
          >
            Browse events <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section className="px-1 py-12 sm:py-16" aria-labelledby="about-for-everyone">
        <div className="mb-8 max-w-xl">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Made for the whole market</span>
          <h2 id="about-for-everyone" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">There’s a place for you here.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {audiences.map(({ label, title, description, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-primary">{label}</p>
              <h3 className="mt-2 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 rounded-[1.75rem] border border-border bg-secondary/50 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16" aria-labelledby="about-how-it-works">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Users className="h-4 w-4" aria-hidden="true" /> What you can do</span>
          <h2 id="about-how-it-works" className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">From finding a market to filling it.</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">The tools are here to help real communities show up for each other.</p>
        </div>
        <div className="divide-y divide-border">
          <div className="py-4 first:pt-0">
            <h3 className="font-semibold">Discover local events</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Look for markets by area, explore event details, and see what’s coming up.</p>
          </div>
          <div className="py-4">
            <h3 className="font-semibold">Host and share events</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Organizers can post market details and connect with interested vendors.</p>
          </div>
          <div className="py-4">
            <h3 className="font-semibold">Explore vendor spaces</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Vendors can check event listings for space details and the organizer’s registration options.</p>
          </div>
          <div className="py-4 last:pb-0">
            <h3 className="font-semibold">Go further with Pro</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Optional Pro tools include vendor cards, event insights, inventory tracking, and more. <Link href="/pro" data-testid="link-about-pro" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">Explore Pro</Link></p>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-start justify-between gap-5 px-1 pt-12 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold">Ready to be part of it?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Find an event or tell your neighborhood about yours.</p>
        </div>
        <Link href="/events/new" data-testid="link-about-host" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Host an event <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}