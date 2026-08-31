import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  UserPlus,
  AlertCircle,
} from "lucide-react";

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Панель керування UkrTradeHub",
  robots: {
    index: false,
    follow: false,
  },
};

async function getDashboardData() {
  const [
    usersCount,
    sellersCount,
    productsCount,
    ordersCount,
    pendingApplicationsCount,
    recentUsers,
    recentOrders,
  ] = await Promise.all([
    db.user.count(),

    db.shop.count(),

    db.product.count(),

    db.order.count(),

    db.sellerApplication.count({
      where: {
        status: "PENDING",
      },
    }),

    db.user.findMany({
      take: 6,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),

    db.order.findMany({
      take: 6,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    usersCount,
    sellersCount,
    productsCount,
    ordersCount,
    pendingApplicationsCount,
    recentUsers,
    recentOrders,
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 2,
  }).format(number);
}

function getRoleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Адмін";
    case "SELLER":
      return "Продавець";
    case "CUSTOMER":
      return "Покупець";
    default:
      return role;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активний";
    case "BLOCKED":
      return "Заблокований";
    case "SUSPENDED":
      return "Призупинений";
    default:
      return status;
  }
}

function getOrderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";
    case "CONFIRMED":
      return "Підтверджено";
    case "PROCESSING":
      return "Обробляється";
    case "SHIPPED":
      return "Відправлено";
    case "DELIVERED":
      return "Доставлено";
    case "CANCELLED":
      return "Скасовано";
    case "COMPLETED":
      return "Завершено";
    default:
      return status;
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Users;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.07] bg-[#0b1018] p-5 transition hover:border-amber-400/20 hover:bg-[#0d131d]"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
          <Icon className="h-5 w-5" />
        </div>

        <ArrowRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-amber-400" />
      </div>

      <div className="mt-5">
        <div className="text-3xl font-black tracking-tight text-white">
          {value.toLocaleString("uk-UA")}
        </div>

        <div className="mt-1 text-sm font-bold text-zinc-300">
          {title}
        </div>

        <div className="mt-1 text-xs text-zinc-600">
          {description}
        </div>
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="min-h-full bg-[#070a10] p-4 text-white sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-400">
            <BarChart3 className="h-4 w-4" />
            Administration
          </div>

          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Загальний стан маркетплейсу UkrTradeHub
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-2 text-xs font-semibold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Система працює
        </div>
      </div>

      {/* QUICK ACTIONS */}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction
          href="/admin/products"
          icon={Package}
          label="Товари"
        />

        <QuickAction
          href="/admin/orders"
          icon={ClipboardList}
          label="Замовлення"
        />

        <QuickAction
          href="/admin/sellers"
          icon={Store}
          label="Продавці"
        />

        <QuickAction
          href="/admin/users"
          icon={Users}
          label="Користувачі"
        />
      </section>

      {/* STATS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Користувачі"
          value={data.usersCount}
          description="Усього зареєстровано"
          icon={Users}
          href="/admin/users"
        />

        <StatCard
          title="Продавці"
          value={data.sellersCount}
          description="Магазини на платформі"
          icon={Store}
          href="/admin/sellers"
        />

        <StatCard
          title="Товари"
          value={data.productsCount}
          description="Товарів у каталозі"
          icon={Package}
          href="/admin/products"
        />

        <StatCard
          title="Замовлення"
          value={data.ordersCount}
          description="Усього замовлень"
          icon={ShoppingBag}
          href="/admin/orders"
        />
      </section>

      {/* APPLICATIONS */}

      <section className="mt-6">
        <Link
          href="/admin/sellers/applications"
          className="group flex flex-col gap-4 rounded-2xl border border-amber-400/10 bg-gradient-to-r from-amber-400/[0.08] to-transparent p-5 transition hover:border-amber-400/20 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <div className="text-sm font-black text-white">
                Заявки продавців
              </div>

              <div className="mt-1 text-xs text-zinc-600">
                Перевірте нові заявки на підключення до маркетплейсу
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black">
              {data.pendingApplicationsCount}
            </span>

            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-amber-400" />
          </div>
        </Link>
      </section>

      {/* CONTENT GRID */}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* RECENT ORDERS */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1018]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-white">
                Останні замовлення
              </h2>

              <p className="mt-1 text-xs text-zinc-600">
                Останні операції платформи
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs font-bold text-amber-400 transition hover:text-amber-300"
            >
              Усі
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              text="Замовлень поки немає"
            />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.025]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-500">
                    <ShoppingBag className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      #{order.id.slice(-8)}
                    </div>

                    <div className="mt-1 text-xs text-zinc-600">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {formatMoney(order.total)}
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-600">
                      {getOrderStatusLabel(order.status)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RECENT USERS */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1018]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-white">
                Нові користувачі
              </h2>

              <p className="mt-1 text-xs text-zinc-600">
                Останні реєстрації
              </p>
            </div>

            <Link
              href="/admin/users"
              className="flex items-center gap-1 text-xs font-bold text-amber-400 transition hover:text-amber-300"
            >
              Усі
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              text="Користувачів поки немає"
            />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {data.recentUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/[0.025]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xs font-black text-black">
                    {(user.name || user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {user.name || "Без імені"}
                    </div>

                    <div className="mt-0.5 truncate text-xs text-zinc-600">
                      {user.email}
                    </div>
                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="text-[11px] font-bold text-zinc-400">
                      {getRoleLabel(user.role)}
                    </div>

                    <div className="mt-1 text-[10px] text-zinc-700">
                      {getStatusLabel(user.status)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BOTTOM INFO */}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={TrendingUp}
          title="Аналітика"
          description="Перегляд статистики продажів та активності."
          href="/admin/analytics"
        />

        <InfoCard
          icon={ShieldCheck}
          title="Модерація"
          description="Контроль товарів, відгуків та скарг."
          href="/admin/moderation/products"
        />

        <InfoCard
          icon={AlertCircle}
          title="Журнал дій"
          description="Контроль адміністративних операцій."
          href="/admin/audit-logs"
        />
      </section>
    </main>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs font-bold text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-white"
    >
      <Icon className="h-4 w-4 text-zinc-600" />
      {label}
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: typeof Package;
  text: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-700">
        <Icon className="h-5 w-5" />
      </div>

      <div className="mt-3 text-xs text-zinc-600">
        {text}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Package;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.07] bg-[#0b1018] p-5 transition hover:border-amber-400/20"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-500 transition group-hover:bg-amber-400/10 group-hover:text-amber-400">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-sm font-black text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </Link>
  );
}
