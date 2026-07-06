import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { installDemoApi, isDemoMode } from "./utils/demoApi";

if (isDemoMode) {
  installDemoApi();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
