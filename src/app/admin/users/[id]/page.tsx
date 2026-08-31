
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Activity,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  Mail,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Store,
  User,
  UserRound,
  Wallet,
  Bell,
} from "lucide-react";

import { db } from "@/lib/prisma";

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: {
      id,
    },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user) {
    return {
      title: "Користувача не знайдено | UkrTradeHub Admin",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${user.name || user.email} | Користувачі`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

function formatDate(date: Date | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Адміністратор";

    case "SELLER":
      return "Продавець";

    case "CUSTOMER":
      return "Покупець";

    default:
      return role;
  }
}

function statusLabel(status: string) {
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

function roleStyle(role: string) {
  switch (role) {
    case "ADMIN":
      return "border-purple-400/20 bg-purple-400/10 text-purple-300";

    case "SELLER":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";

    case "CUSTOMER":
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function statusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "BLOCKED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "SUSPENDED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

export default async function AdminUserPage({
  params,
}: UserPageProps) {
  const { id } = await params;

  /*
   * ВАЖЛИВО:
   *
   * Не завантажуємо customer/seller специфічні relation-и
   * окремими include без необхідності.
   *
   * Спочатку отримуємо користувача та адміністративно
   * безпечну базову інформацію.
   */

  const user = await db.user.findUnique({
    where: {
      id,
    },

    include: {
      _count: {
        select: {
          sessions: true,
          notifications: true,
          auditLogs: true,
          analyticsEvents: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  /*
   * CUSTOMER DATA
   *
   * Ці дані потрібні тільки покупцю.
   */
  const customerStats =
    user.role === "CUSTOMER"
      ? await db.user.findUnique({
          where: {
            id,
          },
          select: {
            _count: {
              select: {
                addresses: true,
                orders: true,
                productReviews: true,
                shopReviews: true,
                favorites: true,
                favoriteShops: true,
                payments: true,
                returnRequests: true,
                productViews: true,
                shopViews: true,
                couponUsages: true,
              },
            },
          },
        })
      : null;

  /*
   * SELLER DATA
   *
   * Магазин завантажуємо тільки для SELLER.
   */
  const sellerData =
    user.role === "SELLER"
      ? await db.shop.findUnique({
          where: {
            userId: id,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            sellerStatus: true,
            isActive: true,
            rating: true,
            productsCount: true,
            salesCount: true,
            ordersCount: true,
          },
        })
      : null;

  const initials = (user.name || user.email)
    .trim()
    .charAt(0)
    .toUpperCase();

  const totalReviews = customerStats
    ? customerStats._count.productReviews +
      customerStats._count.shopReviews
    : 0;

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6">
          <Link
            href="/admin/users"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до користувачів
          </Link>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-black shadow-lg shadow-amber-400/10">
                {initials}
              </div>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
                    {user.name || "Без імені"}
                  </h1>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${roleStyle(
                      user.role
                    )}`}
                  >
                    {roleLabel(user.role)}
                  </span>

                </div>

                <p className="mt-1 text-sm text-zinc-500">
                  {user.email}
                </p>

              </div>
            </div>

            <div className="flex flex-wrap gap-2">

              <span
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${statusStyle(
                  user.status
                )}`}
              >
                {user.status === "ACTIVE" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}

                {statusLabel(user.status)}
              </span>

              {user.isBlocked && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300">
                  <Ban className="h-4 w-4" />
                  Заблокований
                </span>
              )}

            </div>
          </div>
        </div>

        {/* CONTENT */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          <div className="space-y-6">

            {/* BASIC INFORMATION */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

              <div className="border-b border-white/[0.07] px-5 py-4">

                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Основна інформація
                  </h2>
                </div>

              </div>

              <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2">

                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Ім'я"
                  value={user.name || "Не вказано"}
                />

                <InfoItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={user.email}
                />

                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Телефон"
                  value={user.phone || "Не вказано"}
                />

                <InfoItem
                  icon={<Shield className="h-4 w-4" />}
                  label="Роль"
                  value={roleLabel(user.role)}
                />

                <InfoItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Статус"
                  value={statusLabel(user.status)}
                />

                <InfoItem
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Реєстрація"
                  value={formatDate(user.createdAt)}
                />

                <InfoItem
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Оновлено"
                  value={formatDate(user.updatedAt)}
                />

                <InfoItem
                  icon={<Activity className="h-4 w-4" />}
                  label="Останній вхід"
                  value={formatDate(user.lastLoginAt)}
                />

              </div>
            </section>

            {/* ================= CUSTOMER ================= */}

            {user.role === "CUSTOMER" && customerStats && (
              <>
                <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

                  <div className="border-b border-white/[0.07] px-5 py-4">

                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-amber-400" />

                      <h2 className="text-sm font-black">
                        Активність покупця
                      </h2>
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-3">

                    <StatCard
                      label="Замовлення"
                      value={customerStats._count.orders}
                      icon={
                        <ShoppingBag className="h-5 w-5" />
                      }
                    />

                    <StatCard
                      label="Відгуки"
                      value={totalReviews}
                      icon={
                        <FileText className="h-5 w-5" />
                      }
                    />

                    <StatCard
                      label="Адреси"
                      value={customerStats._count.addresses}
                      icon={
                        <MapPin className="h-5 w-5" />
                      }
                    />

                    <StatCard
                      label="Обране"
                      value={customerStats._count.favorites}
                      icon={
                        <Heart className="h-5 w-5" />
                      }
                    />

                    <StatCard
                      label="Платежі"
                      value={customerStats._count.payments}
                      icon={
                        <Wallet className="h-5 w-5" />
                      }
                    />

                    <StatCard
                      label="Повернення"
                      value={customerStats._count.returnRequests}
                      icon={
                        <RotateCcw className="h-5 w-5" />
                      }
                    />

                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

                  <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    Додаткова активність
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">

                    <ActivityRow
                      icon={<Heart className="h-4 w-4" />}
                      label="Обрані магазини"
                      value={customerStats._count.favoriteShops}
                    />

                    <ActivityRow
                      icon={<Package className="h-4 w-4" />}
                      label="Перегляди товарів"
                      value={customerStats._count.productViews}
                    />

                    <ActivityRow
                      icon={<Store className="h-4 w-4" />}
                      label="Перегляди магазинів"
                      value={customerStats._count.shopViews}
                    />

                    <ActivityRow
                      icon={<Wallet className="h-4 w-4" />}
                      label="Використані купони"
                      value={customerStats._count.couponUsages}
                    />

                  </div>
                </section>
              </>
            )}

            {/* ================= SELLER ================= */}

            {user.role === "SELLER" && (
              <>
                {sellerData ? (
                  <>

                    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

                      <div className="border-b border-white/[0.07] px-5 py-4">

                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-amber-400" />

                          <h2 className="text-sm font-black">
                            Магазин продавця
                          </h2>
                        </div>

                      </div>

                      <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2">

                        <InfoItem
                          icon={<Store className="h-4 w-4" />}
                          label="Назва магазину"
                          value={sellerData.name}
                        />

                        <InfoItem
                          label="Slug"
                          value={sellerData.slug}
                        />

                        <InfoItem
                          label="Статус продавця"
                          value={sellerData.sellerStatus}
                        />

                        <InfoItem
                          label="Магазин активний"
                          value={
                            sellerData.isActive
                              ? "Так"
                              : "Ні"
                          }
                        />

                        <InfoItem
                          label="Рейтинг"
                          value={String(sellerData.rating)}
                        />

                        <InfoItem
                          label="Товарів"
                          value={sellerData.productsCount.toLocaleString(
                            "uk-UA"
                          )}
                        />

                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

                      <div className="border-b border-white/[0.07] px-5 py-4">

                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-amber-400" />

                          <h2 className="text-sm font-black">
                            Статистика продавця
                          </h2>
                        </div>

                      </div>

                      <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-3">

                        <StatCard
                          label="Товари"
                          value={sellerData.productsCount}
                          icon={
                            <Package className="h-5 w-5" />
                          }
                        />

                        <StatCard
                          label="Продажі"
                          value={sellerData.salesCount}
                          icon={
                            <Wallet className="h-5 w-5" />
                          }
                        />

                        <StatCard
                          label="Замовлення"
                          value={sellerData.ordersCount}
                          icon={
                            <ShoppingBag className="h-5 w-5" />
                          }
                        />

                      </div>
                    </section>

                  </>
                ) : (
                  <section className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.04] p-5">

                    <div className="flex items-center gap-3 text-orange-300">

                      <ShieldAlert className="h-5 w-5" />

                      <div>
                        <div className="text-sm font-bold">
                          Магазин не знайдено
                        </div>

                        <div className="mt-1 text-xs text-orange-300/60">
                          Користувач має роль продавця, але магазин
                          відсутній.
                        </div>
                      </div>

                    </div>

                  </section>
                )}
              </>
            )}

            {/* ================= ADMIN ================= */}

            {user.role === "ADMIN" && (
              <section className="overflow-hidden rounded-2xl border border-purple-400/10 bg-[#0b0f16]">

                <div className="border-b border-white/[0.07] px-5 py-4">

                  <div className="flex items-center gap-2">

                    <Shield className="h-4 w-4 text-purple-400" />

                    <h2 className="text-sm font-black">
                      Адміністративна активність
                    </h2>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-3">

                  <StatCard
                    label="Сесії"
                    value={user._count.sessions}
                    icon={
                      <Shield className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Журнал дій"
                    value={user._count.auditLogs}
                    icon={
                      <FileText className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Сповіщення"
                    value={user._count.notifications}
                    icon={
                      <Bell className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Аналітичні події"
                    value={user._count.analyticsEvents}
                    icon={
                      <Activity className="h-5 w-5" />
                    }
                  />

                </div>
              </section>
            )}

            {/* BLOCK INFORMATION */}

            {user.isBlocked && (
              <section className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.04]">

                <div className="border-b border-red-500/10 px-5 py-4">

                  <div className="flex items-center gap-2 text-red-400">

                    <Ban className="h-4 w-4" />

                    <h2 className="text-sm font-black">
                      Інформація про блокування
                    </h2>

                  </div>

                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2">

                  <InfoItem
                    dark
                    label="Дата блокування"
                    value={formatDate(user.blockedAt)}
                  />

                  <InfoItem
                    dark
                    label="Причина"
                    value={
                      user.blockedReason ||
                      "Причина не вказана"
                    }
                  />

                </div>
              </section>
            )}

          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="space-y-6">

            {/* ACCOUNT */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Обліковий запис
              </div>

              <div className="space-y-3">

                <AccountRow
                  label="ID"
                  value={user.id}
                  mono
                />

                <AccountRow
                  label="Роль"
                  value={roleLabel(user.role)}
                />

                <div className="flex items-center justify-between gap-4">

                  <span className="text-xs text-zinc-600">
                    Статус
                  </span>

                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${statusStyle(
                      user.status
                    )}`}
                  >
                    {statusLabel(user.status)}
                  </span>

                </div>

                <AccountRow
                  label="Створено"
                  value={formatDate(user.createdAt)}
                />

              </div>
            </section>

            {/* SECURITY */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Безпека
              </div>

              <div className="space-y-4">

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    Останній вхід
                  </div>

                  <div className="text-sm font-semibold text-zinc-300">
                    {formatDate(user.lastLoginAt)}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    IP останнього входу
                  </div>

                  <div className="font-mono text-xs text-zinc-400">
                    {user.lastLoginIp || "—"}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    Активні сесії
                  </div>

                  <div className="text-sm font-bold text-white">
                    {user._count.sessions}
                  </div>
                </div>

              </div>
            </section>

            {/* ROLE QUICK ACTIONS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Швидкі переходи
              </div>

              <div className="space-y-2">

                {user.role === "CUSTOMER" && (
                  <>
                    <QuickLink
                      href={`/admin/users/${user.id}/orders`}
                      icon={
                        <ShoppingBag className="h-4 w-4" />
                      }
                      label="Замовлення покупця"
                    />

                    <QuickLink
                      href="/admin/users"
                      icon={
                        <UserRound className="h-4 w-4" />
                      }
                      label="Всі користувачі"
                    />
                  </>
                )}

                {user.role === "SELLER" && sellerData && (
                  <>
                    <QuickLink
                      href={`/admin/sellers/${sellerData.id}`}
                      icon={
                        <Store className="h-4 w-4" />
                      }
                      label="Профіль продавця"
                    />

                    <QuickLink
                      href="/admin/sellers"
                      icon={
                        <Store className="h-4 w-4" />
                      }
                      label="Всі продавці"
                    />
                  </>
                )}

                {user.role === "ADMIN" && (
                  <>
                    <QuickLink
                      href="/admin/audit-logs"
                      icon={
                        <FileText className="h-4 w-4" />
                      }
                      label="Журнал дій"
                    />

                    <QuickLink
                      href="/admin/administrators"
                      icon={
                        <Shield className="h-4 w-4" />
                      }
                      label="Адміністратори"
                    />
                  </>
                )}

              </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}

/* ========================================================= */
/* COMPONENTS */
/* ========================================================= */

function InfoItem({
  icon,
  label,
  value,
  dark = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`p-4 ${
        dark
          ? "rounded-xl border border-red-500/10 bg-black/10"
          : "bg-[#0b0f16]"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-zinc-600">
        {icon}
        {label}
      </div>

      <div className="break-words text-sm font-semibold text-zinc-300">
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0b0f16] p-5">

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="text-2xl font-black text-white">
        {value.toLocaleString("uk-UA")}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
      </div>

    </div>
  );
}

function AccountRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="shrink-0 text-xs text-zinc-600">
        {label}
      </span>

      <span
        className={`max-w-[210px] truncate text-right text-xs text-zinc-400 ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {value}
      </span>

    </div>
  );
}

function ActivityRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <div className="truncate text-xs text-zinc-600">
          {label}
        </div>

        <div className="mt-0.5 text-sm font-bold text-white">
          {value.toLocaleString("uk-UA")}
        </div>

      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 text-sm font-medium text-zinc-400 transition hover:border-amber-400/10 hover:bg-amber-400/[0.05] hover:text-white"
    >
      <span className="text-zinc-600">
        {icon}
      </span>

      <span className="flex-1">
        {label}
      </span>

      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-zinc-700" />
    </Link>
  );
}