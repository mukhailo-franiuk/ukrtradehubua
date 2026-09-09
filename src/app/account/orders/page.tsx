"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  shopId: string;
  productTitle: string;
  sku: string | null;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  product?: {
    id: string;
    title: string;
    slug: string;
    images?: Array<{
      id: string;
      url: string;
      thumbnailUrl?: string | null;
      alt?: string | null;
      sortOrder: number;
      isPrimary: boolean;
    }>;
  };
  variant?: {
    id: string;
    name?: string;
    title?: string;
  } | null;
  shop?: {
    id: string;
    name: string;
    slug: string;
  };
};

type OrderSeller = {
  id: string;
  shopId: string;
  subtotal: string | number;
  shipping: string | number;
  total: string | number;
  status: string;
  shop?: {
    id: string;
    name: string;
    slug: string;
  };
};

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  provider: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ShippingAddress = {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  region?: string | null;
  street?: string | null;
  house?: string | null;
  apartment?: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string | number;
  discountAmount: string | number;
  deliveryAmount: string | number;
  total: string | number;
  customerNote: string | null;
  shippingMethod: string | null;
  shippingAddress: ShippingAddress | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  sellers: OrderSeller[];
  payments: Payment[];
};

type OrdersResponse = {
  orders?: Order[];
  error?: string;
};

type Filter =
  | "ALL"
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

const FILTERS: Array<{
  value: Filter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "Усі",
  },
  {
    value: "PENDING",
    label: "Очікують",
  },
  {
    value: "PROCESSING",
    label: "В обробці",
  },
  {
    value: "SHIPPED",
    label: "Відправлені",
  },
  {
    value: "DELIVERED",
    label: "Доставлені",
  },
  {
    value: "CANCELLED",
    label: "Скасовані",
  },
  {
    value: "RETURNED",
    label: "Повернення",
  },
];

function toNumber(value: string | number | null | undefined) {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
}

function formatPrice(
  value: string | number | null | undefined
) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getStatusInfo(status: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Очікує підтвердження",
        className:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",
        icon: Clock3,
      };

    case "PROCESSING":
      return {
        label: "В обробці",
        className:
          "border-blue-400/20 bg-blue-400/10 text-blue-300",
        icon: Package,
      };

    case "SHIPPED":
      return {
        label: "Відправлено",
        className:
          "border-violet-400/20 bg-violet-400/10 text-violet-300",
        icon: Truck,
      };

    case "DELIVERED":
      return {
        label: "Доставлено",
        className:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        icon: CheckCircle2,
      };

    case "CANCELLED":
      return {
        label: "Скасовано",
        className:
          "border-red-400/20 bg-red-400/10 text-red-300",
        icon: XCircle,
      };

    case "RETURNED":
      return {
        label: "Повернення",
        className:
          "border-orange-400/20 bg-orange-400/10 text-orange-300",
        icon: RefreshCw,
      };

    case "COMPLETED":
      return {
        label: "Завершено",
        className:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        icon: CheckCircle2,
      };

    default:
      return {
        label: status || "Невідомий статус",
        className:
          "border-white/10 bg-white/5 text-zinc-300",
        icon: Package,
      };
  }
}

function getPaymentInfo(order: Order) {
  const payment = order.payments?.[0];

  if (!payment) {
    return {
      label: "Оплата не створена",
      className: "text-zinc-500",
    };
  }

  switch (payment.status) {
    case "PAID":
      return {
        label: "Оплачено",
        className: "text-emerald-400",
      };

    case "PROCESSING":
      return {
        label: "Оплата обробляється",
        className: "text-blue-400",
      };

    case "FAILED":
      return {
        label: "Помилка оплати",
        className: "text-red-400",
      };

    case "CANCELLED":
      return {
        label: "Оплату скасовано",
        className: "text-zinc-500",
      };

    case "REFUNDED":
      return {
        label: "Кошти повернено",
        className: "text-orange-400",
      };

    case "PENDING":
      return {
        label: "Очікує оплати",
        className: "text-amber-400",
      };

    default:
      return {
        label: payment.status,
        className: "text-zinc-400",
      };
  }
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case "CARD":
      return "Банківська картка";

    case "APPLE_PAY":
      return "Apple Pay";

    case "GOOGLE_PAY":
      return "Google Pay";

    case "CASH_ON_DELIVERY":
      return "Післяплата";

    case "BANK_TRANSFER":
      return "Банківський переказ";

    default:
      return method;
  }
}

function getDeliveryMethodLabel(method: string | null) {
  switch (method) {
    case "NOVA_POSHTA":
      return "Нова пошта";

    case "UKRPOSHTA":
      return "Укрпошта";

    case "MIST":
      return "Meest";

    case "COURIER":
      return "Курʼєрська доставка";

    case "PICKUP":
      return "Самовивіз";

    default:
      return "Не вказано";
  }
}

