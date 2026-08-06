import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// When a new service worker takes control (after an update is deployed),
// reload the page so users get the latest version automatically.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
