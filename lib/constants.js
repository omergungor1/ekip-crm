export const EMAIL_DOMAIN = "ekip.com";

export const ROLES = [
  { id: "admin", label: "Yönetici" },
  { id: "member", label: "Üye" },
  { id: "freelancer", label: "Freelancer" },
];

export const TASK_STATUSES = [
  { id: "todo", label: "Yapılacak" },
  { id: "in_progress", label: "Devam Ediyor" },
  { id: "review", label: "Kontrol" },
  { id: "done", label: "Tamamlandı" },
];

export const PRIORITIES = [
  { id: "low", label: "Düşük" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "Yüksek" },
  { id: "urgent", label: "Acil" },
];

export const PROJECT_STATUSES = [
  { id: "planning", label: "Planlama" },
  { id: "active", label: "Aktif" },
  { id: "development", label: "Geliştirme" },
  { id: "testing", label: "Test" },
  { id: "on_hold", label: "Beklemede" },
  { id: "completed", label: "Tamamlandı" },
  { id: "archived", label: "Arşiv" },
];

export const CUSTOMER_STATUSES = [
  { id: "lead", label: "Aday" },
  { id: "active", label: "Aktif" },
  { id: "inactive", label: "Pasif" },
];

export const SUBSCRIPTION_STATUSES = [
  { id: "trial", label: "Deneme" },
  { id: "active", label: "Aktif" },
  { id: "payment_pending", label: "Ödeme Bekliyor" },
  { id: "paused", label: "Donduruldu" },
  { id: "cancelled", label: "İptal" },
];

export const GOAL_STATUSES = [
  { id: "in_progress", label: "Devam Ediyor" },
  { id: "completed", label: "Tamamlandı" },
  { id: "cancelled", label: "İptal" },
];

export const CURRENCIES = ["TRY", "USD", "EUR"];

export const PROJECT_COLORS = [
  "#3b5bfd",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#0369a1",
  "#3f6212",
  "#44403c",
];

export const NAV_ITEMS = [
  { href: "/", label: "Ana Sayfa", icon: "LayoutDashboard" },
  { href: "/tasks", label: "İşler", icon: "SquareKanban" },
  { href: "/projects", label: "Projeler", icon: "FolderKanban" },
  { href: "/customers", label: "Müşteriler", icon: "Building2" },
  { href: "/subscriptions", label: "Abonelikler", icon: "CreditCard" },
  { href: "/team", label: "Ekip", icon: "Users" },
  { href: "/sosyal-medya", label: "Sosyal Medya", icon: "Megaphone" },
  { href: "/sablon", label: "Açık Şablon", icon: "LayoutTemplate" },
];

export function labelOf(list, id) {
  return list.find((item) => item.id === id)?.label || id || "—";
}

export function canManage(profile) {
  return profile?.role === "admin" || profile?.role === "member";
}
