import React, { createContext, useContext, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_OPEN_KEY = "visionm-sidebar-open";
const SIDEBAR_COLLAPSED_KEY = "visionm-sidebar-collapsed";

/**
 * isOpen means "expanded" on desktop (remembered in this browser) and "menu showing" on phones,
 * where it starts closed on every page load and is never saved.
 */
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SIDEBAR_OPEN_KEY);
    return stored !== null ? stored === "true" : true;
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored !== null ? stored === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(desktopOpen));
  }, [desktopOpen]);

  // Moving to phone size starts with the menu closed
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [isMobile]);

  const isOpen = isMobile ? mobileOpen : desktopOpen;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((prev) => !prev);
    else setDesktopOpen((prev) => !prev);
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, isCollapsed, toggleSidebar, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
};


