import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2, Send } from "lucide-react";

// Same contact flow as the footer/sidebar Contact Us dialog (POST
// /api/contact), as a real page for the /contact route. Replies arrive via
// profile notifications, so sending requires sign-in.
export default function ContactPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { mutate: sendContact, isPending: isSending } = useMutation({
    mutationFn: () => apiRequest("POST", "/api/contact", { subject, message }),
    onSuccess: () => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setSubject("");
      setMessage("");
    },
    onError: (e: any) => {
      toast({ title: "Failed to send", description: e.message || "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-3xl p-8 shadow-xl border border-border/50">
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <Mail className="w-7 h-7 text-primary" /> Contact Us
        </h1>
        <p className="text-muted-foreground mb-6">
          {isAuthenticated
            ? "Send a message directly to the VendorGrid team. We'll respond via your profile notifications."
            : "Sign in to send a message to the VendorGrid team and receive a reply in your notifications."}
        </p>
        {isAuthenticated ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Subject</label>
              <Input
                placeholder="What's this about?"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="rounded-xl"
                data-testid="input-contact-page-subject"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Message</label>
              <Textarea
                placeholder="Tell us how we can help..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="rounded-xl min-h-[120px] resize-none"
                data-testid="input-contact-page-message"
              />
            </div>
            <Button
              className="rounded-xl w-full"
              disabled={!subject.trim() || !message.trim() || isSending}
              onClick={() => sendContact()}
              data-testid="button-contact-page-send"
            >
              {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Message</>}
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full rounded-xl">
            <Link href="/auth">Sign In to Contact Us</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
