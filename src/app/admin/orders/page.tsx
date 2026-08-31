
import type { Metadata } from "next";
import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Search,
  ShoppingBag,
  Users,
} from "lucide-react";

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Замовлення | UkrTradeHub Admin",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminOrdersPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    paymentStatus?: string;
  }>;
};

const PAGE_SIZE = 20;

function orderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";

    case "CONFIRMED":
      return "Підтверджене";

    case "PROCESSING":
      return "В обробці";

    case "SHIPPED":
      return "Відправлене";

    case "DELIVERED":
      return "Доставлене";

    case "COMPLETED":
      return "Завершене";

    case "CANCELLED":
      return "Скасоване";

    case "RETURNED":
      return "Повернене";

    default:
      return status;
  }
}

function orderStatusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "CONFIRMED":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";

    case "PROCESSING":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";

    case "SHIPPED":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

    case "DELIVERED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "COMPLETED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "CANCELLED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "RETURNED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";

    case "PROCESSING":
      return "Обробляється";

    case "PAID":
      return "Оплачено";

    case "FAILED":
      return "Помилка";

    case "CANCELLED":
      return "Скасовано";

    case "REFUNDED":
      return "Повернено";

    case "PARTIALLY_REFUNDED":
      return "Частково повернено";

    default:
      return status;
  }
}

function paymentStatusStyle(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "PENDING":
    case "PROCESSING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "FAILED":
    case "CANCELLED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: unknown) {
  return `${Number(value).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₴`;
}

