import { useQuery } from "@tanstack/react-query";

export function useOwnerAnalytics(userId: string | undefined) {
  return useQuery({
    queryKey: ["/api/admin/analytics", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/admin/analytics/${userId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });
}
