import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { logDeriverChecks } from "./core/verify.ts";

// check the derivers in dev - the result is in the console.
if (import.meta.env.DEV) {
  logDeriverChecks();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
