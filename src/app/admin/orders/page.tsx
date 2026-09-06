"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

type OrderStatus = string;

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  provider: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
};

type OrderItem = {
  id: string;
  productTitle: string;
  sku: string | null;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;

  product: {
    id: string;
    title: string;
    sku: string | null;
  };

  variant: {
    id: string;
    title: string;
  } | null;

  shop: {
    id: string;
    name: string;
    slug: string;
  };
};

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  subtotal: string | number;
  discountAmount: string | number;
  deliveryAmount: string | number;
  total: string | number;

  shippingMethod: string | null;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };

  items: OrderItem[];

  payments: Payment[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const STATUS_LABELS: Record<
  string,
  string
> = {
  PENDING: "Очікує",
  CONFIRMED: "Підтверджено",
  PROCESSING: "В обробці",
  SHIPPED: "Відправлено",
  DELIVERED: "Доставлено",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

const PAYMENT_STATUS_LABELS: Record<
  string,
  string
> = {
  PENDING: "Очікує",
  PROCESSING: "Обробляється",
  PAID: "Оплачено",
  FAILED: "Помилка",
  REFUNDED: "Повернено",
  PARTIALLY_REFUNDED:
    "Частково повернено",
  CANCELLED: "Скасовано",
};

const PAYMENT_METHOD_LABELS: Record<
  string,
  string
> = {
  CARD: "Картка",
  CASH_ON_DELIVERY: "Післяплата",
  BANK_TRANSFER: "Банківський переказ",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
};

function formatMoney(
  value: string | number
) {
  return `${Number(value).toLocaleString(
    "uk-UA",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )} ₴`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    "uk-UA",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    STATUS_LABELS[status] ?? status;

  const classes =
    status === "CONFIRMED" ||
    status === "COMPLETED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "CANCELLED"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : status === "PENDING"
          ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
          : "border-blue-400/20 bg-blue-400/10 text-blue-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function PaymentBadge({
  payment,
}: {
  payment: Payment | undefined;
}) {
  if (!payment) {
    return (
      <span className="text-xs text-zinc-500">
        Немає платежу
      </span>
    );
  }

  const classes =
    payment.status === "PAID"
      ? "text-emerald-300"
      : payment.status === "FAILED"
        ? "text-red-300"
        : payment.status ===
            "REFUNDED"
          ? "text-purple-300"
          : "text-amber-300";

  return (
    <div className="space-y-0.5">
      <div
        className={`text-xs font-medium ${classes}`}
      >
        {PAYMENT_STATUS_LABELS[
          payment.status
        ] ?? payment.status}
      </div>

      <div className="text-[11px] text-zinc-500">
        {PAYMENT_METHOD_LABELS[
          payment.method
        ] ?? payment.method}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [search, setSearch] =
    useState("");

  const [searchInput, setSearchInput] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [paymentStatus, setPaymentStatus] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadOrders = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page)
        );

        params.set("limit", "20");

        if (search) {
          params.set(
            "search",
            search
          );
        }

        if (status) {
          params.set(
            "status",
            status
          );
        }

        if (paymentStatus) {
          params.set(
            "paymentStatus",
            paymentStatus
          );
        }

        const response =
          await fetch(
            `/api/admin/orders?${params.toString()}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ??
              "Не вдалося завантажити замовлення"
          );
        }

        setOrders(
          data.orders ?? []
        );

        setPagination(
          data.pagination ?? null
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Сталася помилка"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      search,
      status,
      paymentStatus,
    ]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function submitSearch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setPage(1);
    setSearch(
      searchInput.trim()
    );
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setPage(1);
  }

  const totalValue = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum + Number(order.total),
        0
      ),
    [orders]
  );

  return (
    <div className="min-h-full bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
        {/* HEADER */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <ShoppingBag className="h-4 w-4" />
              Admin
              <span>/</span>
              Замовлення
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Замовлення
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Керування замовленнями,
              оплатами та статусами
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Оновити
          </button>
        </div>

        {/* STATS */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Замовлень
              </span>

              <Package className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="mt-3 text-2xl font-bold">
              {pagination?.total ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                На сторінці
              </span>

              <Clock3 className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="mt-3 text-2xl font-bold">
              {orders.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Сума сторінки
              </span>

              <ShoppingBag className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="mt-3 text-2xl font-bold">
              {formatMoney(
                totalValue
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Поточна сторінка
              </span>

              <Truck className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="mt-3 text-2xl font-bold">
              {pagination?.page ?? 1}
              <span className="ml-1 text-base font-normal text-zinc-600">
                / {pagination?.pages ?? 1}
              </span>
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 xl:flex-row">
            <form
              onSubmit={
                submitSearch
              }
              className="flex flex-1 gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                <input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value
                    )
                  }
                  placeholder="№ замовлення, email, ім'я або телефон..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-amber-400/40"
                />
              </div>

              <button
                type="submit"
                className="h-11 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                Знайти
              </button>
            </form>

            <select
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-11 rounded-xl border border-white/10 bg-zinc-900 px-4 text-sm text-white outline-none"
            >
              <option value="">
                Всі статуси
              </option>

              {Object.entries(
                STATUS_LABELS
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-11 rounded-xl border border-white/10 bg-zinc-900 px-4 text-sm text-white outline-none"
            >
              <option value="">
                Всі оплати
              </option>

              {Object.entries(
                PAYMENT_STATUS_LABELS
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            {(search ||
              status ||
              paymentStatus) && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-11 rounded-xl border border-white/10 px-4 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                Скинути
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4">
                    Замовлення
                  </th>

                  <th className="px-5 py-4">
                    Покупець
                  </th>

                  <th className="px-5 py-4">
                    Товари
                  </th>

                  <th className="px-5 py-4">
                    Сума
                  </th>

                  <th className="px-5 py-4">
                    Оплата
                  </th>

                  <th className="px-5 py-4">
                    Статус
                  </th>

                  <th className="px-5 py-4">
                    Дата
                  </th>

                  <th className="px-5 py-4 text-right">
                    Дія
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-20 text-center"
                    >
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-400" />

                      <p className="mt-3 text-sm text-zinc-500">
                        Завантаження...
                      </p>
                    </td>
                  </tr>
                ) : orders.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-20 text-center"
                    >
                      <Package className="mx-auto h-10 w-10 text-zinc-700" />

                      <p className="mt-4 text-sm font-medium text-zinc-400">
                        Замовлень не знайдено
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Спробуйте змінити
                        параметри пошуку
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map(
                    (order) => {
                      const latestPayment =
                        order.payments[0];

                      const itemCount =
                        order.items.reduce(
                          (
                            sum,
                            item
                          ) =>
                            sum +
                            item.quantity,
                          0
                        );

                      return (
                        <tr
                          key={order.id}
                          className="transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4 align-top">
                            <div className="font-semibold text-white">
                              #
                              {
                                order.orderNumber
                              }
                            </div>

                            <div className="mt-1 max-w-[180px] truncate text-xs text-zinc-600">
                              {
                                order.id
                              }
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="font-medium text-zinc-200">
                              {order.user
                                .name ||
                                "Без імені"}
                            </div>

                            <div className="mt-1 text-xs text-zinc-500">
                              {
                                order
                                  .user
                                  .email
                              }
                            </div>

                            {order.user
                              .phone && (
                              <div className="mt-0.5 text-xs text-zinc-600">
                                {
                                  order
                                    .user
                                    .phone
                                }
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="font-medium text-zinc-200">
                              {
                                itemCount
                              }{" "}
                              шт.
                            </div>

                            <div className="mt-1 max-w-[220px] truncate text-xs text-zinc-500">
                              {order.items
                                .slice(
                                  0,
                                  2
                                )
                                .map(
                                  (
                                    item
                                  ) =>
                                    item.productTitle
                                )
                                .join(
                                  ", "
                                )}

                              {order.items
                                .length >
                                2 &&
                                ` +${order.items.length - 2}`}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="font-bold text-white">
                              {formatMoney(
                                order.total
                              )}
                            </div>

                            <div className="mt-1 text-xs text-zinc-600">
                              Товарів:{" "}
                              {formatMoney(
                                order.subtotal
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <PaymentBadge
                              payment={
                                latestPayment
                              }
                            />
                          </td>

                          <td className="px-5 py-4 align-top">
                            <StatusBadge
                              status={
                                order.status
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 align-top text-xs text-zinc-500">
                            {formatDate(
                              order.createdAt
                            )}
                          </td>

                          <td className="px-5 py-4 text-right align-top">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                              Деталі
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {pagination &&
            pagination.pages >
              1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <div className="text-xs text-zinc-500">
                  Сторінка{" "}
                  <span className="font-medium text-zinc-300">
                    {pagination.page}
                  </span>{" "}
                  з{" "}
                  <span className="font-medium text-zinc-300">
                    {pagination.pages}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (value) =>
                          Math.max(
                            1,
                            value -
                              1
                          )
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                  </button>

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (value) =>
                          value +
                          1
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Далі
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}