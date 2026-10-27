import { useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";

type HelpEntry = {
  id: string;
  keywords: string[];
  answer: string;
  link?: string;
  linkLabel?: string;
};

// Scripted v1 knowledge base. Every answer describes a real site feature and
// every link is a real route. The bot answers and navigates only — it never
// edits, publishes, pays, or messages on the user's behalf.
const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "post-event",
    keywords: ["post", "host", "create", "publish", "new event", "list an event"],
    answer:
      "Post it from Host an Event — fill in the name, dates, location, and at least one way for vendors to apply (website, signup form, email, or phone), then Publish. Pro accounts can post right away.",
    link: "/events/new",
    linkLabel: "Host an event",
  },
  {
    id: "vendor-apply",
    keywords: ["apply", "application", "applicants", "signup", "sign up", "register"],
    answer:
      "Set the registration method (signup form link or website) when you post or edit your event. Vendors apply from your event page, and you can see applicants on the event page.",
    link: "/manage-markets",
    linkLabel: "Manage my events",
  },
  {
    id: "banner",
    keywords: ["banner", "flyer", "cover photo", "cover image"],
    answer:
      "Open your event and use Change banner to upload the flyer image. Banners can be changed by the event's poster (Pro) or an admin.",
    link: "/manage-markets",
    linkLabel: "Manage my events",
  },
  {
    id: "spaces",
    keywords: ["spaces", "booth", "spot", "table", "price"],
    answer:
      "Edit your event and set vendor spaces, booth width and depth, and the spot price. Those fields show on the event page for vendors.",
    link: "/manage-markets",
    linkLabel: "Manage my events",
  },
  {
    id: "payments",
    keywords: ["payment", "pay", "stripe", "square", "fee", "checkout", "money"],
    answer:
      "As a Pro organizer you pay no platform fee on in-app registrations — organizers can take Stripe or Square payments for vendor spots.",
    link: "/pro",
    linkLabel: "Pro details",
  },
  {
    id: "applicants-visibility",
    keywords: ["applicant names", "who applied", "visible", "public", "hide applicants"],
    answer:
      "You always see your own applicants on the event page. Whether visitors see applicant names is controlled by the 'Show applicant names publicly' setting on your event — it's off by default.",
    link: "/manage-markets",
    linkLabel: "Manage my events",
  },
  {
    id: "find-events",
    keywords: ["find", "search", "filter", "browse", "discover", "map", "near me", "category"],
    answer:
      "The Community Board has keyword search plus state, ZIP/radius, category, and date filters, and a List/Map toggle. On the map, yellow pins are listed by VendorGrid and green pins are listed by a Pro user.",
    link: "/",
    linkLabel: "Community Board",
  },
  {
    id: "notifications",
    keywords: ["notification", "notify", "alert", "new events"],
    answer:
      "Pro members get notifications of new events in their area. Check yours from the bell in the header or your profile's notifications tab.",
    link: "/profile?tab=notifications",
    linkLabel: "Notifications",
  },
  {
    id: "inventory",
    keywords: ["inventory", "wares", "products", "sell"],
    answer:
      "Pro vendors manage their wares on the Inventory page — full inventory plus photo listings of what you sell.",
    link: "/inventory",
    linkLabel: "Inventory",
  },
  {
    id: "edit-event",
    keywords: ["edit", "change", "update", "add a date", "add date"],
    answer:
      "Open your event and use Edit — you can change the details, add extra dates, and set the event's category, which powers the board's category filter.",
    link: "/manage-markets",
    linkLabel: "Manage my events",
  },
  {
    id: "pro-price",
    keywords: ["pro", "cost", "subscription", "trial", "plan"],
    answer:
      "Pro is one package for vendors and organizers: $14.95/month or $99/year, with a 14-day trial. Vendors get inventory, photo listings, and new-event notifications; organizers get vendor applications and payments.",
    link: "/pro",
    linkLabel: "Pro details",
  },
  {
    id: "takeover",
    keywords: ["claim", "takeover", "take over", "ownership", "my event is listed"],
    answer:
      "Listings are managed by the person who posted them. If your event is listed and you'd like to manage it, reach out through the contact page and we'll hand it over.",
    link: "/contact",
    linkLabel: "Contact us",
  },
  {
    id: "profile",
    keywords: ["profile", "account", "vendor name", "settings"],
    answer:
      "Your profile holds your vendor name and account settings — vendors see your vendor name on listings where you're accepted.",
    link: "/profile",
    linkLabel: "My profile",
  },
];

const SUGGESTED_QUESTIONS = [
  "How do I post an event?",
  "How do payments work?",
  "How do I change my banner?",
  "What does Pro include?",
  "How do I find events?",
];

const GREETINGS = new Set(["hi", "hello", "hey", "help", "yo"]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findEntry(question: string): HelpEntry | null {
  const q = normalize(question);
  if (GREETINGS.has(q)) return null;
  let best: HelpEntry | null = null;
  let bestScore = 0;
  for (const entry of HELP_ENTRIES) {
    const score = entry.keywords.filter((k) => q.includes(k)).length;
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

type Message = { from: "user" | "bot"; text: string; link?: string; linkLabel?: string };

export function HelpBot() {
  const { data } = useProfile();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "Hi! I'm VendorGrid help. Ask me how something works and I'll point you to the right page.",
    },
  ]);

  const profile = (data as any)?.profile;
  const isPro =
    profile?.isAdmin === true ||
    (profile?.subscriptionStatus === "active" &&
      (profile?.subscriptionTier === "vendor_pro" || profile?.subscriptionTier === "event_owner_pro"));
  if (!isPro) return null;

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const q = normalize(trimmed);
    const next: Message[] = [...messages, { from: "user" as const, text: trimmed }];
    if (GREETINGS.has(q)) {
      next.push({
        from: "bot",
        text: "Hi! Ask me something like 'How do I post an event?' or tap a suggestion below.",
      });
    } else {
      const entry = findEntry(trimmed);
      if (entry) {
        next.push({ from: "bot", text: entry.answer, link: entry.link, linkLabel: entry.linkLabel });
      } else {
        next.push({
          from: "bot",
          text: "I don't have a scripted answer for that yet. Try rephrasing, or reach out through the contact page and a human will help.",
          link: "/contact",
          linkLabel: "Contact us",
        });
      }
    }
    setMessages(next);
    setInput("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-[calc(100vw-2rem)] max-w-[360px] rounded-xl border bg-background shadow-lg flex flex-col overflow-hidden"
          data-testid="panel-help-bot"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">VendorGrid help</span>
              <Badge variant="secondary">Pro</Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Close help">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-2 p-3 max-h-[50vh] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                    m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.link && (
                    <Button
                      variant={m.from === "user" ? "secondary" : "default"}
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      data-testid="button-help-bot-link"
                      onClick={() => {
                        navigate(m.link!);
                        setOpen(false);
                      }}
                    >
                      {m.linkLabel ?? "Open page"} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {SUGGESTED_QUESTIONS.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-full"
                onClick={() => ask(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2 p-3 border-t"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how something works…"
              className="h-9 text-sm"
              data-testid="input-help-bot-question"
              aria-label="Ask the help bot a question"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0" data-testid="button-help-bot-send" aria-label="Send question">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        data-testid="button-help-bot-open"
        aria-label={open ? "Close help" : "Open Pro help"}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>
    </div>
  );
}
