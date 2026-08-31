
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  BarChart3,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Mail,
  Package,
  Phone,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";

import { db } from "@/lib/prisma";

type SellerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: SellerPageProps): Promise<Metadata> {
  const { id } = await params;

  const seller = await db.user.findUnique({
    where: {
      id,
    },
    select: {
      name: true,
      email: true,
      shop: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!seller) {
    return {
      title: "Продавця не знайдено | UkrTradeHub Admin",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${
      seller.shop?.name ||
      seller.name ||
      seller.email
    } | Продавці`,
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

function sellerStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активний";

    case "PENDING":
      return "Очікує";

    case "BLOCKED":
      return "Заблокований";

    case "SUSPENDED":
      return "Призупинений";

    default:
      return status;
  }
}

function sellerStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "BLOCKED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "SUSPENDED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function userStatusLabel(status: string) {
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

function userStatusStyle(status: string) {
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

function ratingValue(rating: unknown) {
  const value = Number(rating);

  if (!Number.isFinite(value)) {
    return "0.0";
  }

  return value.toFixed(1);
}

export default async function AdminSellerPage({
  params,
}: SellerPageProps) {
  const { id } = await params;

  const seller = await db.user.findUnique({
    where: {
      id,
    },

    include: {
      shop: {
        include: {
          _count: {
            select: {
              products: true,
              orderSellers: true,
              reviews: true,
              followers: true,
              promotions: true,
              banners: true,
              payouts: true,
              analyticsEvents: true,
              views: true,
            },
          },
        },
      },

      _count: {
        select: {
          orders: true,
          sessions: true,
          productReviews: true,
          shopReviews: true,
          shopFollowers: true,
          payments: true,
          couponUsages: true,
          returnRequests: true,
          analyticsEvents: true,
        },
      },
    },
  });

  if (!seller || seller.role !== "SELLER") {
    notFound();
  }

  const shop = seller.shop;

  const initials = (
    seller.name ||
    seller.email ||
    shop?.name ||
    "S"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* BACK */}

        <Link
          href="/admin/sellers"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до продавців
        </Link>

        {/* HEADER */}

        <div className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex min-w-0 items-center gap-4">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-black shadow-lg shadow-amber-400/10">
              {initials}
            </div>

            <div className="min-w-0">

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
                  {shop?.name ||
                    seller.name ||
                    "Продавець"}
                </h1>

                <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-300">
                  Продавець
                </span>

                {shop && (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${sellerStatusStyle(
                      shop.sellerStatus
                    )}`}
                  >
                    {sellerStatusLabel(
                      shop.sellerStatus
                    )}
                  </span>
                )}

              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">

                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  {seller.name || "Без імені"}
                </span>

                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {seller.email}
                </span>

                {seller.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {seller.phone}
                  </span>
                )}

              </div>
            </div>
          </div>

          {/* STATUS */}

          <div className="flex flex-wrap gap-2">

            <span
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${userStatusStyle(
                seller.status
              )}`}
            >
              {seller.status === "ACTIVE" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}

              Акаунт: {userStatusLabel(seller.status)}
            </span>

            {seller.isBlocked && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300">
                <Ban className="h-4 w-4" />
                Заблокований
              </span>
            )}

          </div>
        </div>

        {/* MAIN GRID */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          <div className="space-y-6">

            {/* SHOP */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">

                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Магазин
                  </h2>
                </div>

                {shop && (
                  <span className="text-xs text-zinc-700">
                    /{shop.slug}
                  </span>
                )}

              </div>

              {shop ? (
                <>
                  <div className="p-5">

                    <div className="mb-5 flex items-start gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                        <Store className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">

                        <h3 className="text-xl font-black">
                          {shop.name}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-600">
                          {shop.description ||
                            "Опис магазину не вказаний"}
                        </p>

                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">

                      <InfoItem
                        icon={
                          <Store className="h-4 w-4" />
                        }
                        label="Статус продавця"
                        value={sellerStatusLabel(
                          shop.sellerStatus
                        )}
                      />

                      <InfoItem
                        icon={
                          <CheckCircle2 className="h-4 w-4" />
                        }
                        label="Магазин"
                        value={
                          shop.isActive
                            ? "Активний"
                            : "Неактивний"
                        }
                      />

                      <InfoItem
                        icon={
                          <CalendarDays className="h-4 w-4" />
                        }
                        label="Створено"
                        value={formatDate(
                          shop.createdAt
                        )}
                      />

                      <InfoItem
                        icon={
                          <Clock3 className="h-4 w-4" />
                        }
                        label="Оновлено"
                        value={formatDate(
                          shop.updatedAt
                        )}
                      />

                    </div>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center">

                  <Store className="mx-auto mb-3 h-8 w-8 text-zinc-700" />

                  <div className="font-bold text-zinc-400">
                    Магазин не створено
                  </div>

                  <div className="mt-1 text-sm text-zinc-700">
                    У продавця поки немає магазину
                  </div>

                </div>
              )}

            </section>

            {/* SHOP STATISTICS */}

            {shop && (
              <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

                <div className="border-b border-white/[0.07] px-5 py-4">

                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-amber-400" />

                    <h2 className="text-sm font-black">
                      Статистика магазину
                    </h2>
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-4">

                  <StatCard
                    label="Товари"
                    value={shop.productsCount}
                    icon={
                      <Package className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Продажі"
                    value={shop.salesCount}
                    icon={
                      <ShoppingBag className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Замовлення"
                    value={shop.ordersCount}
                    icon={
                      <FileText className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Підписники"
                    value={shop._count.followers}
                    icon={
                      <Users className="h-5 w-5" />
                    }
                  />

                </div>

                <div className="grid grid-cols-2 gap-px border-t border-white/[0.05] bg-white/[0.05] md:grid-cols-4">

                  <StatCard
                    label="Рейтинг"
                    value={ratingValue(shop.rating)}
                    icon={
                      <Star className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Відгуки"
                    value={shop._count.reviews}
                    icon={
                      <FileText className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Промоції"
                    value={shop._count.promotions}
                    icon={
                      <BarChart3 className="h-5 w-5" />
                    }
                  />

                  <StatCard
                    label="Перегляди"
                    value={shop._count.views}
                    icon={
                      <Eye className="h-5 w-5" />
                    }
                  />

                </div>

              </section>
            )}

            {/* SELLER ACTIVITY */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">

              <div className="border-b border-white/[0.07] px-5 py-4">

                <div className="flex items-center gap-2">
                  <ActivityIcon />

                  <h2 className="text-sm font-black">
                    Активність продавця
                  </h2>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-4">

                <StatCard
                  label="Замовлення"
                  value={seller._count.orders}
                  icon={
                    <ShoppingBag className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Відгуки товарів"
                  value={seller._count.productReviews}
                  icon={
                    <Star className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Відгуки магазинів"
                  value={seller._count.shopReviews}
                  icon={
                    <Store className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Підписки"
                  value={seller._count.shopFollowers}
                  icon={
                    <Users className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Платежі"
                  value={seller._count.payments}
                  icon={
                    <Wallet className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Повернення"
                  value={seller._count.returnRequests}
                  icon={
                    <ShieldAlert className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Купони"
                  value={seller._count.couponUsages}
                  icon={
                    <FileText className="h-5 w-5" />
                  }
                />

                <StatCard
                  label="Аналітичні події"
                  value={seller._count.analyticsEvents}
                  icon={
                    <BarChart3 className="h-5 w-5" />
                  }
                />

              </div>
            </section>

            {/* BLOCK INFORMATION */}

            {seller.isBlocked && (
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
                    value={formatDate(
                      seller.blockedAt
                    )}
                  />

                  <InfoItem
                    dark
                    label="Причина"
                    value={
                      seller.blockedReason ||
                      "Причина не вказана"
                    }
                  />

                </div>
              </section>
            )}

          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="space-y-6">

            {/* SELLER ACCOUNT */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Обліковий запис продавця
              </div>

              <div className="space-y-4">

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    Ім'я
                  </div>

                  <div className="text-sm font-semibold text-zinc-300">
                    {seller.name || "Не вказано"}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    Email
                  </div>

                  <div className="break-all text-sm font-semibold text-zinc-300">
                    {seller.email}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    Телефон
                  </div>

                  <div className="text-sm font-semibold text-zinc-300">
                    {seller.phone || "Не вказано"}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    ID користувача
                  </div>

                  <div className="break-all font-mono text-[11px] text-zinc-500">
                    {seller.id}
                  </div>
                </div>

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
                    {formatDate(
                      seller.lastLoginAt
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    IP останнього входу
                  </div>

                  <div className="font-mono text-xs text-zinc-400">
                    {seller.lastLoginIp || "—"}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] text-zinc-600">
                    Сесії
                  </div>

                  <div className="text-sm font-bold text-white">
                    {seller._count.sessions}
                  </div>
                </div>

              </div>
            </section>

            {/* SHOP ACCOUNT */}

            {shop && (
              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Магазин
                </div>

                <div className="space-y-4">

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-xs text-zinc-600">
                      Статус
                    </span>

                    <span
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${sellerStatusStyle(
                        shop.sellerStatus
                      )}`}
                    >
                      {sellerStatusLabel(
                        shop.sellerStatus
                      )}
                    </span>

                  </div>

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-xs text-zinc-600">
                      Активність
                    </span>

                    <span className="text-xs font-bold text-zinc-300">
                      {shop.isActive
                        ? "Активний"
                        : "Неактивний"}
                    </span>

                  </div>

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-xs text-zinc-600">
                      Рейтинг
                    </span>

                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {ratingValue(shop.rating)}
                    </span>

                  </div>

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-xs text-zinc-600">
                      Slug
                    </span>

                    <span className="max-w-[180px] truncate font-mono text-[11px] text-zinc-500">
                      {shop.slug}
                    </span>

                  </div>

                </div>
              </section>
            )}

            {/* QUICK LINKS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">

              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Швидкі переходи
              </div>

              <div className="space-y-2">

                <QuickLink
                  href="/admin/products"
                  icon={
                    <Package className="h-4 w-4" />
                  }
                  label="Товари"
                />

                <QuickLink
                  href="/admin/orders"
                  icon={
                    <ShoppingBag className="h-4 w-4" />
                  }
                  label="Замовлення"
                />

                <QuickLink
                  href="/admin/reviews"
                  icon={
                    <Star className="h-4 w-4" />
                  }
                  label="Відгуки"
                />

                <QuickLink
                  href="/admin/payouts"
                  icon={
                    <Wallet className="h-4 w-4" />
                  }
                  label="Виплати"
                />

                <QuickLink
                  href="/admin/analytics"
                  icon={
                    <BarChart3 className="h-4 w-4" />
                  }
                  label="Аналітика"
                />

                <QuickLink
                  href="/admin/audit-logs"
                  icon={
                    <Clock3 className="h-4 w-4" />
                  }
                  label="Журнал дій"
                />

              </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}

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
      className={
        dark
          ? "rounded-xl border border-red-500/10 bg-black/10 p-4"
          : "rounded-xl border border-white/[0.05] bg-white/[0.015] p-4"
      }
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
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0b0f16] p-5">

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="text-2xl font-black text-white">
        {typeof value === "number"
          ? value.toLocaleString("uk-UA")
          : value}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
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
      className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 text-sm font-medium text-zinc-400 transition hover:border-amber-400/10 hover:bg-amber-400/[0.05] hover:text-white"
    >
      <span className="text-zinc-600 transition group-hover:text-amber-400">
        {icon}
      </span>

      <span className="flex-1">
        {label}
      </span>

      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-zinc-700 transition group-hover:text-amber-400" />
    </Link>
  );
}

function ActivityIcon() {
  return (
    <BarChart3 className="h-4 w-4 text-amber-400" />
  );
}