function getPrimaryImage(item: OrderItem) {
  const images = item.product?.images ?? [];

  return (
    images.find((image) => image.isPrimary)?.thumbnailUrl ??
    images.find((image) => image.isPrimary)?.url ??
    images[0]?.thumbnailUrl ??
    images[0]?.url ??
    null
  );
}

function getItemsCount(order: Order) {
  return order.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
}

function getUniqueShops(order: Order) {
  const shops = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
    }
  >();

  for (const item of order.items) {
    if (item.shop) {
      shops.set(item.shop.id, item.shop);
    }
  }

  return Array.from(shops.values());
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadOrders(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/orders", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const json =
        (await response.json()) as OrdersResponse;

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          json.error ??
            "Не вдалося завантажити замовлення."
        );
      }

      setOrders(
        Array.isArray(json.orders)
          ? json.orders
          : []
      );
    } catch (err) {
      console.error(
        "ACCOUNT ORDERS LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити замовлення."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") {
      return orders;
    }

    return orders.filter(
      (order) => order.status === filter
    );
  }, [orders, filter]);

  const statistics = useMemo(() => {
    const total = orders.length;

    const active = orders.filter(
      (order) =>
        ![
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
          "RETURNED",
        ].includes(order.status)
    ).length;

    const delivered = orders.filter(
      (order) =>
        order.status === "DELIVERED" ||
        order.status === "COMPLETED"
    ).length;

    const cancelled = orders.filter(
      (order) => order.status === "CANCELLED"
    ).length;

    return {
      total,
      active,
      delivered,
      cancelled,
    };
  }, [orders]);

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
              <Link
                href="/account"
                className="transition hover:text-white"
              >
                Мій кабінет
              </Link>

              <ChevronRight className="h-3.5 w-3.5" />

              <span className="text-zinc-300">
                Замовлення
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Мої замовлення
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Переглядайте історію покупок, статуси,
              оплату та деталі кожного замовлення.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadOrders(true)}
            disabled={refreshing || loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Оновити
          </button>
        </div>

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        {!loading && !error && orders.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={ShoppingBag}
              label="Усього замовлень"
              value={statistics.total}
            />

            <StatCard
              icon={Clock3}
              label="Активні"
              value={statistics.active}
            />

            <StatCard
              icon={CheckCircle2}
              label="Доставлені"
              value={statistics.delivered}
            />

            <StatCard
              icon={XCircle}
              label="Скасовані"
              value={statistics.cancelled}
            />
          </div>
        )}

        {/* =====================================================
            FILTERS
        ====================================================== */}

        {!loading && !error && orders.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2">
              {FILTERS.map((item) => {
                const active =
                  filter === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setFilter(item.value)
                    }
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      active
                        ? "bg-amber-400 text-black"
                        : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================
            LOADING
        ====================================================== */}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <OrderSkeleton key={index} />
              )
            )}
          </div>
        )}

        {/* =====================================================
            ERROR
        ====================================================== */}

        {!loading && error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-lg font-black">
              Не вдалося завантажити замовлення
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadOrders()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              <RefreshCw className="h-4 w-4" />
              Спробувати ще раз
            </button>
          </div>
        )}

        {/* =====================================================
            EMPTY
        ====================================================== */}

        {!loading &&
          !error &&
          orders.length === 0 && (
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-400/10 bg-amber-400/[0.06] text-amber-400">
                <ShoppingBag className="h-9 w-9" />
              </div>

              <h2 className="mt-6 text-2xl font-black">
                У вас ще немає замовлень
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
                Знайдіть цікаві товари на UkrTradeHub
                та оформіть своє перше замовлення.
              </p>

              <Link
                href="/products"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-300"
              >
                Перейти до покупок
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

        {/* =====================================================
            FILTER EMPTY
        ====================================================== */}

        {!loading &&
          !error &&
          orders.length > 0 &&
          filteredOrders.length === 0 && (
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] px-6 py-14 text-center">
              <Package className="mx-auto h-10 w-10 text-zinc-600" />

              <h2 className="mt-4 text-lg font-black">
                Замовлень у цій категорії немає
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Спробуйте вибрати інший статус.
              </p>
            </div>
          )}

        {/* =====================================================
            ORDERS
        ====================================================== */}

        {!loading &&
          !error &&
          filteredOrders.length > 0 && (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                />
              ))}
            </div>
          )}
      </div>
    </main>
  );
}

/*
 * ============================================================
 * STAT CARD
 * ============================================================
 */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
          <Icon className="h-4 w-4" />
        </div>

        <span className="text-2xl font-black text-white">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-medium text-zinc-500">
        {label}
      </p>
    </div>
  );
}

/*
 * ============================================================
 * ORDER CARD
 * ============================================================
 */

