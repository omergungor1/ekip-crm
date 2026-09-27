"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Settings,
  SquareKanban,
  Users,
  X,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

const ICONS = {
  LayoutDashboard,
  SquareKanban,
  FolderKanban,
  Building2,
  CreditCard,
  LayoutTemplate,
  Megaphone,
  Users,
};

export default function AppSidebar({ collapsed, mobileOpen, onNavigate }) {
  const pathname = usePathname();

  function active(href) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 lg:hidden ${mobileOpen ? "block" : "hidden"}`}
        onClick={onNavigate}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-white transition-all ${
          collapsed ? "lg:w-[76px]" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} w-72 lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={onNavigate}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-sm font-semibold text-white">
              E
            </span>
            <span className={`truncate text-base font-semibold ${collapsed ? "lg:hidden" : ""}`}>
              Ekip
            </span>
          </Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl lg:hidden" onClick={onNavigate}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const isActive = active(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                  isActive ? "bg-accent-soft text-accent" : "text-zinc-600 hover:bg-zinc-50"
                } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <Link
            href="/settings"
            onClick={onNavigate}
            title="Ayarlar"
            className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
              active("/settings") ? "bg-accent-soft text-accent" : "text-zinc-600 hover:bg-zinc-50"
            } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Ayarlar</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
