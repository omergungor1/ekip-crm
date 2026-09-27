"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, PanelLeft, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSocialProject } from "@/components/layout/SocialProjectContext";
import UserAvatar from "@/components/ui/UserAvatar";

export default function AppHeader({ profile, onMenu, collapsed, onToggleCollapse }) {
  const router = useRouter();
  const pathname = usePathname();
  const { projectId, setProjectId, projects } = useSocialProject();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = profile.full_name || profile.username;
  const socialPage = pathname === "/sosyal-medya" || pathname.startsWith("/sosyal-medya/");

  async function logout() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-xl border border-line lg:hidden"
          onClick={onMenu}
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="hidden h-11 w-11 place-items-center rounded-xl border border-line lg:grid"
          onClick={onToggleCollapse}
          aria-label="Kenar çubuğunu daralt"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>
      {socialPage ? (
        <div className="min-w-0 flex-1">
          <select
            aria-label="Proje"
            className="h-11 w-full max-w-sm rounded-xl border border-line bg-white px-3 text-sm outline-none ring-accent/15 focus:border-accent focus:ring-4"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">Proje seç</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-line text-zinc-600 hover:bg-zinc-50"
          aria-label="Hesap"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <User className="h-4 w-4" />
        </button>
        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Kapat"
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-line bg-white p-3 shadow-lg"
            >
              <div className="flex items-center gap-3 px-1">
                <UserAvatar name={name} url={profile.avatar_url} />
                <div className="min-w-0 truncate text-sm font-medium">@{profile.username}</div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                Çıkış yap
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
