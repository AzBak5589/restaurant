"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Grid3X3,
  CalendarClock,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Heart,
  QrCode,
  LogOut,
  ChefHat,
  Settings,
  BookOpen,
  Activity,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";

const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "WAITER",
  "CHEF",
  "BARTENDER",
];
const MANAGEMENT = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

const navItems = [
  {
    href: "/dashboard",
    labelKey: "nav.dashboard" as TranslationKey,
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    href: "/orders",
    labelKey: "nav.orders" as TranslationKey,
    icon: ClipboardList,
    roles: ALL_ROLES,
  },
  {
    href: "/tables",
    labelKey: "nav.tables" as TranslationKey,
    icon: Grid3X3,
    roles: [...MANAGEMENT, "CASHIER", "WAITER"],
  },
  {
    href: "/menu",
    labelKey: "nav.menu" as TranslationKey,
    icon: UtensilsCrossed,
    roles: [...MANAGEMENT, "CHEF", "BARTENDER"],
  },
  {
    href: "/reservations",
    labelKey: "nav.reservations" as TranslationKey,
    icon: CalendarClock,
    roles: [...MANAGEMENT, "WAITER"],
  },
  {
    href: "/staff",
    labelKey: "nav.staff" as TranslationKey,
    icon: Users,
    roles: MANAGEMENT,
  },
  {
    href: "/inventory",
    labelKey: "nav.inventory" as TranslationKey,
    icon: Package,
    roles: [...MANAGEMENT, "CHEF"],
  },
  {
    href: "/recipes",
    labelKey: "nav.recipes" as TranslationKey,
    icon: BookOpen,
    roles: [...MANAGEMENT, "CHEF"],
  },
  {
    href: "/payments",
    labelKey: "nav.payments" as TranslationKey,
    icon: CreditCard,
    roles: [...MANAGEMENT, "CASHIER"],
  },
  {
    href: "/reports",
    labelKey: "nav.reports" as TranslationKey,
    icon: BarChart3,
    roles: MANAGEMENT,
  },
  {
    href: "/customers",
    labelKey: "nav.customers" as TranslationKey,
    icon: Heart,
    roles: [...MANAGEMENT, "CASHIER"],
  },
  {
    href: "/qr-codes",
    labelKey: "nav.qrCodes" as TranslationKey,
    icon: QrCode,
    roles: MANAGEMENT,
  },
  {
    href: "/activity",
    labelKey: "nav.activity" as TranslationKey,
    icon: Activity,
    roles: MANAGEMENT,
  },
  {
    href: "/settings",
    labelKey: "nav.settings" as TranslationKey,
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/super-admin",
    labelKey: "nav.superAdmin" as TranslationKey,
    icon: Shield,
    roles: ["SUPER_ADMIN"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const roleKey = user?.role
    ? (`staff.${user.role}` as TranslationKey)
    : undefined;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems
          .filter((item) => !user?.role || item.roles.includes(user.role))
          .map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}
      </nav>
      <Separator />
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {roleKey ? t(roleKey) : user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {t("auth.logout")}
        </Button>
      </div>
      <div className="border-t px-3 py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          {t("auth.poweredBy")}
        </p>
        <p className="text-[10px] text-muted-foreground">
          sinbak0@outlook.fr · +225 0141152544
        </p>
      </div>
    </aside>
  );
}
