import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { organizerActions } from "@/lib/organizer-flow";

export function useOrganizerActions(plan: "monthly" | "annual" = "monthly") {
  const { isAuthenticated, isLoading } = useAuth();
  const { data, isLoading: isProfileLoading } = useProfile();
  const profile = data?.profile;
  const hasPro = profile?.isAdmin === true ||
    (profile?.subscriptionStatus === "active" &&
      (profile.subscriptionTier === "vendor_pro" || profile.subscriptionTier === "event_owner_pro"));
  return {
    ...organizerActions(isAuthenticated, hasPro, plan),
    actionsReady: !isLoading && (!isAuthenticated || !isProfileLoading),
  };
}
