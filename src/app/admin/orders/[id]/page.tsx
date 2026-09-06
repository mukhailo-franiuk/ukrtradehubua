"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Store,
  Truck,
  User,
  XCircle,
} from "lucide-react";

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  provider: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt?: string;
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
    slug: string;
    sku: string | null;
    price: string | number;
    stock: number;
    reservedStock: number;
    status: string;
  };

  variant: {
    id: string;
    title: string;
    sku?: string | null;
    price?: string | number | null;
    stock: number;
    reservedStock: number;
    isActive?: boolean;
  } | null;

  shop: {
    id: string;
    name: string;
    slug: string;
    sellerStatus: string;
    isActive: boolean;
  };
};

type SellerOrder = {
  id: string;
  shopId: string;
  subtotal: string | number;
  shipping: string | number;
  total: string | number;
  commissionRate?: string | number;
  commissionAmount?: string | number;
  sellerAmount?: string | number;
  status: string;

  shop: {
    id: string;
    userId?: string;
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    sellerStatus?: string;
    isActive?: boolean;
    rating?: string | number;
    productsCount?: number;
    salesCount?: number;
    ordersCount?: number;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
};

type Address = {
  id: string;
  type: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  novaPoshtaWarehouse: string | null;
  novaPoshtaRef: string | null;
};

type Order = {
  id: string;
  userId: string;
  orderNumber: string;
  status: string;

  subtotal: string | number;
  discountAmount: string | number;
  deliveryAmount: string | number;
  total: string | number;

  customerNote: string | null;
  shippingAddressId: string | null;
  shippingMethod: string | null;

  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    isBlocked: boolean;
  };

  shippingAddress: Address | null;

  items: OrderItem[];

  sellers: SellerOrder[];

  payments: Payment[];

  delivery?: unknown | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Очікує підтвердження",
  CONFIRMED: "Підтверджено",
  PROCESSING: "В обробці",
  SHIPPED: "Відправлено",
  DELIVERED: "Доставлено",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
  RETURNED: "Повернено",
  REFUNDED: "Кошти повернено",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Очікує",
  PROCESSING: "Обробляється",
  PAID: "Оплачено",
  FAILED: "Помилка",
  REFUNDED: "Повернено",
  PARTIALLY_REFUNDED: "Частково повернено",
  CANCELLED: "Скасовано",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: "Банківська картка",
  CASH_ON_DELIVERY: "Післяплата",
  BANK_TRANSFER: "Банківський переказ",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
};

const SHIPPING_LABELS: Record<string, string> = {
  NOVA_POSHTA: "Нова пошта",
  UKRPOSHTA: "Укрпошта",
  MIST: "Meest",
  COURIER: "Кур'єр",
  PICKUP: "Самовивіз",
};

