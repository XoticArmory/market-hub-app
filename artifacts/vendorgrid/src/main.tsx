import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAppRefresh } from "./lib/app-refresh";
import { trackSubscribedReturn } from "./lib/meta-pixel";
import { queryClient } from "./lib/queryClient";

installAppRefresh({
  serviceWorkerUrl: import.meta.env.PROD ? `${import.meta.env.BASE_URL}sw.js` : undefined,
  onResume: () => { void queryClient.invalidateQueries(); },
});

// Fires a Meta Pixel StartTrial event when returning from a completed Pro
// checkout (?subscribed=vendor_pro); no-op on every other page load.
trackSubscribedReturn();

createRoot(document.getElementById("root")!).render(<App />);
