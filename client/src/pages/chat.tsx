import { useMessages, useCreateMessage } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Send, Store, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Chat() {
  const { data: messages, isLoading } = useMessages();
  const { mutate: sendMessage, isPending } = useCreateMessage();
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPending) return;

    sendMessage({ content }, {
      onSuccess: () => setContent("")
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <Store className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Join the Conversation</h2>
        <p className="text-muted-foreground mb-8">Login to chat with other local vendors, share setup tips, and discuss upcoming markets.</p>
        <Button asChild size="lg" className="rounded-xl px-8 h-14 text-base w-full">
          <a href="/api/login">Login to Chat</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-background/50 border-b border-border/50 backdrop-blur z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground leading-tight">Vendor Community</h2>
          <p className="text-sm text-muted-foreground">Share tips, strategies, and connect.</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10" ref={scrollRef}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
            <Store className="w-12 h-12 mb-4" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages?.map((msg, i) => {
            const isMe = msg.senderId === user?.id;
            const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 flex-shrink-0 ${!showAvatar && 'opacity-0'}`}>
                  <Avatar className="w-10 h-10 border border-primary/20 shadow-sm">
                    <AvatarImage src={msg.senderAvatar || ""} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  {showAvatar && (
                    <span className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                      {isMe ? 'You' : msg.senderName || 'Vendor'}
                    </span>
                  )}
                  <div className={`
                    px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm
                    ${isMe 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-card border border-border/50 text-foreground rounded-tl-sm'
                    }
                  `}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-70">
                    {format(new Date(msg.createdAt!), 'h:mm a')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border/50">
        <form onSubmit={handleSend} className="flex items-center gap-3 relative">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message to the community..."
            className="flex-1 h-14 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary/20 px-6 text-base pr-16"
            disabled={isPending}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!content.trim() || isPending}
            className="absolute right-2 w-10 h-10 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
