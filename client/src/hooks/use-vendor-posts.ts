import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { VendorPostResponse, CreateVendorPostRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useVendorPosts(eventId: number) {
  return useQuery({
    queryKey: [api.vendorPosts.listByEvent.path, eventId],
    queryFn: async () => {
      const url = buildUrl(api.vendorPosts.listByEvent.path, { eventId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vendor posts");
      return (await res.json()) as VendorPostResponse[];
    },
    enabled: !!eventId && !isNaN(eventId),
  });
}

export function useCreateVendorPost(eventId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<CreateVendorPostRequest, "eventId">) => {
      const url = buildUrl(api.vendorPosts.create.path, { eventId });
      const res = await fetch(url, {
        method: api.vendorPosts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to post.");
        const error = await res.json();
        throw new Error(error.message || "Failed to create post");
      }
      return (await res.json()) as VendorPostResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vendorPosts.listByEvent.path, eventId] });
      toast({
        title: "Post added!",
        description: "Your items have been listed for this event.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