function OrderCard({
  order,
}: {
  order: Order;
}) {
  const status = getStatusInfo(order.status);
  const StatusIcon = status.icon;

  const payment = getPaymentInfo(order);

  const itemsCount = getItemsCount(order);
  const shops = getUniqueShops(order);

  const visibleItems = order.items.slice(0, 4);
  const remainingItems = Math.max(
    0,
    order.items.length - visibleItems.length
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] transition hover:border-white/[0.11] hover:bg-white/[0.035]">
      {/* ===================================================
          TOP
      ==================================================== */}

      <div className="border-b border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={`/orders/${order.id}`}
                className="text-base font-black text-white transition hover:text-amber-400 sm:text-lg"
              >
                {order.orderNumber}
              </Link>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(order.createdAt)}
              </span>

              <span>
                {itemsCount}{" "}
                {itemsCount === 1
                  ? "товар"
                  : itemsCount < 5
                    ? "товари"
                    : "товарів"}
              </span>

              {shops.length > 0 && (
                <span>
                  {shops.length}{" "}
                  {shops.length === 1
                    ? "магазин"
                    : shops.length < 5
                      ? "магазини"
                      : "магазинів"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-5 lg:justify-end">
            <div className="text-left lg:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                Сума
              </p>

              <p className="mt-1 text-xl font-black text-amber-400">
                {formatPrice(order.total)}
              </p>
            </div>

            <Link
              href={`/orders/${order.id}`}
              aria-label={`Переглянути замовлення ${order.orderNumber}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ===================================================
          ITEMS
      ==================================================== */}

      <div className="p-5 sm:p-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleItems.map((item) => {
            const image = getPrimaryImage(item);

            return (
              <div
                key={item.id}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090b10] sm:h-24 sm:w-24"
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={
                      item.product?.title ??
                      item.productTitle
                    }
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-700">
                    <Package className="h-7 w-7" />
                  </div>
                )}

                <div className="absolute bottom-1.5 right-1.5 flex min-w-6 items-center justify-center rounded-lg bg-black/75 px-1.5 py-1 text-[10px] font-black text-white backdrop-blur">
                  ×{item.quantity}
                </div>
              </div>
            );
          })}

          {remainingItems > 0 && (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-xs font-bold text-zinc-500 sm:h-24 sm:w-24">
              +{remainingItems}
            </div>
          )}
        </div>

        {/* =================================================
            INFO GRID
        ================================================== */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            icon={CreditCard}
            label="Оплата"
            value={payment.label}
            valueClassName={payment.className}
          />

          <InfoItem
            icon={Truck}
            label="Доставка"
            value={getDeliveryMethodLabel(
              order.shippingMethod
            )}
          />

          <InfoItem
            icon={ShoppingBag}
            label="Продавці"
            value={
              shops.length > 0
                ? shops
                    .map((shop) => shop.name)
                    .join(", ")
                : "—"
            }
          />

          <InfoItem
            icon={CalendarDays}
            label="Дата"
            value={formatShortDate(order.createdAt)}
          />
        </div>

        {/* =================================================
            PAYMENT METHOD
        ================================================== */}

        {order.payments?.[0] && (
          <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/[0.05] bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CreditCard className="h-3.5 w-3.5" />

              <span>
                {getPaymentMethodLabel(
                  order.payments[0].method
                )}
              </span>
            </div>

            <span
              className={`text-xs font-bold ${payment.className}`}
            >
              {payment.label}
            </span>
          </div>
        )}

        {/* =================================================
            FOOTER
        ================================================== */}

        <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-600">
            {order.shippingAddress?.city
              ? `Доставка: ${order.shippingAddress.city}`
              : "Адресу доставки не вказано"}
          </div>

          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-xs font-black text-zinc-200 transition hover:bg-amber-400 hover:text-black"
          >
            Детальніше
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/*
 * ============================================================
 * INFO ITEM
 * ============================================================
 */

function InfoItem({
  icon: Icon,
  label,
  value,
  valueClassName = "text-zinc-200",
}: {
  icon: typeof Package;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/10 p-3.5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <p
        className={`mt-2 truncate text-xs font-bold ${valueClassName}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

/*
 * ============================================================
 * SKELETON
 * ============================================================
 */

function OrderSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02]">
      <div className="animate-pulse p-5 sm:p-6">
        <div className="flex items-center justify-between gap-5">
          <div className="space-y-3">
            <div className="h-5 w-44 rounded-lg bg-white/[0.06]" />
            <div className="h-3 w-64 rounded-lg bg-white/[0.04]" />
          </div>

          <div className="hidden h-10 w-28 rounded-xl bg-white/[0.05] sm:block" />
        </div>

        <div className="mt-6 flex gap-2">
          <div className="h-24 w-24 rounded-2xl bg-white/[0.05]" />
          <div className="h-24 w-24 rounded-2xl bg-white/[0.05]" />
          <div className="h-24 w-24 rounded-2xl bg-white/[0.05]" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-16 rounded-2xl bg-white/[0.04]" />
          <div className="h-16 rounded-2xl bg-white/[0.04]" />
          <div className="h-16 rounded-2xl bg-white/[0.04]" />
          <div className="h-16 rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}