import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAppRefresh } from "./lib/app-refresh";
import { queryClient } from "./lib/queryClient";

installAppRefresh({
  serviceWorkerUrl: import.meta.env.PROD ? `${import.meta.env.BASE_URL}sw.js` : undefined,
  onResume: () => { void queryClient.invalidateQueries(); },
});

createRoot(document.getElementById("root")!).render(<App />);
