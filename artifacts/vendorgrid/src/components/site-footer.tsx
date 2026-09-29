import { Link } from "wouter";
import { ArrowUpRight, Mail } from "lucide-react";

type SiteFooterProps = {
  onContact: () => void;
};

const footerLink =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md py-2 text-sm text-[#f5e9dc] transition-colors hover:text-[#ffb477] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb477] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30251f]";

export default function SiteFooter({ onContact }: SiteFooterProps) {
  return (
    <footer className="relative isolate overflow-hidden bg-[#30251f] text-[#f9f0e5]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 h-80 w-80 rounded-full border border-[#9c6a46]/30" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-28 h-56 w-56 rounded-full border border-[#9c6a46]/20" />

      <div className="relative mx-auto max-w-7xl px-6 pb-9 pt-12 sm:px-8 md:pb-12 md:pt-16 lg:px-12">
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))] lg:gap-10">
          <div className="max-w-xs">
            <Link
              href="/"
              data-testid="link-footer-brand"
              className="inline-flex min-h-11 items-center rounded-md font-display text-2xl font-bold tracking-tight text-[#fff2e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb477]"
            >
              Vendor<span className="text-[#ff9c52]">Grid</span>
            </Link>
            <p className="mt-3 max-w-[15rem] text-[15px] leading-relaxed text-[#e1caba]" data-testid="text-footer-tagline">
              Discover &amp; Connect with Local Markets
            </p>
            <div className="mt-6 h-1 w-12 rounded-full bg-[#f28b42]" aria-hidden="true" />
          </div>

          <nav aria-label="Discover">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.17em] text-[#ffb477]">Discover</h2>
            <ul>
              <li><Link href="/" className={footerLink} data-testid="link-footer-browse-events">Browse Events <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" /></Link></li>
              <li><Link href="/events/new" className={footerLink} data-testid="link-footer-host-event">Host an Event <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" /></Link></li>
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.17em] text-[#ffb477]">Company</h2>
            <ul>
              <li><Link href="/about" className={footerLink} data-testid="link-footer-about">About</Link></li>
              <li><Link href="/faq" className={footerLink} data-testid="link-footer-faq">FAQ / Help</Link></li>
              <li>
                <button
                  type="button"
                  onClick={onContact}
                  className={`${footerLink} cursor-pointer text-left`}
                  data-testid="button-footer-contact"
                >
                  Contact Us <Mail className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.17em] text-[#ffb477]">Legal</h2>
            <ul>
              <li><Link href="/privacy" className={footerLink} data-testid="link-footer-privacy">Privacy Policy</Link></li>
              <li><Link href="/terms" className={footerLink} data-testid="link-footer-terms">Terms of Service</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[#806755]/50 pt-6 text-sm text-[#d9bba6] sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <p data-testid="text-footer-copyright">© 2026 VendorGrid</p>
          <p>Find your people. Find your market.</p>
        </div>
      </div>
    </footer>
  );
}