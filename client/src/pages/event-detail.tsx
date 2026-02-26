import { useParams, Link } from "wouter";
import { useEvent } from "@/hooks/use-events";
import { useVendorPosts, useCreateVendorPost } from "@/hooks/use-vendor-posts";
import { useSetAttendance, useRemoveAttendance } from "@/hooks/use-attendance";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Package, User, ArrowLeft, Loader2, Users, CheckCircle, Star, Hash, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const postSchema = z.object({
  itemsDescription: z.string().min(5, "Please tell us a bit more about what you're bringing."),
  imageUrl: z.string().url("Please enter a valid image URL").optional().or(z.literal("")),
});
type PostFormValues = z.infer<typeof postSchema>;

export default function EventDetail() {
  const { id } = useParams();
  const eventId = parseInt(id || "0", 10);
  const { data: event, isLoading: isLoadingEvent } = useEvent(eventId);
  const { data: posts, isLoading: isLoadingPosts } = useVendorPosts(eventId);
  const { mutate: createPost, isPending: isCreating } = useCreateVendorPost(eventId);
  const { mutate: setAttendance, isPending: isSettingAttendance } = useSetAttendance(eventId);
  const { mutate: removeAttendance, isPending: isRemoving } = useRemoveAttendance(eventId);
  const { isAuthenticated, user } = useAuth();
  const { data: profileData } = useProfile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const profile = profileData?.profile;
  const userStatus = event?.userStatus;
  const isVendor = profile?.profileType === "vendor";
  const isEventOwner = profile?.profileType === "event_owner";
  const isOwner = event?.createdBy === user?.id;

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { itemsDescription: "", imageUrl: "" },
  });

  const onSubmit = (data: PostFormValues) => {
    createPost({ itemsDescription: data.itemsDescription, imageUrl: data.imageUrl || undefined }, {
      onSuccess: () => { setIsDialogOpen(false); form.reset(); }
    });
  };

  const handleAttend = () => {
    if (userStatus === "attending") removeAttendance();
    else setAttendance("attending");
  };

  const handleInterested = () => {
    if (userStatus === "interested") removeAttendance();
    else setAttendance("interested");
  };

  if (isLoadingEvent) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Event not found</h2>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">Return to events</Link>
      </div>
    );
  }

  const vendorSpacesLeft = (event.vendorSpaces || 0) - (event.vendorSpacesUsed || 0);

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back">
        <ArrowLeft className="w-4 h-4" />Back to events
      </Link>

      {/* Hero */}
      <div className="bg-card rounded-3xl overflow-hidden border border-border/50 shadow-lg mb-8">
        <div className="h-48 md:h-64 bg-muted relative">
          <img src={`https://images.unsplash.com/photo-1519999482648-25049ddd37b1?q=80&w=2000&auto=format&fit=crop&sig=${event.id}`} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 md:left-10 text-white">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">{event.title}</h1>
            <p className="text-white/80 max-w-2xl line-clamp-2">{event.description}</p>
          </div>
        </div>

        <div className="p-6 md:p-10 bg-card">
          <div className="flex flex-wrap gap-6 text-muted-foreground mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Calendar className="w-5 h-5" /></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</p><p className="font-medium text-foreground">{format(new Date(event.date), 'MMMM do, yyyy')}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Clock className="w-5 h-5" /></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</p><p className="font-medium text-foreground">{format(new Date(event.date), 'h:mm a')}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><MapPin className="w-5 h-5" /></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</p><p className="font-medium text-foreground">{event.location}</p></div>
            </div>
            {event.areaCode && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Hash className="w-5 h-5" /></div>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Area</p><p className="font-medium text-foreground">{event.areaCode}</p></div>
              </div>
            )}
            {(event.vendorSpaces || 0) > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Spaces</p>
                  <p className="font-medium text-foreground">{event.vendorSpacesUsed || 0} / {event.vendorSpaces} used · <span className={vendorSpacesLeft > 0 ? "text-green-600" : "text-destructive"}>{vendorSpacesLeft} available</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Extra dates */}
          {(event.extraDates || []).length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Additional Dates</p>
              <div className="flex flex-wrap gap-2">
                {(event.extraDates || []).map((d: any) => (
                  <Badge key={d.id} variant="secondary" className="text-sm">{format(new Date(d.date), 'MMM d, yyyy h:mm a')}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">{event.attendingCount || 0}</strong> attending</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-amber-500" />
              <span><strong className="text-foreground">{event.interestedCount || 0}</strong> interested</span>
            </div>
          </div>

          {/* Action Buttons */}
          {isAuthenticated ? (
            <div className="flex flex-wrap gap-3">
              <Button
                data-testid="button-attending"
                variant={userStatus === "attending" ? "default" : "outline"}
                className={`rounded-xl gap-2 ${userStatus === "attending" ? "bg-green-600 border-green-600 text-white" : ""}`}
                onClick={handleAttend}
                disabled={isSettingAttendance || isRemoving}
              >
                <CheckCircle className="w-4 h-4" />
                {userStatus === "attending" ? "Attending" : "Mark Attending"}
              </Button>
              <Button
                data-testid="button-interested"
                variant={userStatus === "interested" ? "default" : "outline"}
                className={`rounded-xl gap-2 ${userStatus === "interested" ? "bg-amber-500 border-amber-500 text-white" : ""}`}
                onClick={handleInterested}
                disabled={isSettingAttendance || isRemoving}
              >
                <Star className="w-4 h-4" />
                {userStatus === "interested" ? "Interested" : "Mark Interested"}
              </Button>

              {(isVendor || (!isEventOwner && !isOwner)) && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="default" className="rounded-xl gap-2" data-testid="button-im-vending">
                      <Package className="w-4 h-4" />I'm Vending Here
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader><DialogTitle className="text-2xl font-display">What are you bringing?</DialogTitle></DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                        <FormField control={form.control} name="itemsDescription" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tell the community about your items</FormLabel>
                            <FormControl><Textarea placeholder="I'll be bringing handcrafted ceramic mugs..." className="min-h-[120px] rounded-xl resize-none" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl><Input placeholder="https://..." className="rounded-xl" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full h-12 rounded-xl" disabled={isCreating} data-testid="button-submit-post">
                          {isCreating ? "Posting..." : "Share with Community"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          ) : (
            <Button asChild variant="outline" className="rounded-xl" data-testid="button-login-to-attend">
              <a href="/api/login">Login to mark attendance</a>
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
          <TabsTrigger value="vendors" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Vendors <Badge variant="secondary" className="ml-2 text-xs">{posts?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Item Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-0">
          {isLoadingPosts ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : posts?.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No vendors listed yet</h3>
              <p className="text-muted-foreground">Be the first to share what you're bringing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts?.map((post: any) => (
                <div key={post.id} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow" data-testid={`vendor-post-${post.id}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary/10">
                      <AvatarImage src={post.vendorAvatar || ""} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground"><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-foreground text-lg">{post.vendorName || "Anonymous Vendor"}</h4>
                      <p className="text-xs text-muted-foreground">{format(new Date(post.createdAt!), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                  {post.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden aspect-video">
                      <img src={post.imageUrl} alt="Vendor items" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="bg-muted/50 p-4 rounded-xl text-foreground text-sm leading-relaxed">{post.itemsDescription}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts?.filter((post: any) => post.imageUrl).map((post: any) => (
              <div key={`gallery-${post.id}`} className="group relative aspect-square rounded-2xl overflow-hidden border border-border/50 bg-muted">
                <img src={post.imageUrl!} alt={post.vendorName || "Vendor item"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white text-sm font-medium line-clamp-1">{post.vendorName}</p>
                  <p className="text-white/80 text-xs line-clamp-2 mt-1">{post.itemsDescription}</p>
                </div>
              </div>
            ))}
            {(!posts || posts.filter((p: any) => p.imageUrl).length === 0) && (
              <div className="col-span-full py-20 text-center bg-card border border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground">No item photos shared yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