function getPaymentStatus(
  payments: Array<{
    status: string;
  }>
) {
  if (payments.some((payment) => payment.status === "PAID")) {
    return "PAID";
  }

  if (
    payments.some(
      (payment) => payment.status === "PARTIALLY_REFUNDED"
    )
  ) {
    return "PARTIALLY_REFUNDED";
  }

  if (
    payments.some(
      (payment) => payment.status === "REFUNDED"
    )
  ) {
    return "REFUNDED";
  }

  if (
    payments.some(
      (payment) => payment.status === "PROCESSING"
    )
  ) {
    return "PROCESSING";
  }

  if (
    payments.some(
      (payment) => payment.status === "FAILED"
    )
  ) {
    return "FAILED";
  }

  if (
    payments.some(
      (payment) => payment.status === "CANCELLED"
    )
  ) {
    return "CANCELLED";
  }

  return "PENDING";
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const params = await searchParams;

  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1
  );

  const search = params.search?.trim() || "";
  const status = params.status?.trim() || "";
  const paymentStatus =
    params.paymentStatus?.trim() || "";

  const where = {
    ...(search
      ? {
          OR: [
            {
              id: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              user: {
                phone: {
                  contains: search,
                },
              },
            },
          ],
        }
      : {}),

    ...(status
      ? {
          status: status as never,
        }
      : {}),

    ...(paymentStatus
      ? {
          payments: {
            some: {
              status: paymentStatus as never,
            },
          },
        }
      : {}),
  };

  const [orders, totalOrders] =
    await Promise.all([
      db.order.findMany({
        where,

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },

          items: {
            select: {
              id: true,
              quantity: true,

              product: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },

          sellers: {
            select: {
              id: true,

              shop: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          payments: {
            select: {
              id: true,
              status: true,
            },

            orderBy: {
              createdAt: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),

      db.order.count({
        where,
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalOrders / PAGE_SIZE)
  );

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <ShoppingBag className="h-5 w-5" />

              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Marketplace
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Замовлення
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Керування замовленнями UkrTradeHub
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <ShoppingBag className="h-5 w-5" />
              </div>

              <div>
                <div className="text-2xl font-black">
                  {totalOrders.toLocaleString("uk-UA")}
                </div>

                <div className="text-xs text-zinc-600">
                  Всього замовлень
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <form
          method="GET"
          className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4"
        >
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Пошук за ID, покупцем, email або телефоном..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30"
              />
            </div>

            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-zinc-400 outline-none focus:border-amber-400/30"
            >
              <option value="">Усі статуси</option>
              <option value="PENDING">Очікують</option>
              <option value="CONFIRMED">
                Підтверджені
              </option>
              <option value="PROCESSING">
                В обробці
              </option>
              <option value="SHIPPED">
                Відправлені
              </option>
              <option value="DELIVERED">
                Доставлені
              </option>
              <option value="COMPLETED">
                Завершені
              </option>
              <option value="CANCELLED">
                Скасовані
              </option>
              <option value="RETURNED">
                Повернені
              </option>
            </select>

            <select
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="h-11 rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-zinc-400 outline-none focus:border-amber-400/30"
            >
              <option value="">Усі оплати</option>
              <option value="PENDING">
                Очікує оплати
              </option>
              <option value="PROCESSING">
                Обробляється
              </option>
              <option value="PAID">
                Оплачено
              </option>
              <option value="FAILED">
                Помилка
              </option>
              <option value="CANCELLED">
                Скасовано
              </option>
              <option value="REFUNDED">
                Повернено
              </option>
              <option value="PARTIALLY_REFUNDED">
                Частково повернено
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
            <table className="w-full min-w-[1250px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <TableHead>
                    Замовлення
                  </TableHead>

                  <TableHead>
                    Покупець
                  </TableHead>

                  <TableHead>
                    Продавці
                  </TableHead>

                  <TableHead>
                    Товари
                  </TableHead>

                  <TableHead>
                    Сума
                  </TableHead>

                  <TableHead>
                    Статус
                  </TableHead>

                  <TableHead>
                    Оплата
                  </TableHead>

                  <TableHead>
                    Створено
                  </TableHead>

                  <th className="w-[80px] px-4 py-4" />
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const customerInitial = (
                    order.user.name ||
                    order.user.email
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase();

                  const productCount =
                    order.items.reduce(
                      (sum, item) =>
                        sum + item.quantity,
                      0
                    );

                  const sellerCount =
                    order.sellers.length;

                  const currentPaymentStatus =
                    getPaymentStatus(
                      order.payments
                    );

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                    >
                      {/* ORDER */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                            <Package className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-mono text-xs font-bold text-zinc-300 transition hover:text-amber-400"
                            >
                              #{order.id.slice(0, 12)}
                            </Link>

                            <div className="mt-1 max-w-[150px] truncate text-[10px] text-zinc-700">
                              {order.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CUSTOMER */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-black text-zinc-400">
                            {customerInitial}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-300">
                              {order.user.name ||
                                "Без імені"}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-zinc-600">
                              {order.user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SELLERS */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-zinc-700" />

                          <span className="text-sm font-bold text-zinc-300">
                            {sellerCount}
                          </span>

                          <span className="text-xs text-zinc-700">
                            {sellerCount === 1
                              ? "продавець"
                              : "продавців"}
                          </span>
                        </div>

                        {sellerCount > 0 && (
                          <div className="mt-1 max-w-[220px] truncate text-xs text-zinc-600">
                            {order.sellers
                              .map(
                                (item) =>
                                  item.shop.name
                              )
                              .join(", ")}
                          </div>
                        )}
                      </td>

                      {/* PRODUCTS */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-zinc-700" />

                          <span className="text-sm font-bold text-zinc-300">
                            {productCount}
                          </span>

                          <span className="text-xs text-zinc-700">
                            {productCount === 1
                              ? "товар"
                              : "товарів"}
                          </span>
                        </div>
                      </td>

                      {/* TOTAL */}

                      <td className="px-4 py-4">
                        <span className="text-sm font-black text-white">
                          {formatMoney(order.total)}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${orderStatusStyle(
                            order.status
                          )}`}
                        >
                          {orderStatusLabel(
                            order.status
                          )}
                        </span>
                      </td>

                      {/* PAYMENT */}

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${paymentStatusStyle(
                            currentPaymentStatus
                          )}`}
                        >
                          {paymentStatusLabel(
                            currentPaymentStatus
                          )}
                        </span>
                      </td>

                      {/* CREATED */}

                      <td className="px-4 py-4">
                        <span className="text-xs text-zinc-500">
                          {formatDate(
                            order.createdAt
                          )}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          aria-label="Переглянути замовлення"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-700">
                          <ShoppingBag className="h-6 w-6" />
                        </div>

                        <div className="font-bold text-zinc-400">
                          Замовлень не знайдено
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
                Сторінка {page} з {totalPages}
              </div>

              <div className="flex gap-2">
                <PaginationLink
                  disabled={page <= 1}
                  href={createPageUrl({
                    page: page - 1,
                    search,
                    status,
                    paymentStatus,
                  })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationLink>

                <PaginationLink
                  disabled={page >= totalPages}
                  href={createPageUrl({
                    page: page + 1,
                    search,
                    status,
                    paymentStatus,
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
  paymentStatus,
}: {
  page: number;
  search: string;
  status: string;
  paymentStatus: string;
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

  if (paymentStatus) {
    params.set(
      "paymentStatus",
      paymentStatus
    );
  }

  const query = params.toString();

  return query
    ? `/admin/orders?${query}`
    : "/admin/orders";
}