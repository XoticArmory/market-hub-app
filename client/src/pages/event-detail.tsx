import { useParams, Link } from "wouter";
import { useEvent, useCancelEvent } from "@/hooks/use-events";
import { useVendorPosts, useCreateVendorPost, useDeleteVendorPost, useUpdateVendorPostImages } from "@/hooks/use-vendor-posts";
import { useSetAttendance, useRemoveAttendance } from "@/hooks/use-attendance";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useAdminPreview } from "@/contexts/admin-preview";
import { useEventRegistrations, useRegisterVendorSpace, useUnregisterVendorSpace } from "@/hooks/use-registrations";
import { useEventMap } from "@/hooks/use-event-map";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Package, User, ArrowLeft, Loader2, Users, CheckCircle, Star, Hash, Map, DollarSign, ShieldCheck, Trash2, PlusCircle, Crown, X, ImageIcon, AlertTriangle, ExternalLink, Key, Copy, Camera, ClipboardList, ThumbsUp, ThumbsDown, Clock3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EventMapEditor } from "@/components/EventMapEditor";
import { ImageUpload } from "@/components/image-upload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

function normalizeUrl(url: string) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

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
  const { mutate: deletePost, isPending: isDeleting } = useDeleteVendorPost(eventId);
  const { mutate: updateImages, isPending: isUpdatingImages } = useUpdateVendorPostImages(eventId);
  const { mutate: setAttendance, isPending: isSettingAttendance } = useSetAttendance(eventId);
  const { mutate: removeAttendance, isPending: isRemoving } = useRemoveAttendance(eventId);
  const { isAuthenticated, user } = useAuth();
  const { data: profileData } = useProfile();
  const { previewTier } = useAdminPreview();
  const { data: registrations } = useEventRegistrations(eventId);
  const { data: mapData } = useEventMap(eventId);
  const { mutate: registerSpace, isPending: isRegistering } = useRegisterVendorSpace(eventId);
  const { mutate: unregisterSpace, isPending: isUnregistering } = useUnregisterVendorSpace(eventId);

  const { mutate: cancelEvent, isPending: isCanceling } = useCancelEvent(eventId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [unregisterDialogOpen, setUnregisterDialogOpen] = useState(false);
  const [unregisterPostDialogOpen, setUnregisterPostDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [addPhotoDialogOpen, setAddPhotoDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [addPhotoUrl, setAddPhotoUrl] = useState("");
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [registrationCodeInput, setRegistrationCodeInput] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const updateBanner = useMutation({
    mutationFn: async (bannerUrl: string | null) => {
      const res = await fetch(`/api/events/${eventId}/banner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bannerUrl }),
      });
      if (!res.ok) throw new Error("Failed to update banner");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.events.get.path, eventId] });
      qc.invalidateQueries({ queryKey: [api.events.list.path] });
      toast({ title: "Banner updated!" });
    },
    onError: () => toast({ title: "Failed to update banner.", variant: "destructive" }),
  });

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      updateBanner.mutate(url);
    } catch {
      toast({ title: "Upload failed.", variant: "destructive" });
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const approveApplication = useMutation({
    mutationFn: (regId: number) =>
      fetch(`/api/events/${eventId}/registrations/${regId}/approve`, { method: "PATCH", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
      qc.invalidateQueries({ queryKey: ["/api/events/:id", eventId] });
      toast({ title: "Application approved!" });
    },
    onError: () => toast({ title: "Failed to approve.", variant: "destructive" }),
  });

  const rejectApplication = useMutation({
    mutationFn: (regId: number) =>
      fetch(`/api/events/${eventId}/registrations/${regId}/reject`, { method: "PATCH", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
      toast({ title: "Application declined." });
    },
    onError: () => toast({ title: "Failed to decline.", variant: "destructive" }),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup_listing") === "1") {
      setJustRegistered(true);
      setIsDialogOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const profile = profileData?.profile;
  const userStatus = event?.userStatus;
  const isVendor = profile?.profileType === "vendor";
  const isEventOwner = profile?.profileType === "event_owner";
  const realIsOwner = event?.createdBy === user?.id;
  // When admin previews as vendor_pro, treat them as a non-owner so vendor flows are visible
  const isOwner = previewTier === "vendor_pro" ? false : realIsOwner;
  const isVendorPro = (profile?.subscriptionTier === "vendor_pro" && profile?.subscriptionStatus === "active") || profile?.isAdmin === true;
  const isAdmin = profile?.isAdmin === true;
  const isEventOwnerPro = isAdmin || (profile?.subscriptionTier === "event_owner_pro" && profile?.subscriptionStatus === "active");
  const canManageEvent = isAdmin || (isOwner && isEventOwnerPro);
  const hasVendorSpaces = (event?.vendorSpaces || 0) > 0;
  const regType = (event as any)?.vendorRegistrationType as string | null;
  const regUrl = (event as any)?.vendorRegistrationUrl as string | null;
  const isVendorGridReg = regType === 'vendorgrid';
  const isExternalReg = regType === 'external' && !!regUrl;
  const isFormReg = regType === 'form' && !!regUrl;
  const spotPrice = event?.spotPrice || 0;
  const spotPriceDollars = (spotPrice / 100).toFixed(2);
  const platformFee = isVendorPro ? 0 : Math.round(spotPrice * 0.005);
  const platformFeeDollars = (platformFee / 100).toFixed(2);
  const totalDollars = ((spotPrice + platformFee) / 100).toFixed(2);

  const mapSpots: any[] = (mapData?.mapData as any)?.spots || [];
  const bookedSpotIds = (registrations || []).filter((r: any) => ['paid', 'approved'].includes(r.status)).map((r: any) => r.spotId);
  const availableSpots = mapSpots.filter((s: any) => !bookedSpotIds.includes(s.id));
  const hasEventMap = mapSpots.length > 0;
  const myRegistration = (registrations || []).find((r: any) => r.vendorId === user?.id && r.status !== 'canceled');
  const alreadyRegistered = !!myRegistration;

  const myPost = posts?.find((p: any) => p.vendorId === user?.id);
  const myPostImages: string[] = myPost?.imageUrls || [];
  const maxPhotos = isVendorPro ? 10 : 3;

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

  const handleAddPhoto = () => {
    if (!addPhotoUrl.trim() || !myPost) return;
    const updated = [...myPostImages, addPhotoUrl.trim()].slice(0, maxPhotos);
    updateImages({ postId: myPost.id, imageUrls: updated }, {
      onSuccess: () => { setAddPhotoDialogOpen(false); setAddPhotoUrl(""); }
    });
  };

  const handleRemovePhoto = (idx: number) => {
    if (!myPost) return;
    const updated = myPostImages.filter((_, i) => i !== idx);
    updateImages({ postId: myPost.id, imageUrls: updated });
  };

  const vendorSpacesLeft = (event?.vendorSpaces || 0) - (event?.vendorSpacesUsed || 0);

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

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back">
        <ArrowLeft className="w-4 h-4" />Back to events
      </Link>

      {/* Banner file input (hidden) */}
      {canManageEvent && (
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerFileChange}
          data-testid="input-banner-file"
        />
      )}

      {/* Hero */}
      <div className="bg-card rounded-3xl overflow-hidden border border-border/50 shadow-lg mb-8">
        <div className="h-48 md:h-64 bg-muted relative">
          <img
            src={(event as any).bannerUrl || `https://images.unsplash.com/photo-1519999482648-25049ddd37b1?q=80&w=2000&auto=format&fit=crop&sig=${event.id}`}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {canManageEvent && (
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading || updateBanner.isPending}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity backdrop-blur disabled:opacity-50"
              data-testid="button-change-banner"
            >
              {bannerUploading || updateBanner.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {bannerUploading ? "Uploading…" : "Change banner"}
            </button>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 md:left-10 text-white">
            {event.isFeatured && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 text-xs font-semibold text-white mb-2 w-fit">
                <Star className="w-3 h-3" />Featured
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">{event.title}</h1>
            <p className="text-white/80 max-w-2xl line-clamp-2">{event.description}</p>
          </div>
        </div>

        <div className="p-6 md:p-10 bg-card">
          {event.canceledAt && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">This event has been canceled</p>
                <p className="text-sm opacity-80">All attendees and registered vendors have been notified.</p>
              </div>
            </div>
          )}
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
            {hasVendorSpaces && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Spaces</p>
                  <p className="font-medium text-foreground" data-testid="vendor-spaces-count">{event.vendorSpacesUsed || 0}/{event.vendorSpaces} used · <span className={vendorSpacesLeft > 0 ? "text-green-600" : "text-destructive"}>{vendorSpacesLeft} available</span></p>
                </div>
              </div>
            )}
            {hasVendorSpaces && spotPrice > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><DollarSign className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spot Price</p>
                  <p className="font-medium text-foreground">${spotPriceDollars} per space</p>
                </div>
              </div>
            )}
          </div>

          {/* Owner-only: Registration Code display */}
          {canManageEvent && (event as any).registrationCode && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />Offline Registration Code
              </p>
              <div className="flex items-center gap-3">
                <code className="flex-1 font-mono font-bold text-lg text-amber-900 dark:text-amber-100 tracking-widest">{(event as any).registrationCode}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                  data-testid="button-copy-registration-code"
                  onClick={() => {
                    navigator.clipboard.writeText((event as any).registrationCode);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                >
                  {codeCopied ? <><CheckCircle className="w-3.5 h-3.5 mr-1" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                </Button>
              </div>
              <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-2">Share with vendors who paid outside VendorGrid. They enter this code to register for free.</p>
            </div>
          )}

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

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">{event.attendingCount || 0}</strong> attending</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-amber-500" />
              <span><strong className="text-foreground">{event.interestedCount || 0}</strong> interested</span>
            </div>
            {event.creatorName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>By <strong className="text-foreground">{event.creatorName}</strong></span>
                {(event as any).creatorWebsiteUrl && (
                  <a
                    href={normalizeUrl((event as any).creatorWebsiteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Visit organizer's website"
                    data-testid="link-creator-website-detail"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {event.isFeatured && <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
              </div>
            )}
          </div>

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

              {/* Vendor Registration — Vendor Pro only, next to Mark Interested */}
              {isVendorPro && !isOwner && !event.canceledAt && !alreadyRegistered && !myPost && (
                isVendorGridReg ? (
                  vendorSpacesLeft > 0 ? (
                    <Button
                      size="default"
                      className="rounded-xl gap-2"
                      onClick={() => setRegisterDialogOpen(true)}
                      data-testid="button-vendor-registration"
                    >
                      <ShieldCheck className="w-4 h-4" />Vendor Registration
                    </Button>
                  ) : (
                    <Button size="default" variant="outline" disabled className="rounded-xl gap-2 opacity-60" data-testid="button-no-spaces-left">
                      <ShieldCheck className="w-4 h-4" />No Spaces Left
                    </Button>
                  )
                ) : isExternalReg ? (
                  <Button
                    size="default"
                    className="rounded-xl gap-2"
                    onClick={() => window.open(regUrl!, '_blank')}
                    data-testid="button-vendor-registration-external"
                  >
                    <ExternalLink className="w-4 h-4" />Vendor Registration
                  </Button>
                ) : isFormReg ? (
                  <Button
                    size="default"
                    className="rounded-xl gap-2"
                    onClick={() => setApplyDialogOpen(true)}
                    data-testid="button-vendor-apply"
                  >
                    <ClipboardList className="w-4 h-4" />Apply for a Space
                  </Button>
                ) : (
                  <Button
                    size="default"
                    className="rounded-xl gap-2"
                    onClick={() => setIsDialogOpen(true)}
                    data-testid="button-vendor-registration"
                  >
                    <Package className="w-4 h-4" />Vendor Registration
                  </Button>
                )
              )}

              {/* Application status badges for form-based events */}
              {isVendorPro && !isOwner && isFormReg && myRegistration?.status === 'awaiting_approval' && (
                <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5" data-testid="badge-application-pending">
                  <Clock3 className="w-3.5 h-3.5" />Application Pending
                </Badge>
              )}
              {isVendorPro && !isOwner && isFormReg && myRegistration?.status === 'approved' && (
                <Badge variant="outline" className="gap-1.5 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 px-3 py-1.5" data-testid="badge-application-approved">
                  <CheckCircle className="w-3.5 h-3.5" />Application Approved
                </Badge>
              )}
              {isVendorPro && !isOwner && isFormReg && myRegistration?.status === 'rejected' && (
                <Badge variant="outline" className="gap-1.5 text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-1.5" data-testid="badge-application-rejected">
                  <X className="w-3.5 h-3.5" />Application Not Approved
                </Badge>
              )}

              {/* Cancel Event — event owner pro only */}
              {canManageEvent && !event.canceledAt && (
                <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="default" variant="outline" className="rounded-xl gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 ml-auto" data-testid="button-cancel-event">
                      <AlertTriangle className="w-4 h-4" />Cancel Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-display">Cancel This Event?</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm mt-1">Push notifications will be sent to all attending vendors and users. Continue?</p>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCancelDialogOpen(false)}>No</Button>
                      <Button
                        variant="destructive"
                        className="flex-1 rounded-xl"
                        disabled={isCanceling}
                        onClick={() => { cancelEvent(undefined, { onSuccess: () => setCancelDialogOpen(false) }); }}
                        data-testid="button-confirm-cancel-event"
                      >
                        {isCanceling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Canceling...</> : "Yes, Cancel Event"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* ===== VENDOR MANAGEMENT (Pro vendors / admins) ===== */}
              {(isVendorPro || isAdmin) && !isOwner && (
                <>
                  {/* Remove Listing — when vendor has a listing */}
                  {myPost && (
                    <>
                      <Button
                        size="default"
                        variant="outline"
                        className="rounded-xl gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => setUnregisterPostDialogOpen(true)}
                        disabled={isDeleting}
                        data-testid="button-unregister-post"
                      >
                        <X className="w-4 h-4" />Remove Listing
                      </Button>
                      <Dialog open={unregisterPostDialogOpen} onOpenChange={setUnregisterPostDialogOpen}>
                        <DialogContent className="sm:max-w-md rounded-2xl">
                          <DialogHeader><DialogTitle className="text-xl font-display flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Remove your vendor listing?</DialogTitle></DialogHeader>
                          <p className="text-muted-foreground text-sm">This will remove your vendor listing from this event. You can re-register anytime.</p>
                          <div className="flex gap-3 mt-2">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setUnregisterPostDialogOpen(false)}>Keep Listing</Button>
                            <Button
                              variant="destructive"
                              className="flex-1 rounded-xl"
                              disabled={isDeleting}
                              onClick={() => deletePost(myPost.id, { onSuccess: () => setUnregisterPostDialogOpen(false) })}
                              data-testid="button-confirm-unregister-post"
                            >
                              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</> : "Yes, Remove"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}

                  {/* Cancel Space — when vendor has a space registration */}
                  {alreadyRegistered && (
                    <>
                      <Button
                        size="default"
                        variant="outline"
                        className="rounded-xl gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => setUnregisterDialogOpen(true)}
                        disabled={isUnregistering}
                        data-testid="button-unregister-space"
                      >
                        <X className="w-4 h-4" />Cancel Space
                      </Button>
                      <Dialog open={unregisterDialogOpen} onOpenChange={setUnregisterDialogOpen}>
                        <DialogContent className="sm:max-w-md rounded-2xl">
                          <DialogHeader><DialogTitle className="text-xl font-display flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Cancel space registration?</DialogTitle></DialogHeader>
                          <p className="text-muted-foreground text-sm">This will cancel your vendor space registration. Refunds (if applicable) are handled by the event organizer.</p>
                          <div className="flex gap-3 mt-2">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setUnregisterDialogOpen(false)}>Keep My Space</Button>
                            <Button
                              variant="destructive"
                              className="flex-1 rounded-xl"
                              disabled={isUnregistering}
                              onClick={() => unregisterSpace(undefined, { onSuccess: () => setUnregisterDialogOpen(false) })}
                              data-testid="button-confirm-unregister-space"
                            >
                              {isUnregistering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Canceling...</> : "Yes, Cancel"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}

                  {/* Set Up Your Listing — space registered but no listing yet */}
                  {alreadyRegistered && !myPost && (
                    <Button
                      size="default"
                      variant="outline"
                      className="rounded-xl gap-2"
                      onClick={() => setIsDialogOpen(true)}
                      data-testid="button-setup-listing"
                    >
                      <Package className="w-4 h-4" />Set Up Your Listing
                    </Button>
                  )}

                  {/* Space Registration Dialog (VendorGrid) */}
                  <Dialog open={registerDialogOpen} onOpenChange={(open) => { setRegisterDialogOpen(open); if (!open) { setShowCodeInput(false); setRegistrationCodeInput(""); setSelectedSpot(null); } }}>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-display">Vendor Registration</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        {spotPrice > 0 ? (
                          <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                            <div className="flex justify-between"><span>Space fee:</span><strong>${spotPriceDollars}</strong></div>
                            <div className="flex justify-between font-bold border-t border-border/50 pt-2"><span>Total due:</span><strong>${spotPriceDollars}</strong></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                            <CheckCircle className="w-4 h-4 shrink-0" />Free space registration
                          </div>
                        )}

                        {hasEventMap && availableSpots.length > 0 && (
                          <div>
                            <label className="text-sm font-semibold mb-2 block">Choose a spot</label>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {availableSpots.map((spot: any) => (
                                <button
                                  key={spot.id}
                                  onClick={() => setSelectedSpot(spot)}
                                  className={`p-2 text-xs rounded-xl border-2 transition-all ${selectedSpot?.id === spot.id ? 'border-primary bg-primary/10 font-bold' : 'border-border hover:border-primary/50'}`}
                                  data-testid={`spot-${spot.id}`}
                                >
                                  {spot.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {!hasEventMap && (
                          <p className="text-sm text-muted-foreground">You'll be assigned a space by the event organizer after registering.</p>
                        )}

                        {/* Code entry for vendors who paid the organizer directly */}
                        {spotPrice > 0 && (
                          <div>
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              data-testid="button-toggle-code-input"
                              onClick={() => { setShowCodeInput(v => !v); setRegistrationCodeInput(""); }}
                            >
                              <Key className="w-3 h-3" />
                              {showCodeInput ? "Never mind, I'll pay online" : "I have a registration code"}
                            </button>
                            {showCodeInput && (
                              <div className="mt-2">
                                <Input
                                  data-testid="input-vendor-registration-code"
                                  placeholder="Enter code provided by organizer"
                                  className="rounded-xl uppercase tracking-widest font-mono"
                                  value={registrationCodeInput}
                                  onChange={e => setRegistrationCodeInput(e.target.value.toUpperCase())}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          className="w-full h-12 rounded-xl"
                          disabled={isRegistering || (hasEventMap && availableSpots.length > 0 && !selectedSpot)}
                          onClick={() => {
                            const code = showCodeInput && registrationCodeInput.trim() ? registrationCodeInput.trim() : undefined;
                            registerSpace({ spotId: selectedSpot?.id, spotName: selectedSpot?.name, registrationCode: code }, {
                              onSuccess: (data: any) => {
                                setRegisterDialogOpen(false);
                                setSelectedSpot(null);
                                setShowCodeInput(false);
                                setRegistrationCodeInput("");
                                if (data?.checkoutUrl) {
                                  window.location.href = data.checkoutUrl;
                                } else {
                                  setJustRegistered(true);
                                  setIsDialogOpen(true);
                                }
                              }
                            });
                          }}
                          data-testid="button-confirm-registration"
                        >
                          {isRegistering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering...</> : (spotPrice > 0 && !(showCodeInput && registrationCodeInput.trim())) ? "Reserve & Pay" : "Register"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Listing form dialog (controlled) */}
                  <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setJustRegistered(false); }}>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                      <DialogHeader><DialogTitle className="text-2xl font-display">{justRegistered ? "Space Reserved!" : "Set Up Your Vendor Listing"}</DialogTitle></DialogHeader>
                      {justRegistered && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>Your space is confirmed! Now let the community know what you're bringing.</span>
                        </div>
                      )}
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
                              <FormLabel>Photo URL <span className="text-muted-foreground font-normal">(Optional — you can add more photos after posting)</span></FormLabel>
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
                </>
              )}
            </div>
          ) : (
            <Button asChild variant="outline" className="rounded-xl" data-testid="button-login-to-attend">
              <a href="/auth">Login to mark attendance</a>
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12 flex-wrap gap-1">
          <TabsTrigger value="vendors" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Vendors <Badge variant="secondary" className="ml-2 text-xs">{posts?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">Gallery</TabsTrigger>
          {hasVendorSpaces && (
            <TabsTrigger value="spaces" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Package className="w-4 h-4 mr-1.5" />Vendor Spaces
              <Badge variant="secondary" className="ml-2 text-xs">{(registrations || []).filter((r: any) => r.status === 'paid').length}</Badge>
            </TabsTrigger>
          )}
          {hasEventMap && (
            <TabsTrigger value="map" className="rounded-lg px-5 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Map className="w-4 h-4 mr-1.5" />Layout Map
            </TabsTrigger>
          )}
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
              {posts?.map((post: any) => {
                const isMyPost = post.vendorId === user?.id;
                const postImages: string[] = post.imageUrls || [];
                const allImages: string[] = [
                  ...(post.imageUrl ? [post.imageUrl] : []),
                  ...postImages.filter((u: string) => u !== post.imageUrl),
                ];
                return (
                  <div key={post.id} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow relative" data-testid={`vendor-post-${post.id}`}>
                    {/* Pro badge */}
                    {post.isVendorPro && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs gap-1 border-0">
                          <Crown className="w-3 h-3" />Vendor Pro
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-12 h-12 border-2 border-primary/10">
                        <AvatarImage src={post.vendorAvatar || ""} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground"><User className="w-5 h-5" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 pr-20">
                          <h4 className="font-semibold text-foreground text-lg">{post.vendorName || "Anonymous Vendor"}</h4>
                          {(post as any).vendorWebsiteUrl && (
                            <a
                              href={normalizeUrl((post as any).vendorWebsiteUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                              title="Visit vendor's website"
                              data-testid={`link-vendor-website-${post.id}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(post.createdAt!), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>

                    {/* Images grid */}
                    {allImages.length > 0 && (
                      <div className={`mb-4 grid gap-2 ${allImages.length === 1 ? 'grid-cols-1' : allImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {allImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden aspect-square group">
                            <img src={imgUrl} alt={`Vendor photo ${idx + 1}`} className="w-full h-full object-cover" />
                            {isMyPost && (
                              <button
                                onClick={() => handleRemovePhoto(postImages.indexOf(imgUrl))}
                                className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove photo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-muted/50 p-4 rounded-xl text-foreground text-sm leading-relaxed">{post.itemsDescription}</div>

                    {/* Catalog-assigned items */}
                    {(post as any).catalogAssignments?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Products Available</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(post as any).catalogAssignments.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-3 p-3 bg-background border border-border/40 rounded-xl" data-testid={`catalog-assignment-${a.id}`}>
                              {a.item?.imageUrl ? (
                                <img src={a.item.imageUrl} alt={a.item.itemName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{a.item?.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  ${(a.item?.priceCents / 100).toFixed(2)} · Qty: {a.quantityAssigned}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photo management for own post */}
                    {isMyPost && (
                      <div className="mt-4 flex items-center gap-2">
                        {allImages.length < maxPhotos && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl gap-1.5 h-8 text-xs"
                            onClick={() => setAddPhotoDialogOpen(true)}
                            data-testid="button-add-photo"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />Add Photo
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">{allImages.length}/{maxPhotos} photos</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts?.flatMap((post: any) => {
              const postImages: string[] = post.imageUrls || [];
              const allImages: string[] = [
                ...(post.imageUrl ? [post.imageUrl] : []),
                ...postImages.filter((u: string) => u !== post.imageUrl),
              ];
              return allImages.map((imgUrl, idx) => ({ imgUrl, post, idx }));
            }).map(({ imgUrl, post, idx }) => (
              <div key={`gallery-${post.id}-${idx}`} className="group relative aspect-square rounded-2xl overflow-hidden border border-border/50 bg-muted">
                <img src={imgUrl} alt={post.vendorName || "Vendor item"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white text-sm font-medium line-clamp-1">{post.vendorName}</p>
                  <p className="text-white/80 text-xs line-clamp-2 mt-1">{post.itemsDescription}</p>
                </div>
              </div>
            ))}
            {(!posts || posts.flatMap((p: any) => {
              const imgs: string[] = p.imageUrls || [];
              return [p.imageUrl, ...imgs].filter(Boolean);
            }).length === 0) && (
              <div className="col-span-full py-20 text-center bg-card border border-dashed border-border rounded-2xl">
                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
                <p className="text-muted-foreground">No item photos shared yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {hasVendorSpaces && (
          <TabsContent value="spaces" className="mt-0">
            <div className="space-y-6">
              {/* Pending Applications section — visible to owner when form-based */}
              {canManageEvent && isFormReg && (registrations || []).some((r: any) => r.status === 'awaiting_approval') && (
                <div>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-amber-500" />Pending Applications
                    <Badge variant="secondary" className="text-xs">{(registrations || []).filter((r: any) => r.status === 'awaiting_approval').length}</Badge>
                  </h3>
                  <div className="space-y-3">
                    {(registrations || []).filter((r: any) => r.status === 'awaiting_approval').map((r: any) => (
                      <div key={r.id} className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl" data-testid={`application-${r.id}`}>
                        <Avatar className="w-10 h-10"><AvatarImage src={r.vendorAvatar || ""} /><AvatarFallback><User className="w-4 h-4" /></AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{r.vendorName || "Vendor"}</p>
                          <p className="text-xs text-muted-foreground">Applied {format(new Date(r.createdAt), 'MMM d, h:mm a')}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl gap-1.5 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => rejectApplication.mutate(r.id)}
                            disabled={rejectApplication.isPending}
                            data-testid={`button-reject-${r.id}`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />Decline
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => approveApplication.mutate(r.id)}
                            disabled={approveApplication.isPending}
                            data-testid={`button-approve-${r.id}`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmed registrations */}
              <div>
                {canManageEvent && isFormReg && <h3 className="text-base font-semibold mb-3">Confirmed Vendors</h3>}
                {(registrations || []).filter((r: any) => r.status !== 'awaiting_approval').length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-2xl border border-dashed">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-muted-foreground">No vendors registered yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(registrations || []).filter((r: any) => r.status !== 'awaiting_approval').map((r: any) => (
                      <div key={r.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50 shadow-sm" data-testid={`registration-${r.id}`}>
                        <Avatar className="w-10 h-10"><AvatarImage src={r.vendorAvatar || ""} /><AvatarFallback><User className="w-4 h-4" /></AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{r.vendorName || "Vendor"}</p>
                          {r.spotName && <p className="text-sm text-muted-foreground">Spot: {r.spotName}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {r.amountCents > 0 && <p className="text-sm font-medium">${(r.amountCents / 100).toFixed(2)}</p>}
                        </div>
                        <Badge
                          variant={r.status === 'paid' || r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : r.status === 'canceled' ? 'destructive' : 'outline'}
                          className={r.status === 'paid' || r.status === 'approved' ? 'bg-green-500' : ''}
                        >
                          {r.status === 'paid' ? 'Paid' : r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Declined' : r.status === 'canceled' ? 'Canceled' : r.status}
                        </Badge>
                        {r.isPro && <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs gap-1"><Crown className="w-3 h-3" />Pro</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {hasEventMap && (
          <TabsContent value="map" className="mt-0">
            <div className="bg-card rounded-2xl border border-border/50 p-6">
              <h3 className="font-bold text-lg mb-4">Vendor Layout Map</h3>
              <EventMapEditor eventId={eventId} readOnly={true} registrations={registrations || []} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Apply for Space Dialog (form-based events) */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />Apply for a Vendor Space
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="bg-muted/60 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">Step 1 — Complete the application form</p>
              <p className="text-sm text-muted-foreground">The event organizer requires all vendors to fill out an application form before registering.</p>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2 mt-1"
                onClick={() => window.open(regUrl!, '_blank')}
                data-testid="button-open-application-form"
              >
                <ExternalLink className="w-4 h-4" />Open Application Form
              </Button>
            </div>
            <div className="bg-muted/60 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">Step 2 — Submit your application on VendorGrid</p>
              <p className="text-sm text-muted-foreground">Once you've completed the form, click below. The event owner will review and approve your application.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={() => registerSpace({}, { onSuccess: () => { setApplyDialogOpen(false); } })}
                disabled={isRegistering}
                data-testid="button-submit-application"
              >
                {isRegistering ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><CheckCircle className="w-4 h-4" />I've Completed the Form</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Photo Dialog */}
      <Dialog open={addPhotoDialogOpen} onOpenChange={open => { setAddPhotoDialogOpen(open); if (!open) setAddPhotoUrl(""); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-display">Add a Photo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{allImages_count()} of {maxPhotos} photos used.</p>
          <div className="space-y-3 mt-2">
            <ImageUpload
              value={addPhotoUrl}
              onChange={setAddPhotoUrl}
              data-testid="input-photo-url"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setAddPhotoDialogOpen(false); setAddPhotoUrl(""); }}>Cancel</Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={!addPhotoUrl.trim() || isUpdatingImages}
                onClick={handleAddPhoto}
                data-testid="button-confirm-add-photo"
              >
                {isUpdatingImages ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Add Photo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function allImages_count() {
    if (!myPost) return 0;
    const postImages: string[] = myPost.imageUrls || [];
    const all: string[] = [...(myPost.imageUrl ? [myPost.imageUrl] : []), ...postImages.filter((u: string) => u !== myPost.imageUrl)];
    return all.length;
  }
}
