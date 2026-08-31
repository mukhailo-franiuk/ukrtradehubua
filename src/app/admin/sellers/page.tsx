
import type { Metadata } from "next";
import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Store,
  Users,
} from "lucide-react";

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Продавці",
};

type AdminSellersPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 20;

const SELLER_STATUSES = [
  "ACTIVE",
  "PENDING",
  "BLOCKED",
  "SUSPENDED",
] as const;

type SellerStatusValue =
  (typeof SELLER_STATUSES)[number];

function isSellerStatus(
  value: string
): value is SellerStatusValue {
  return SELLER_STATUSES.includes(
    value as SellerStatusValue
  );
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
  }).format(date);
}

export default async function AdminSellersPage({
  searchParams,
}: AdminSellersPageProps) {
  const params = await searchParams;

  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1
  );

  const search = params.search?.trim() || "";
  const rawStatus = params.status?.trim() || "";

  /*
   * Перетворюємо string із URL у валідний
   * SellerStatus або undefined.
   */
  const status = isSellerStatus(rawStatus)
    ? rawStatus
    : undefined;

  /*
   * Базовий фільтр:
   * показуємо тільки користувачів із роллю SELLER.
   */
  const where = {
    role: "SELLER" as const,

    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: search,
              },
            },
            {
              shop: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),

    /*
     * Якщо статус не вибраний —
     * взагалі не додаємо shop.sellerStatus.
     *
     * Це важливо, бо у продавця Shop може бути відсутній.
     */
    ...(status
      ? {
          shop: {
            sellerStatus: status,
          },
        }
      : {}),
  };

  const [sellers, totalSellers] = await Promise.all([
    db.user.findMany({
      where,

      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            sellerStatus: true,
            isActive: true,
            productsCount: true,
            salesCount: true,
            ordersCount: true,
            rating: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),

    db.user.count({
      where,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalSellers / PAGE_SIZE)
  );

  /*
   * Якщо користувач вручну ввів сторінку,
   * якої вже не існує, повертаємо останню.
   */
  const currentPage = Math.min(
    page,
    totalPages
  );

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <Store className="h-5 w-5" />

              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Marketplace
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Продавці
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Керування продавцями та магазинами UkrTradeHub
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <div className="text-2xl font-black">
                  {totalSellers.toLocaleString("uk-UA")}
                </div>

                <div className="text-xs text-zinc-600">
                  Всього продавців
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <form
          className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4"
          method="GET"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Пошук за ім'ям, email, телефоном або магазином..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30"
              />
            </div>

            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-11 rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-zinc-400 outline-none transition focus:border-amber-400/30"
            >
              <option value="">
                Усі статуси
              </option>

              <option value="ACTIVE">
                Активні
              </option>

              <option value="PENDING">
                Очікують
              </option>

              <option value="BLOCKED">
                Заблоковані
              </option>

              <option value="SUSPENDED">
                Призупинені
              </option>
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Знайти
            </button>
          </div>
        </form>

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <TableHead>
                    Продавець
                  </TableHead>

                  <TableHead>
                    Магазин
                  </TableHead>

                  <TableHead>
                    Статус
                  </TableHead>

                  <TableHead>
                    Товари
                  </TableHead>

                  <TableHead>
                    Продажі
                  </TableHead>

                  <TableHead>
                    Рейтинг
                  </TableHead>

                  <TableHead>
                    Реєстрація
                  </TableHead>

                  <th className="w-[80px] px-4 py-4" />
                </tr>
              </thead>

              <tbody>
                {sellers.map((seller) => {
                  const initials = (
                    seller.name ||
                    seller.email
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr
                      key={seller.id}
                      className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                    >
                      {/* SELLER */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-sm font-black text-amber-400">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">
                              {seller.name || "Без імені"}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-zinc-600">
                              {seller.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SHOP */}

                      <td className="px-4 py-4">
                        {seller.shop ? (
                          <div>
                            <div className="text-sm font-semibold text-zinc-300">
                              {seller.shop.name}
                            </div>

                            <div className="mt-0.5 text-xs text-zinc-600">
                              /{seller.shop.slug}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-700">
                            Магазин не створено
                          </span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4">
                        {seller.shop ? (
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${sellerStatusStyle(
                              seller.shop.sellerStatus
                            )}`}
                          >
                            {sellerStatusLabel(
                              seller.shop.sellerStatus
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-700">
                            —
                          </span>
                        )}
                      </td>

                      {/* PRODUCTS */}

                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-zinc-300">
                          {(
                            seller.shop?.productsCount ?? 0
                          ).toLocaleString("uk-UA")}
                        </span>
                      </td>

                      {/* SALES */}

                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-zinc-300">
                          {(
                            seller.shop?.salesCount ?? 0
                          ).toLocaleString("uk-UA")}
                        </span>
                      </td>

                      {/* RATING */}

                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-amber-400">
                          {seller.shop
                            ? Number(
                                seller.shop.rating
                              ).toFixed(1)
                            : "—"}
                        </span>
                      </td>

                      {/* CREATED */}

                      <td className="px-4 py-4">
                        <span className="text-xs text-zinc-500">
                          {formatDate(
                            seller.createdAt
                          )}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/sellers/${seller.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
                          aria-label="Переглянути продавця"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {sellers.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-700">
                          <Store className="h-6 w-6" />
                        </div>

                        <div className="font-bold text-zinc-400">
                          Продавців не знайдено
                        </div>

                        <div className="mt-1 text-sm text-zinc-700">
                          Спробуйте змінити параметри пошуку
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
              <div className="text-xs text-zinc-600">
                Сторінка {currentPage} з {totalPages}
              </div>

              <div className="flex gap-2">
                <PaginationLink
                  disabled={currentPage <= 1}
                  href={createPageUrl({
                    page: currentPage - 1,
                    search,
                    status: status ?? "",
                  })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationLink>

                <PaginationLink
                  disabled={currentPage >= totalPages}
                  href={createPageUrl({
                    page: currentPage + 1,
                    search,
                    status: status ?? "",
                  })}
                >
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-zinc-700">
      {children}
    </th>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.05] text-zinc-800">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
    >
      {children}
    </Link>
  );
}

function createPageUrl({
  page,
  search,
  status,
}: {
  page: number;
  search: string;
  status: string;
}) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (search) {
    params.set("search", search);
  }

  if (status) {
    params.set("status", status);
  }

  const query = params.toString();

  return query
    ? `/admin/sellers?${query}`
    : "/admin/sellers";
}