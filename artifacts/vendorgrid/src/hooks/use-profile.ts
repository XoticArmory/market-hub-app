import { useQuery, useMutation, useQueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { AdminPreviewContext, PREVIEW_OVERRIDES } from "@/contexts/admin-preview";

export function useRealProfile() {
  return useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    retry: false,
  });
}

export function useProfile() {
  const { previewTier } = useContext(AdminPreviewContext);
  const query = useRealProfile();

  if (previewTier && query.data?.profile?.isAdmin) {
    const overrides = PREVIEW_OVERRIDES[previewTier] ?? {};
    return {
      ...query,
      data: query.data
        ? { ...query.data, profile: { ...query.data.profile, ...overrides } }
        : null,
    } as typeof query;
  }

  return query;
}

export function useProfileById(userId: string | undefined) {
  return useQuery({
    queryKey: ["/api/profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/profile/${userId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
