import { useState } from "react";
import { useMessages, useCreateMessage } from "@/hooks/use-messages";
import { useRealProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Send, Store, User, Loader2, MapPin, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { user, isAuthenticated } = useAuth();
  const { data: profileData } = useRealProfile();
  const isAdmin = profileData?.profile?.isAdmin === true;
  const [areaFilter, setAreaFilter] = useState<string>(() => profileData?.profile?.areaCode || "");
  const [areaInput, setAreaInput] = useState(profileData?.profile?.areaCode || "");
  const { data: messages, isLoading } = useMessages(areaFilter || undefined);
  const { mutate: sendMessage, isPending } = useCreateMessage();
  const [content, setContent] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const deleteMessage = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/messages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message deleted." });
    },
    onError: () => toast({ title: "Failed to delete message.", variant: "destructive" }),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPending) return;
    sendMessage({ content, areaCode: areaFilter || undefined }, {
      onSuccess: () => setContent("")
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-card p-12 rounded-3xl border border-border shadow-lg">
        <Store className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-3xl font-display font-bold mb-4">Join the Conversation</h2>
        <p className="text-muted-foreground mb-8">Login to chat with vendors in your area.</p>
        <Button asChild size="lg" className="rounded-xl px-8 h-14 w-full"><a href="/api/login">Login to Chat</a></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden">
      <div className="px-6 py-4 bg-background/50 border-b border-border/50 backdrop-blur z-10">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground leading-tight">Vendor Community</h2>
              <p className="text-sm text-muted-foreground">
                {areaFilter ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Area: {areaFilter}</span> : "All areas"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Filter className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                data-testid="input-area-filter-chat"
                placeholder="Filter by area code..."
                value={areaInput}
                onChange={e => setAreaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setAreaFilter(areaInput); }}
                className="pl-9 rounded-xl h-9 w-44 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => setAreaFilter(areaInput)} className="rounded-xl h-9" data-testid="button-apply-area-filter">
              Apply
            </Button>
            {areaFilter && (
              <Button size="sm" variant="ghost" onClick={() => { setAreaFilter(""); setAreaInput(""); }} className="rounded-xl h-9 text-muted-foreground">
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
        {isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
        ) : messages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
            <Store className="w-12 h-12 mb-4" />
            <p>{areaFilter ? `No messages in area ${areaFilter} yet.` : "No messages yet. Start the conversation!"}</p>
          </div>
        ) : (
          messages?.map((msg: any, i: number) => {
            const isMe = msg.senderId === user?.id;
            const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;
            const isHovered = hoveredId === msg.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} group relative`}
                onMouseEnter={() => setHoveredId(msg.id)}
                onMouseLeave={() => setHoveredId(null)}
                data-testid={`message-row-${msg.id}`}
              >
                <div className={`w-10 flex-shrink-0 ${!showAvatar && 'opacity-0'}`}>
                  <Avatar className="w-10 h-10 border border-primary/20 shadow-sm">
                    <AvatarImage src={msg.senderAvatar || ""} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground"><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                </div>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-muted-foreground">{isMe ? 'You' : msg.senderName || 'Vendor'}</span>
                      {msg.areaCode && <Badge variant="outline" className="text-[9px] h-4 px-1">{msg.areaCode}</Badge>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isAdmin && isHovered && !isMe && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMessage.mutate(msg.id)}
                        disabled={deleteMessage.isPending}
                        data-testid={`button-delete-message-${msg.id}`}
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <div className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border/50 text-foreground rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                    {isAdmin && isHovered && isMe && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMessage.mutate(msg.id)}
                        disabled={deleteMessage.isPending}
                        data-testid={`button-delete-message-${msg.id}`}
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-70">{format(new Date(msg.createdAt!), 'h:mm a')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-card border-t border-border/50">
        <form onSubmit={handleSend} className="flex items-center gap-3 relative">
          <Input
            data-testid="input-message"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={areaFilter ? `Message the ${areaFilter} community...` : "Type a message to the community..."}
            className="flex-1 h-14 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary/20 px-6 text-base pr-16"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={!content.trim() || isPending} className="absolute right-2 w-10 h-10 rounded-xl bg-primary text-white shadow-md shadow-primary/20" data-testid="button-send">
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