function money(value: string | number) {
  return `${Number(value).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₴`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const good =
    status === "CONFIRMED" ||
    status === "COMPLETED";

  const bad =
    status === "CANCELLED" ||
    status === "REFUNDED";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${
        good
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : bad
            ? "border-red-400/20 bg-red-400/10 text-red-300"
            : "border-amber-400/20 bg-amber-400/10 text-amber-300"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [orderId, setOrderId] =
    useState<string | null>(null);

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadOrder = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/admin/orders/${id}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ??
              data?.error ??
              "Не вдалося завантажити замовлення"
          );
        }

        /*
         * API /api/admin/orders/[id]
         * повертає Order напряму:
         *
         * {
         *   id: "...",
         *   orderNumber: "...",
         *   ...
         * }
         *
         * А не:
         *
         * {
         *   order: {...}
         * }
         */
        setOrder(data);
      } catch (err) {
        setOrder(null);

        setError(
          err instanceof Error
            ? err.message
            : "Сталася помилка"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    params
      .then(({ id }) => {
        if (cancelled) return;

        setOrderId(id);
        void loadOrder(id);
      })
      .catch(() => {
        if (cancelled) return;

        setOrderId(null);
        setOrder(null);
        setError(
          "Не вдалося отримати ID замовлення."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params, loadOrder]);

  async function changeStatus(status: string) {
    if (!orderId || saving) return;

    const label =
      STATUS_LABELS[status] ?? status;

    const confirmed = window.confirm(
      `Змінити статус замовлення на «${label}»?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(
        `/api/admin/orders/${orderId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ??
            data?.error ??
            "Не вдалося змінити статус"
        );
      }

      /*
       * PATCH /api/admin/orders/[id]
       * також повертає Order напряму.
       */
      setOrder(data);

      setSuccess(
        `Статус змінено на «${label}»`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Сталася помилка"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />

          <p className="mt-3 text-sm text-zinc-500">
            Завантаження замовлення...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            До замовлень
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
            {error ?? "Замовлення не знайдено"}
          </div>
        </div>
      </div>
    );
  }

  const latestPayment =
    order.payments[0];

  const itemCount =
    order.items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  return (
    <div className="min-h-full bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1500px] space-y-6 p-6 lg:p-8">

        {/* TOP */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/orders"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Всі замовлення
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">
                #{order.orderNumber}
              </h1>

              <StatusBadge
                status={order.status}
              />
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Створено{" "}
              {dateTime(order.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadOrder(order.id)
              }
              disabled={loading || saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/[0.08] disabled:opacity-50"
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

            {order.status === "PENDING" && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    changeStatus(
                      "CONFIRMED"
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  Підтвердити
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    changeStatus(
                      "CANCELLED"
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500/10 px-4 text-sm font-semibold text-red-300 ring-1 ring-inset ring-red-400/20 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Скасувати
                </button>
              </>
            )}

            {order.status === "CONFIRMED" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  changeStatus(
                    "PROCESSING"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}

                В обробку
              </button>
            )}

            {order.status === "PROCESSING" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  changeStatus(
                    "SHIPPED"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
              >
                <Truck className="h-4 w-4" />
                Відправити
              </button>
            )}

            {order.status === "SHIPPED" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  changeStatus(
                    "DELIVERED"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                <Truck className="h-4 w-4" />
                Доставлено
              </button>
            )}

            {order.status === "DELIVERED" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  changeStatus(
                    "COMPLETED"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Завершити
              </button>
            )}
          </div>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-500">
              <Package className="h-5 w-5" />

              <span className="text-sm">
                Товарів
              </span>
            </div>

            <div className="mt-3 text-2xl font-bold">
              {itemCount} шт.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-500">
              <CreditCard className="h-5 w-5" />

              <span className="text-sm">
                Сума
              </span>
            </div>

            <div className="mt-3 text-2xl font-bold">
              {money(order.total)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-500">
              <Clock3 className="h-5 w-5" />

              <span className="text-sm">
                Оплата
              </span>
            </div>

            <div className="mt-3">
              {latestPayment ? (
                <>
                  <div
                    className={`font-semibold ${
                      latestPayment.status ===
                      "PAID"
                        ? "text-emerald-300"
                        : latestPayment.status ===
                            "FAILED"
                          ? "text-red-300"
                          : "text-amber-300"
                    }`}
                  >
                    {
                      PAYMENT_STATUS_LABELS[
                        latestPayment.status
                      ] ??
                        latestPayment.status
                    }
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    {
                      PAYMENT_METHOD_LABELS[
                        latestPayment.method
                      ] ??
                        latestPayment.method
                    }
                  </div>
                </>
              ) : (
                <span className="text-sm text-zinc-600">
                  Немає платежу
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-500">
              <Truck className="h-5 w-5" />

              <span className="text-sm">
                Доставка
              </span>
            </div>

            <div className="mt-3 font-semibold">
              {order.shippingMethod
                ? SHIPPING_LABELS[
                    order.shippingMethod
                  ] ??
                  order.shippingMethod
                : "Не вказано"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

          <div className="space-y-6">

            {/* ITEMS */}

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold">
                  Товари
                </h2>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {order.items.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="min-w-0">

                          <div className="font-medium text-zinc-100">
                            {item.productTitle}
                          </div>

                          {item.variant && (
                            <div className="mt-1 text-xs text-zinc-500">
                              Варіант:{" "}
                              {
                                item.variant
                                  .title
                              }
                            </div>
                          )}

                          <div className="mt-1 text-xs text-zinc-600">
                            SKU:{" "}
                            {item.sku ??
                              item.product
                                .sku ??
                              "—"}
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                            <Store className="h-3.5 w-3.5" />

                            {item.shop.name}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-8 sm:justify-end">
                          <div className="text-right">

                            <div className="text-xs text-zinc-600">
                              {item.quantity} ×{" "}
                              {money(
                                item.unitPrice
                              )}
                            </div>

                            <div className="mt-1 font-semibold">
                              {money(
                                item.totalPrice
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-zinc-500">
                          Stock:{" "}
                          {item.variant
                            ? item.variant
                                .stock
                            : item.product
                                .stock}
                        </span>

                        <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-zinc-500">
                          Reserved:{" "}
                          {item.variant
                            ? item.variant
                                .reservedStock
                            : item.product
                                .reservedStock}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* SELLERS */}

            {order.sellers.length > 0 && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="font-semibold">
                    Магазини
                  </h2>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {order.sellers.map(
                    (seller) => (
                      <div
                        key={seller.id}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-medium">
                            {seller.shop.name}
                          </div>

                          <div className="mt-1 text-xs text-zinc-600">
                            Підсумок магазину:{" "}
                            {money(
                              seller.total
                            )}
                          </div>

                          {seller.commissionAmount !==
                            undefined && (
                            <div className="mt-1 text-xs text-zinc-600">
                              Комісія:{" "}
                              {money(
                                seller.commissionAmount
                              )}
                            </div>
                          )}

                          {seller.sellerAmount !==
                            undefined && (
                            <div className="mt-1 text-xs text-emerald-400/70">
                              Продавцю:{" "}
                              {money(
                                seller.sellerAmount
                              )}
                            </div>
                          )}
                        </div>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                          {
                            STATUS_LABELS[
                              seller.status
                            ] ??
                              seller.status
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* PAYMENTS */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold">
                  Платежі
                </h2>
              </div>

              <div className="divide-y divide-white/[0.06]">

                {order.payments.length === 0 ? (
                  <div className="p-5 text-sm text-zinc-600">
                    Платежів немає.
                  </div>
                ) : (
                  order.payments.map(
                    (payment) => (
                      <div
                        key={payment.id}
                        className="p-5"
                      >

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                          <div>
                            <div className="font-medium">
                              {
                                PAYMENT_METHOD_LABELS[
                                  payment.method
                                ] ??
                                  payment.method
                              }
                            </div>

                            <div className="mt-1 text-xs text-zinc-600">
                              {payment.provider ??
                                "—"}
                            </div>
                          </div>

                          <div className="lg:text-right">

                            <div className="font-semibold">
                              {money(
                                payment.amount
                              )}
                            </div>

                            <div className="mt-1 text-xs text-zinc-500">
                              {
                                PAYMENT_STATUS_LABELS[
                                  payment.status
                                ] ??
                                  payment.status
                              }
                            </div>

                          </div>
                        </div>

                        {payment.transactionId && (
                          <div className="mt-3 rounded-xl bg-black/20 p-3 text-xs text-zinc-500">
                            Transaction ID:{" "}
                            <span className="break-all text-zinc-300">
                              {
                                payment.transactionId
                              }
                            </span>
                          </div>
                        )}

                        {payment.paidAt && (
                          <div className="mt-2 text-xs text-emerald-400/70">
                            Оплачено:{" "}
                            {dateTime(
                              payment.paidAt
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}

          <aside className="space-y-6">

            {/* CUSTOMER */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-zinc-500" />

                <h2 className="font-semibold">
                  Покупець
                </h2>
              </div>

              <div className="mt-5 space-y-3">

                <div>
                  <div className="text-xs text-zinc-600">
                    Ім'я
                  </div>

                  <div className="mt-1 text-sm">
                    {order.user.name ??
                      "Не вказано"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-600">
                    Email
                  </div>

                  <div className="mt-1 break-all text-sm">
                    {order.user.email}
                  </div>
                </div>

                {order.user.phone && (
                  <div>
                    <div className="text-xs text-zinc-600">
                      Телефон
                    </div>

                    <div className="mt-1 text-sm">
                      {order.user.phone}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ADDRESS */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-zinc-500" />

                <h2 className="font-semibold">
                  Доставка
                </h2>
              </div>

              {order.shippingAddress ? (
                <div className="mt-5 space-y-2 text-sm text-zinc-300">

                  {(order.shippingAddress
                    .firstName ||
                    order.shippingAddress
                      .lastName) && (
                    <div>
                      {
                        order.shippingAddress
                          .firstName
                      }{" "}
                      {
                        order.shippingAddress
                          .lastName
                      }
                    </div>
                  )}

                  {order.shippingAddress
                    .phone && (
                    <div className="text-zinc-500">
                      {
                        order.shippingAddress
                          .phone
                      }
                    </div>
                  )}

                  {order.shippingAddress
                    .city && (
                    <div>
                      {
                        order.shippingAddress
                          .city
                      }
                    </div>
                  )}

                  {order.shippingAddress
                    .street && (
                    <div>
                      {
                        order.shippingAddress
                          .street
                      }

                      {order.shippingAddress
                        .building &&
                        `, ${order.shippingAddress.building}`}

                      {order.shippingAddress
                        .apartment &&
                        `, кв. ${order.shippingAddress.apartment}`}
                    </div>
                  )}

                  {order.shippingAddress
                    .novaPoshtaWarehouse && (
                    <div className="rounded-xl bg-white/[0.04] p-3 text-xs text-zinc-400">
                      Нова пошта:{" "}
                      {
                        order.shippingAddress
                          .novaPoshtaWarehouse
                      }
                    </div>
                  )}

                  {order.shippingAddress
                    .postalCode && (
                    <div className="text-xs text-zinc-600">
                      Індекс:{" "}
                      {
                        order.shippingAddress
                          .postalCode
                      }
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 text-sm text-zinc-600">
                  Адреса не вказана.
                </div>
              )}
            </section>

            {/* TOTAL */}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

              <h2 className="font-semibold">
                Розрахунок
              </h2>

              <div className="mt-5 space-y-3 text-sm">

                <div className="flex justify-between gap-4 text-zinc-500">
                  <span>Товари</span>

                  <span>
                    {money(order.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-zinc-500">
                  <span>Знижка</span>

                  <span>
                    -{" "}
                    {money(
                      order.discountAmount
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-zinc-500">
                  <span>Доставка</span>

                  <span>
                    {money(
                      order.deliveryAmount
                    )}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-4">

                  <div className="flex items-end justify-between gap-4">

                    <span className="font-semibold">
                      Разом
                    </span>

                    <span className="text-2xl font-bold">
                      {money(order.total)}
                    </span>

                  </div>
                </div>
              </div>
            </section>

            {/* NOTE */}

            {order.customerNote && (
              <section className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] p-5">

                <h2 className="font-semibold text-amber-200">
                  Коментар покупця
                </h2>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                  {order.customerNote}
                </p>

              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}