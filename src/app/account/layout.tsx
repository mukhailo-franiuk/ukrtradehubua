import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  MapPin,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const navItems = [
    {
      href: "/account",
      label: "Огляд",
      icon: LayoutDashboard,
    },
    {
      href: "/account/orders",
      label: "Замовлення",
      icon: ShoppingBag,
    },
    {
      href: "/account/addresses",
      label: "Адреси доставки",
      icon: MapPin,
    },
    {
      href: "/account/settings",
      label: "Налаштування",
      icon: User,
    },
  ];

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
              {/* USER */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                  <User className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="truncate font-semibold text-zinc-100">
                    {user.name ?? user.email}
                  </div>

                  <div className="truncate text-xs text-zinc-500">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* NAVIGATION */}
              <nav className="mt-6 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <Icon className="h-4 w-4 shrink-0 transition group-hover:text-amber-400" />

                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* CONTENT */}
          <div className="min-w-0">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}