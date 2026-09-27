"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { startRequest } from "@/lib/load";

const ProfileContext = createContext(null);

export function useProfile() {
  return useContext(ProfileContext);
}

export default function AppShell({ profile, children }) {
  const pathname = usePathname();
  const fullscreen = pathname === "/sablon" || pathname.startsWith("/sablon/");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    return startRequest(() => {
      const stored = window.localStorage.getItem("ekip-sidebar");
      if (stored === "collapsed") setCollapsed(true);
    });
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    function apply() {
      const offset = fullscreen ? "0px" : desktop.matches ? (collapsed ? "76px" : "256px") : "0px";
      document.documentElement.style.setProperty("--panel-offset", offset);
    }
    apply();
    desktop.addEventListener("change", apply);
    return () => desktop.removeEventListener("change", apply);
  }, [collapsed, fullscreen]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("ekip-sidebar", next ? "collapsed" : "open");
      return next;
    });
  }

  if (fullscreen) {
    return (
      <ProfileContext.Provider value={profile}>
        <div className="fixed inset-0 z-40 h-dvh overflow-hidden bg-white text-ink">{children}</div>
      </ProfileContext.Provider>
    );
  }

  return (
    <ProfileContext.Provider value={profile}>
      <div className="min-h-screen bg-canvas text-ink">
        <AppSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
        <div className={collapsed ? "lg:pl-[76px]" : "lg:pl-64"}>
          <AppHeader
            profile={profile}
            collapsed={collapsed}
            onMenu={() => setMobileOpen(true)}
            onToggleCollapse={toggleCollapsed}
          />
          <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ProfileContext.Provider>
  );
}
