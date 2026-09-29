import { Link } from "wouter";
import { ArrowRight, CircleHelp, Mail } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const answerLink = "font-semibold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const questions = [
  {
    id: "nearby",
    question: "How do I find events near me?",
    answer: <>Open <Link href="/" className={answerLink} data-testid="link-faq-browse-nearby">Browse Events</Link> and use the area or ZIP code filters to explore local markets. You can also search within a distance of a ZIP code.</>,
  },
  {
    id: "details",
    question: "Where can I see an event’s details?",
    answer: <>Select an event from <Link href="/" className={answerLink} data-testid="link-faq-browse-details">Browse Events</Link> to view its date, location, description, and any vendor space or contact details the organizer has provided.</>,
  },
  {
    id: "host",
    question: "How do I host or list an event?",
    answer: <>Go to <Link href="/events/new" className={answerLink} data-testid="link-faq-host">Host an Event</Link> and add your market’s details. If you aren’t signed in, you may be asked to sign in first.</>,
  },
  {
    id: "spaces",
    question: "How do vendor spaces work?",
    answer: <>An organizer can include vendor space information on an event listing. Open the event to see whether spaces are offered and how that organizer accepts vendor interest or registrations.</>,
  },
  {
    id: "apply",
    question: "How can I apply for a vendor space?",
    answer: <>Check the event listing for its vendor registration method. Depending on what the organizer has set up, you may be able to apply through VendorGrid or follow their listed website, email, or phone instructions.</>,
  },
  {
    id: "organizer",
    question: "How do I contact an event organizer?",
    answer: <>Open the event listing and look for the organizer’s contact information or available messaging options. The details shown depend on what the organizer has shared.</>,
  },
  {
    id: "pro",
    question: "What does VendorGrid Pro include?",
    answer: <>Pro offers additional tools such as vendor cards, inventory tracking, event analytics, and ways to connect with vendors and event owners. See the current features and plan details on the <Link href="/upgrade" className={answerLink} data-testid="link-faq-pro">Pro page</Link>.</>,
  },
  {
    id: "necessary",
    question: "Do I need Pro to browse events?",
    answer: <>No. You can <Link href="/" className={answerLink} data-testid="link-faq-browse-free">browse event listings</Link> without a Pro subscription. Pro is for additional tools.</>,
  },
  {
    id: "profile",
    question: "Where can I manage my profile?",
    answer: <>Visit <Link href="/profile" className={answerLink} data-testid="link-faq-profile">Profile</Link> to review your account details. You may need to sign in first.</>,
  },
  {
    id: "help",
    question: "How do I get help with VendorGrid?",
    answer: <>Use the Contact Us option in the site footer or sidebar to reach the VendorGrid team. For general information, you can also read the <Link href="/about" className={answerLink} data-testid="link-faq-about">About page</Link>.</>,
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-4xl pb-12 text-foreground">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[#412b22] px-6 py-10 text-[#fff3e7] sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#b87343]/40" aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffb477]"><CircleHelp className="h-4 w-4" aria-hidden="true" /> FAQ / Help</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">A few good answers.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#f1d9c8]">New here? Here’s how to find markets, share an event, and get more out of VendorGrid.</p>
        </div>
      </div>

      <section className="px-1 py-10 sm:py-14" aria-labelledby="faq-questions">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The essentials</span>
            <h2 id="faq-questions" className="mt-2 font-display text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">01 — 10</span>
        </div>
        <Accordion type="single" collapsible className="overflow-hidden rounded-2xl border border-border bg-card px-5 sm:px-8">
          {questions.map(({ id, question, answer }, index) => (
            <AccordionItem key={id} value={id} className="last:border-b-0">
              <AccordionTrigger data-testid={`button-faq-${id}`} className="min-h-16 gap-4 py-4 text-left text-[15px] font-semibold hover:no-underline hover:text-primary sm:text-base">
                <span className="flex items-start gap-4">
                  <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <span>{question}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pl-9 pr-6 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <aside className="flex flex-col gap-5 rounded-2xl border border-border bg-secondary/50 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail className="h-4 w-4" aria-hidden="true" /></span>
          <h2 className="mt-3 font-display text-xl font-bold">Still have a question?</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Use Contact Us in the footer or sidebar and we’ll point you in the right direction.</p>
        </div>
        <Link href="/about" data-testid="link-faq-learn-more" className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          About VendorGrid <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}