"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import TeamChat from "@/components/chat/TeamChat";
import AppHeader from "@/components/layout/AppHeader";
import AppSidebar from "@/components/layout/AppSidebar";
import { SocialProjectContext } from "@/components/layout/SocialProjectContext";
import { listProjects } from "@/lib/data";
import { errorMessage } from "@/lib/format";
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
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const socialPage = pathname === "/sosyal-medya" || pathname.startsWith("/sosyal-medya/");

  useEffect(() => {
    return startRequest(() => {
      const stored = window.localStorage.getItem("ekip-sidebar");
      if (stored === "collapsed") setCollapsed(true);
    });
  }, []);

  useEffect(() => {
    if (!socialPage) return undefined;
    return startRequest(async (isActive) => {
      try {
        const rows = await listProjects();
        if (!isActive()) return;
        setProjects(rows);
        const stored = window.localStorage.getItem("ekip-social-project") || "";
        setProjectId((current) => {
          if (current && rows.some((item) => item.id === current)) return current;
          return rows.some((item) => item.id === stored) ? stored : "";
        });
      } catch (error) {
        if (isActive()) toast.error(errorMessage(error, "Projeler yüklenemedi."));
      }
    });
  }, [socialPage]);

  function chooseProject(id) {
    setProjectId(id);
    if (id) window.localStorage.setItem("ekip-social-project", id);
    else window.localStorage.removeItem("ekip-social-project");
  }

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
        <TeamChat />
      </ProfileContext.Provider>
    );
  }

  return (
    <ProfileContext.Provider value={profile}>
      <SocialProjectContext.Provider value={{ projectId, setProjectId: chooseProject, projects }}>
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
          <TeamChat />
        </div>
      </SocialProjectContext.Provider>
    </ProfileContext.Provider>
  );
}
