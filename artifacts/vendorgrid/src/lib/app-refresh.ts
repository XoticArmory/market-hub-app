/**
 * Check for new code on entry/resume without reloading every visit. A full
 * reload is needed only when a new service worker replaces this page's code.
 */
export function installAppRefresh({
  serviceWorkerUrl,
  onResume,
}: {
  serviceWorkerUrl?: string;
  onResume: () => void;
}) {
  let registration: ServiceWorkerRegistration | undefined;
  let checking = false;
  let lastCheck = -Infinity;
  let reloadPending = false;
  let reloading = false;
  let retryReload: ReturnType<typeof setTimeout> | undefined;
  // A worker claiming a first-time visitor is not an application update.
  let hadController = !!navigator.serviceWorker?.controller;
  const dirtyForms = new Set<HTMLFormElement>();

  const canReload = () => {
    for (const form of dirtyForms) {
      if (!form.isConnected) dirtyForms.delete(form);
    }
    const active = document.activeElement;
    return dirtyForms.size === 0 &&
      !(active instanceof HTMLElement &&
        (active.matches("input, textarea, select") || active.isContentEditable));
  };

  const applyUpdate = () => {
    if (!reloadPending || reloading) return;
    if (!canReload()) {
      if (!retryReload) {
        retryReload = setTimeout(() => {
          retryReload = undefined;
          applyUpdate();
        }, 1000);
      }
      return;
    }
    reloading = true;
    window.location.reload();
  };

  const checkForUpdate = async () => {
    if (!serviceWorkerUrl || !("serviceWorker" in navigator) ||
      checking || !navigator.onLine) return;
    checking = true;
    try {
      if (!registration) {
        registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
          updateViaCache: "none",
        });
      }
      await registration.update();
    } catch (error) {
      // Keep the loaded app usable during connection/server failures.
      console.warn("VendorGrid update check failed; will retry on the next visit.", error);
    } finally {
      checking = false;
    }
  };

  const resume = () => {
    if (document.visibilityState === "hidden") return;
    // Focus, pageshow and visibilitychange can all fire for the same visit.
    if (Date.now() - lastCheck < 1000) return;
    lastCheck = Date.now();
    onResume();
    void checkForUpdate();
    applyUpdate();
  };

  const markDirty = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const form = target.closest("form");
      if (form) dirtyForms.add(form);
    }
  };
  const resetForm = (event: Event) => {
    if (event.target instanceof HTMLFormElement) dirtyForms.delete(event.target);
  };

  document.addEventListener("input", markDirty, true);
  document.addEventListener("change", markDirty, true);
  document.addEventListener("reset", resetForm, true);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("focus", resume);
  window.addEventListener("pageshow", resume);
  window.addEventListener("online", resume);
  // The native WebView dispatches this when the app returns to the foreground.
  window.addEventListener("vendorgrid:foreground", resume);

  if (serviceWorkerUrl && "serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) {
        reloadPending = true;
        applyUpdate();
      }
      hadController = true;
    });
    void checkForUpdate();
  }
}
