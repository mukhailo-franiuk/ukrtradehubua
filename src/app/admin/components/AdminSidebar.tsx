
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ElementType } from "react";

import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Flag,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  Tags,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  href: string;
  icon: ElementType;
  badge?: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const sections: MenuSection[] = [
  {
    title: "Головне",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Магазин UkrTradeHub",
        href: "/admin/marketplace-shop",
        icon: Store,
      },
    ],
  },

  {
    title: "Marketplace",
    items: [
      {
        label: "Замовлення",
        href: "/admin/orders",
        icon: ClipboardList,
      },
      {
        label: "Товари",
        href: "/admin/products",
        icon: Package,
      },
      {
        label: "Категорії",
        href: "/admin/categories",
        icon: FolderTree,
      },
      {
        label: "Продавці",
        href: "/admin/sellers",
        icon: Store,
      },
      {
        label: "Заявки продавців",
        href: "/admin/sellers/applications",
        icon: ShieldCheck,
        badge: "0",
      },
      {
        label: "Користувачі",
        href: "/admin/users",
        icon: Users,
      },
    ],
  },

  {
    title: "Модерація",
    items: [
      {
        label: "Модерація товарів",
        href: "/admin/moderation/products",
        icon: ShieldCheck,
      },
      {
        label: "Відгуки",
        href: "/admin/reviews",
        icon: FileText,
      },
      {
        label: "Скарги",
        href: "/admin/reports",
        icon: Flag,
      },
      {
        label: "Блокування",
        href: "/admin/moderation/blocks",
        icon: ShieldAlert,
      },
    ],
  },

  {
    title: "Фінанси",
    items: [
      {
        label: "Платежі",
        href: "/admin/payments",
        icon: CircleDollarSign,
      },
      {
        label: "Виплати",
        href: "/admin/payouts",
        icon: Wallet,
      },
      {
        label: "Комісії",
        href: "/admin/commissions",
        icon: Tags,
      },
    ],
  },

  {
    title: "Маркетинг",
    items: [
      {
        label: "Промоції",
        href: "/admin/promotions",
        icon: Megaphone,
      },
      {
        label: "Банери",
        href: "/admin/banners",
        icon: Boxes,
      },
      {
        label: "Купони",
        href: "/admin/coupons",
        icon: Tags,
      },
    ],
  },

  {
    title: "Аналітика",
    items: [
      {
        label: "Аналітика",
        href: "/admin/analytics",
        icon: BarChart3,
      },
      {
        label: "Продажі",
        href: "/admin/analytics/sales",
        icon: Activity,
      },
    ],
  },

  {
    title: "Система",
    items: [
      {
        label: "Сповіщення",
        href: "/admin/notifications",
        icon: Bell,
      },
      {
        label: "Журнал дій",
        href: "/admin/audit-logs",
        icon: FileText,
      },
      {
        label: "Адміністратори",
        href: "/admin/administrators",
        icon: UserCog,
      },
      {
        label: "Налаштування",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

/* =========================================================
   ACTIVE ROUTE
========================================================= */

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

export default function AdminSidebar({
  open,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    try {
      const response = await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        console.error(
          "Logout failed:",
          response.status
        );

        return;
      }

      onClose();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  return (
    <>
      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {open && (
        <button
          type="button"
          aria-label="Закрити меню"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col",
          "border-r border-white/[0.07]",
          "bg-[#090d14]",
          "transition-transform duration-300",
          "lg:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black shadow-lg shadow-amber-400/10">
              <Boxes className="h-5 w-5" />
            </div>

            <div>
              <div className="text-sm font-black tracking-tight text-white">
                Ukr
                <span className="text-amber-400">
                  Trade
                </span>
                Hub
              </div>

              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                Administration
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити меню"
            className="rounded-lg p-2 text-zinc-600 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =================================================
            ADMIN PROFILE
        ================================================= */}

        <div className="shrink-0 border-b border-white/[0.07] p-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-black">
              A
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">
                Адміністратор
              </div>

              <div className="mt-0.5 truncate text-[11px] text-zinc-600">
                admin@ukrtradehub.com
              </div>
            </div>

            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          </div>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div
              key={section.title}
              className="mb-7 last:mb-2"
            >
              <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700">
                {section.title}
              </div>

              <nav className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(
                    pathname,
                    item.href
                  );

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={[
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5",
                        "text-sm font-semibold transition-all",
                        active
                          ? "bg-amber-400 text-black shadow-lg shadow-amber-400/10"
                          : "text-zinc-500 hover:bg-white/[0.045] hover:text-white",
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "h-[18px] w-[18px] shrink-0 transition",
                          active
                            ? "text-black"
                            : "text-zinc-600 group-hover:text-amber-400",
                        ].join(" ")}
                      />

                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>

                      {/* BADGE */}

                      {item.badge && (
                        <span
                          className={[
                            "min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[9px] font-black",
                            active
                              ? "bg-black/10 text-black"
                              : "bg-amber-400/10 text-amber-400",
                          ].join(" ")}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* ARROW */}

                      {!item.badge && (
                        <ChevronRight
                          className={[
                            "h-3.5 w-3.5 opacity-0 transition",
                            "group-hover:translate-x-0.5 group-hover:opacity-100",
                            active
                              ? "text-black opacity-100"
                              : "text-zinc-700",
                          ].join(" ")}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-red-500/[0.07] hover:text-red-400"
          >
            <LogOut className="h-[18px] w-[18px] transition group-hover:text-red-400" />

            <span>
              Вийти з адмін-панелі
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
