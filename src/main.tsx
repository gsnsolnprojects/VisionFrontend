import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { applyColorTheme, getCachedColorTheme } from "@/lib/colorTheme";

// Initialize theme on app startup
const initTheme = () => {
  if (typeof window === "undefined") return;
  // Colour palette (Vision / Classic) — last choice on this device until the profile loads
  applyColorTheme(getCachedColorTheme());
  const stored = localStorage.getItem("visionm-theme");
  const theme = stored === "dark" ? "dark" : "light";
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {/* This renders all toast notifications from useToast() */}
    <Toaster />
  </StrictMode>
);
