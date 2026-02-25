import { useParams } from "wouter";
import { useEvent } from "@/hooks/use-events";
import { useVendorPosts, useCreateVendorPost } from "@/hooks/use-vendor-posts";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Package, User, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

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
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { itemsDescription: "" },
  });

  const onSubmit = (data: PostFormValues) => {
    createPost({
      itemsDescription: data.itemsDescription,
      imageUrl: data.imageUrl || undefined,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  if (isLoadingEvent) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Event not found</h2>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">Return to events</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to events
      </Link>

      {/* Header Profile */}
      <div className="bg-card rounded-3xl overflow-hidden border border-border/50 shadow-lg mb-12">
        <div className="h-48 md:h-64 bg-muted relative">
          {/* beautiful outdoor market */}
          <img 
            src={`https://images.unsplash.com/photo-1519999482648-25049ddd37b1?q=80&w=2000&auto=format&fit=crop&sig=${event.id}`} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 md:left-10 text-white">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-2 text-white">{event.title}</h1>
            <p className="text-white/80 max-w-2xl line-clamp-2">{event.description}</p>
          </div>
        </div>
        
        <div className="p-6 md:p-10 bg-card flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
          <div className="flex flex-wrap gap-6 text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</p>
                <p className="font-medium text-foreground">{format(new Date(event.date), 'MMMM do, yyyy')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</p>
                <p className="font-medium text-foreground">{format(new Date(event.date), 'h:mm a')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
                <p className="font-medium text-foreground">{event.location}</p>
              </div>
            </div>
          </div>

          <div>
            {isAuthenticated ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl px-8 h-14 text-base">
                    <Package className="w-5 h-5 mr-2" />
                    I'm Vending Here
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-display">What are you bringing?</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                      <FormField
                        control={form.control}
                        name="itemsDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tell the community about your items</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="I'll be bringing handcrafted ceramic mugs, bowls, and some new woven baskets!"
                                className="min-h-[120px] rounded-xl resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://images.unsplash.com/..."
                                className="rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={isCreating}>
                        {isCreating ? "Posting..." : "Share with Community"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            ) : (
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl px-8 h-14 text-base">
                <a href="/api/login">Login to Join as Vendor</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
          <TabsTrigger value="vendors" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Vendors
          </TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Item Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-6 mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              Who's Coming
              <span className="bg-primary/10 text-primary text-sm py-1 px-3 rounded-full font-sans font-semibold">
                {posts?.length || 0} Vendors
              </span>
            </h2>
          </div>

          {isLoadingPosts ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : posts?.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No vendors listed yet</h3>
              <p className="text-muted-foreground">Be the first to share what you're bringing to this event!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts?.map((post) => (
                <div key={post.id} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary/10">
                      <AvatarImage src={post.vendorAvatar || ""} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-foreground text-lg">{post.vendorName || "Anonymous Vendor"}</h4>
                      <p className="text-xs text-muted-foreground">{format(new Date(post.createdAt!), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl text-foreground text-sm leading-relaxed">
                    {post.itemsDescription}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts?.filter(post => post.imageUrl).map((post) => (
              <div key={`gallery-${post.id}`} className="group relative aspect-square rounded-2xl overflow-hidden border border-border/50 bg-muted">
                <img 
                  src={post.imageUrl!} 
                  alt={post.vendorName || "Vendor item"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white text-sm font-medium line-clamp-1">{post.vendorName}</p>
                  <p className="text-white/80 text-xs line-clamp-2 mt-1">{post.itemsDescription}</p>
                </div>
              </div>
            ))}
            {(!posts || posts.filter(post => post.imageUrl).length === 0) && (
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
