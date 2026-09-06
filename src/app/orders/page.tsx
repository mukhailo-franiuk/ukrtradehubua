
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Loader2,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";

type Order = {
  id: string;
  orderNumber: string;
  status: string;

  subtotal: number | string;
  discountAmount: number | string;
  deliveryAmount: number | string;
  total: number | string;

  shippingMethod: string | null;

  createdAt: string;
  updatedAt: string;

  items: {
    id: string;
    productTitle: string;
    quantity: number;
    unitPrice: number | string;
    totalPrice: number | string;

    shop: {
      id: string;
      name: string;
      slug: string;
    };

    product: {
      images: {
        id: string;
        url: string;
        thumbnailUrl: string | null;
        isPrimary: boolean;
        sortOrder: number;
      }[];
    };
  }[];

  sellers: {
    id: string;
    subtotal: number | string;
    shipping: number | string;
    total: number | string;
    status: string;

    shop: {
      id: string;
      name: string;
      slug: string;
    };
  }[];

  payments: {
    id: string;
    amount: number | string;
    method: string;
    status: string;
  }[];
};

function money(value: number | string) {
  return Number(value).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string) {
  const statuses: Record<string, string> = {
    PENDING: "Очікує підтвердження",
    PROCESSING: "В обробці",
    CONFIRMED: "Підтверджено",
    SHIPPED: "Відправлено",
    DELIVERED: "Доставлено",
    COMPLETED: "Завершено",
    CANCELLED: "Скасовано",
    RETURNED: "Повернено",
    REFUNDED: "Повернення коштів",
  };

  return statuses[status] ?? status;
}

function getStatusClass(status: string) {
  switch (status) {
    case "DELIVERED":
    case "COMPLETED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

    case "SHIPPED":
      return "border-blue-500/20 bg-blue-500/10 text-blue-400";

    case "PROCESSING":
    case "CONFIRMED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";

    case "CANCELLED":
    case "RETURNED":
    case "REFUNDED":
      return "border-red-500/20 bg-red-500/10 text-red-400";

    default:
      return "border-white/10 bg-white/5 text-gray-300";
  }
}

function getPaymentStatusLabel(status: string) {
  const statuses: Record<string, string> = {
    PENDING: "Очікує оплати",
    PROCESSING: "Обробляється",
    PAID: "Оплачено",
    FAILED: "Помилка",
    REFUNDED: "Повернено",
    PARTIALLY_REFUNDED: "Частково повернено",
    CANCELLED: "Скасовано",
  };

  return statuses[status] ?? status;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/orders", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login?redirect=/orders";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Не вдалося завантажити замовлення"
        );
      }

      setOrders(data.orders ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити замовлення"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />

            <p className="text-sm text-gray-400">
              Завантажуємо твої замовлення...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <Package className="mx-auto mb-4 h-10 w-10 text-red-400" />

            <h1 className="text-xl font-semibold">
              Не вдалося завантажити замовлення
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadOrders}
              className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Спробувати ще раз
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Головна
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="text-gray-300">
              Мої замовлення
            </span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Мої замовлення
              </h1>

              <p className="mt-2 text-gray-400">
                Переглядай історію покупок та статус доставки
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium transition hover:bg-white/[0.07]"
            >
              <ShoppingBag className="h-4 w-4" />
              Продовжити покупки
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10">
              <Package className="h-10 w-10 text-amber-400" />
            </div>

            <h2 className="mt-6 text-2xl font-semibold">
              Замовлень поки немає
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-400">
              Коли ти зробиш перше замовлення, воно зʼявиться тут.
            </p>

            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Перейти до товарів
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const firstItem = order.items[0];

              const image =
                firstItem?.product?.images?.find(
                  (item) => item.isPrimary
                )?.url ??
                firstItem?.product?.images?.[0]?.url ??
                null;

              const itemCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0
              );

              const payment = order.payments?.[0];

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition hover:border-amber-400/30 hover:bg-white/[0.04]"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="font-semibold">
                            Замовлення #{order.orderNumber}
                          </h2>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(order.createdAt)}
                          </span>

                          <span>•</span>

                          <span>
                            {itemCount}{" "}
                            {itemCount === 1
                              ? "товар"
                              : itemCount < 5
                                ? "товари"
                                : "товарів"}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-xs text-gray-500">
                          Сума замовлення
                        </div>

                        <div className="mt-1 text-xl font-bold text-amber-400">
                          {money(order.total)} ₴
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                        {image ? (
                          <img
                            src={image}
                            alt={firstItem?.productTitle ?? "Товар"}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-8 w-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-medium">
                          {firstItem?.productTitle ?? "Товар"}
                        </h3>

                        {order.items.length > 1 && (
                          <p className="mt-2 text-sm text-gray-500">
                            та ще {order.items.length - 1}{" "}
                            {order.items.length - 1 === 1
                              ? "товар"
                              : order.items.length - 1 < 5
                                ? "товари"
                                : "товарів"}
                          </p>
                        )}

                        {firstItem?.shop && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                            <Store className="h-4 w-4" />
                            {firstItem.shop.name}
                          </div>
                        )}
                      </div>

                      <div className="hidden items-center sm:flex">
                        <ChevronRight className="h-5 w-5 text-gray-600 transition group-hover:translate-x-1 group-hover:text-amber-400" />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        {order.sellers.slice(0, 3).map((seller) => (
                          <span
                            key={seller.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-gray-400"
                          >
                            <Store className="h-3.5 w-3.5" />
                            {seller.shop.name}
                          </span>
                        ))}
                      </div>

                      <div className="text-xs text-gray-500">
                        {payment
                          ? getPaymentStatusLabel(payment.status)
                          : "Оплата ще не створена"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}