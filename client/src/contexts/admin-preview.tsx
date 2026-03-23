import { createContext, useContext, useState, ReactNode } from "react";

export type PreviewTier = "admin" | "event_owner_pro" | "vendor_pro" | "free" | null;

interface AdminPreviewContextType {
  previewTier: PreviewTier;
  setPreviewTier: (tier: PreviewTier) => void;
}

export const AdminPreviewContext = createContext<AdminPreviewContextType>({
  previewTier: null,
  setPreviewTier: () => {},
});

export function AdminPreviewProvider({ children }: { children: ReactNode }) {
  const [previewTier, setPreviewTier] = useState<PreviewTier>(null);
  return (
    <AdminPreviewContext.Provider value={{ previewTier, setPreviewTier }}>
      {children}
    </AdminPreviewContext.Provider>
  );
}

export function useAdminPreview() {
  return useContext(AdminPreviewContext);
}

export const PREVIEW_OVERRIDES: Record<string, Partial<any>> = {
  admin: { isAdmin: true, subscriptionTier: "event_owner_pro", subscriptionStatus: "active", profileType: "event_owner" },
  event_owner_pro: { isAdmin: false, subscriptionTier: "event_owner_pro", subscriptionStatus: "active", profileType: "event_owner" },
  vendor_pro: { isAdmin: false, subscriptionTier: "vendor_pro", subscriptionStatus: "active", profileType: "vendor" },
  free: { isAdmin: false, subscriptionTier: "free", subscriptionStatus: "inactive", profileType: "general" },
};
