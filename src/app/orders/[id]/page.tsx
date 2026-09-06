"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PaymentMethod =
  | "CARD"
  | "CASH_ON_DELIVERY"
  | "BANK_TRANSFER"
  | "APPLE_PAY"
  | "GOOGLE_PAY";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED"
  | "REFUNDED";

type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CANCELLED";

type MonoStatus =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  images: ProductImage[];
};

type Variant = {
  id: string;
  title: string;
  sku: string | null;
  price: number | string | null;
};

type Shop = {
  id: string;
  name: string;
  slug: string;
};

type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  shopId: string;
  productTitle: string;
  sku: string | null;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  product: Product;
  variant: Variant | null;
  shop: Shop;
};

type Seller = {
  id: string;
  shopId: string;
  subtotal: number | string;
  shipping: number | string;
  total: number | string;
  status: OrderStatus;
  shop: Shop;
};

type ShippingAddress = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  novaPoshtaWarehouse: string | null;
  isDefault: boolean;
};

type Payment = {
  id: string;
  orderId: string;
  amount: number | string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  subtotal: number | string;
  discountAmount: number | string;
  deliveryAmount: number | string;
  total: number | string;

  customerNote: string | null;

  shippingAddressId: string | null;
  shippingMethod:
    | "NOVA_POSHTA"
    | "UKRPOSHTA"
    | "MIST"
    | "COURIER"
    | "PICKUP"
    | null;

  createdAt: string;
  updatedAt: string;

  shippingAddress: ShippingAddress | null;

  items: OrderItem[];
  sellers: Seller[];
  payments: Payment[];
};

type PaymentResponse = {
  success: boolean;
  error?: string;

  payment?: {
    id: string;
    orderId: string;
    orderNumber: string;
    amount: number | string;
    method: PaymentMethod;
    status: PaymentStatus;
    provider: string | null;
    transactionId: string | null;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;

  monobank?: {
    available: boolean;
    status: MonoStatus | null;
    invoiceId?: string | null;
    amount?: number;
    ccy?: number;
  } | null;

  order?: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
  };

  finalized?: boolean;
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const ONLINE_METHODS: PaymentMethod[] = [
  "CARD",
  "APPLE_PAY",
  "GOOGLE_PAY",
];

const ACTIVE_PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "PROCESSING",
];

function money(value: number | string) {
  const amount = Number(value);

  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isOnlinePayment(method: PaymentMethod) {
  return ONLINE_METHODS.includes(method);
}

function isActivePayment(payment: Payment) {
  return ACTIVE_PAYMENT_STATUSES.includes(payment.status);
}

function paymentMethodLabel(method: PaymentMethod) {
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

function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "Очікує оплати";

    case "PROCESSING":
      return "Обробляється";

    case "PAID":
      return "Оплачено";

    case "FAILED":
      return "Помилка оплати";

    case "REFUNDED":
      return "Повернено";

    case "PARTIALLY_REFUNDED":
      return "Частково повернено";

    case "CANCELLED":
      return "Скасовано";

    default:
      return status;
  }
}

function orderStatusLabel(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "Очікує оплати";

    case "CONFIRMED":
      return "Підтверджено";

    case "PROCESSING":
      return "В обробці";

    case "SHIPPED":
      return "Відправлено";

    case "DELIVERED":
      return "Доставлено";

    case "COMPLETED":
      return "Завершено";

    case "CANCELLED":
      return "Скасовано";

    case "RETURNED":
      return "Повернення";

    case "REFUNDED":
      return "Кошти повернено";

    default:
      return status;
  }
}

function shippingMethodLabel(
  method: Order["shippingMethod"],
) {
  switch (method) {
    case "NOVA_POSHTA":
      return "Нова пошта";

    case "UKRPOSHTA":
      return "Укрпошта";

    case "MIST":
      return "Meest";

    case "COURIER":
      return "Кур'єрська доставка";

    case "PICKUP":
      return "Самовивіз";

    default:
      return "Не вказано";
  }
}

export default function OrderPage({ params }: Props) {
  const [orderId, setOrderId] = useState<string | null>(
    null,
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<
    string | null
  >(null);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [paymentError, setPaymentError] = useState<
    string | null
  >(null);

  const [syncingPaymentId, setSyncingPaymentId] = useState<
    string | null
  >(null);

  // =====================================================
  // RESOLVE PARAMS
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    params.then(({ id }) => {
      if (!cancelled) {
        setOrderId(id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  // =====================================================
  // LOAD ORDER
  // =====================================================

  const loadOrder = useCallback(
    async (showLoader = false) => {
      if (!orderId) return;

      try {
        if (showLoader) {
          setRefreshing(true);
        }

        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent(
            `/orders/${orderId}`,
          )}`;

          return;
        }

        if (response.status === 404) {
          setError("Замовлення не знайдено");
          setOrder(null);
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Не вдалося завантажити замовлення",
          );
        }

        const data = await response.json();

        if (!data?.order) {
          throw new Error(
            "API не повернув дані замовлення",
          );
        }

        setOrder(data.order);
        setError(null);
      } catch (err) {
        console.error(
          "[ORDER_PAGE] load order error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося завантажити замовлення",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (!orderId) return;

    void loadOrder(true);
  }, [orderId, loadOrder]);

  // =====================================================
  // PAYMENT HELPERS
  // =====================================================

  const onlinePayments = useMemo(() => {
    if (!order) return [];

    return order.payments.filter((payment) =>
      isOnlinePayment(payment.method),
    );
  }, [order]);

  const activeOnlinePayments = useMemo(() => {
    return onlinePayments.filter(isActivePayment);
  }, [onlinePayments]);

  const hasPaidPayment = useMemo(() => {
    if (!order) return false;

    return order.payments.some(
      (payment) => payment.status === "PAID",
    );
  }, [order]);

  /*
   * Беремо останній активний Monobank payment.
   *
   * Це важливо, тому що при повторній оплаті старий
   * invoice може бути CANCELLED, а новий буде PENDING.
   */
  const activeMonobankPayment = useMemo(() => {
    if (!order) return null;

    const payments = order.payments
      .filter(
        (payment) =>
          payment.provider === "MONOBANK" &&
          isOnlinePayment(payment.method) &&
          isActivePayment(payment),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    return payments[0] ?? null;
  }, [order]);

  // =====================================================
  // SYNC MONOBANK PAYMENT
  // =====================================================

  const syncPayment = useCallback(
    async (
      paymentId: string,
      silent = true,
    ): Promise<PaymentResponse | null> => {
      try {
        setSyncingPaymentId(paymentId);

        const response = await fetch(
          `/api/payments/${encodeURIComponent(paymentId)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent(
            orderId
              ? `/orders/${orderId}`
              : "/orders",
          )}`;

          return null;
        }

        const data: PaymentResponse =
          await response.json();

        if (!response.ok || !data.success) {
          if (!silent) {
            throw new Error(
              data.error ||
                "Не вдалося перевірити статус платежу",
            );
          }

          return null;
        }

        /*
         * Якщо API повернув оновлений payment,
         * одразу оновлюємо його локально.
         */
        if (data.payment && order) {
          setOrder((current) => {
            if (!current) return current;

            return {
              ...current,
              payments: current.payments.map(
                (payment) =>
                  payment.id === data.payment?.id
                    ? {
                        ...payment,
                        status:
                          data.payment.status,
                        transactionId:
                          data.payment
                            .transactionId,
                        paidAt:
                          data.payment.paidAt,
                        updatedAt:
                          data.payment.updatedAt,
                      }
                    : payment,
              ),
              status:
                data.order?.status ??
                current.status,
            };
          });
        }

        /*
         * Якщо оплата успішна або Order вже CONFIRMED —
         * повністю перечитуємо Order.
         */
        if (
          data.payment?.status === "PAID" ||
          data.order?.status === "CONFIRMED" ||
          data.finalized
        ) {
          await loadOrder(false);
        }

        return data;
      } catch (err) {
        console.error(
          "[ORDER_PAGE] sync payment error:",
          err,
        );

        if (!silent) {
          setPaymentError(
            err instanceof Error
              ? err.message
              : "Не вдалося перевірити оплату",
          );
        }

        return null;
      } finally {
        setSyncingPaymentId(null);
      }
    },
    [loadOrder, order, orderId],
  );

  // =====================================================
  // MONOBANK POLLING
  // =====================================================

  useEffect(() => {
    if (!activeMonobankPayment) return;

    /*
     * Якщо є PAID payment — polling не потрібен.
     */
    if (hasPaidPayment) return;

    const paymentId = activeMonobankPayment.id;

    /*
     * Перша перевірка одразу після появи payment.
     */
    void syncPayment(paymentId);

    /*
     * Далі кожні 5 секунд.
     */
    const interval = window.setInterval(() => {
      void syncPayment(paymentId);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    activeMonobankPayment,
    hasPaidPayment,
    syncPayment,
  ]);

  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  const handleRefresh = async () => {
    await loadOrder(true);

    if (activeMonobankPayment && !hasPaidPayment) {
      await syncPayment(
        activeMonobankPayment.id,
        false,
      );
    }
  };

  // =====================================================
  // CREATE / RETRY PAYMENT
  // =====================================================

  const handlePayment = async (payment: Payment) => {
    if (!order) return;

    if (hasPaidPayment) {
      setPaymentError(
        "Це замовлення вже має успішний платіж.",
      );

      return;
    }

    if (order.status !== "PENDING") {
      setPaymentError(
        "Для цього замовлення оплата вже недоступна.",
      );

      return;
    }

    try {
      setPaymentLoading(payment.id);
      setPaymentError(null);

      const response = await fetch("/api/payments", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          method: payment.method,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Не вдалося створити платіж",
        );
      }

      /*
       * Для CARD / APPLE_PAY / GOOGLE_PAY backend
       * повертає hosted Monobank invoice URL.
       */
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      /*
       * Для локальних способів просто перечитуємо Order.
       */
      await loadOrder(false);
    } catch (err) {
      console.error(
        "[ORDER_PAGE] payment error:",
        err,
      );

      setPaymentError(
        err instanceof Error
          ? err.message
          : "Не вдалося створити платіж",
      );
    } finally {
      setPaymentLoading(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            Завантаження замовлення...
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !order) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />

            <h1 className="text-xl font-semibold">
              Не вдалося завантажити замовлення
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {error || "Замовлення не знайдено"}
            </p>

            <Link
              href="/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              До моїх замовлень
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // ADDRESS
  // =====================================================

  const address = order.shippingAddress;

  // =====================================================
  // PAYMENT STATE
  // =====================================================

  const pendingPayments = order.payments.filter(
    (payment) =>
      payment.status === "PENDING" ||
      payment.status === "PROCESSING",
  );

  const failedPayments = order.payments.filter(
    (payment) => payment.status === "FAILED",
  );

  const showPaymentSection =
    order.payments.length > 0;

  const isPaymentProcessing =
    activeMonobankPayment !== null &&
    !hasPaidPayment;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/orders"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Мої замовлення
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold sm:text-3xl">
                Замовлення #{order.orderNumber}
              </h1>

              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                {orderStatusLabel(order.status)}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <CalendarDays className="h-4 w-4" />
              {formatDate(order.createdAt)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Оновити
          </button>
        </div>

        {/* =================================================
            SUCCESS
        ================================================= */}

        {hasPaidPayment &&
          order.status !== "CANCELLED" &&
          order.status !== "REFUNDED" && (
            <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />

                <div>
                  <h2 className="font-semibold text-emerald-300">
                    Оплата успішна
                  </h2>

                  <p className="mt-1 text-sm text-emerald-200/80">
                    Платіж підтверджено. Замовлення
                    передано в обробку.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* =================================================
            MONOBANK POLLING
        ================================================= */}

        {isPaymentProcessing &&
          !hasPaidPayment && (
            <div className="mb-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
              <div className="flex gap-3">
                <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-blue-400" />

                <div>
                  <h2 className="font-semibold text-blue-300">
                    Очікуємо підтвердження оплати
                  </h2>

                  <p className="mt-1 text-sm text-blue-200/80">
                    Ми автоматично перевіряємо статус
                    платежу Monobank.
                  </p>

                  {syncingPaymentId && (
                    <p className="mt-2 text-xs text-blue-300/70">
                      Перевірка статусу...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* =================================================
            PAYMENT ERROR
        ================================================= */}

        {paymentError && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />

              <div>
                <p className="text-sm font-medium text-red-300">
                  {paymentError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            MAIN GRID
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* =================================================
              LEFT
          ================================================= */}

          <div className="space-y-6">
            {/* =================================================
                ITEMS
            ================================================= */}

            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-amber-400" />

                    <h2 className="font-semibold">
                      Товари
                    </h2>
                  </div>

                  <span className="text-sm text-slate-400">
                    {order.items.length}{" "}
                    {order.items.length === 1
                      ? "позиція"
                      : "позицій"}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {order.items.map((item) => {
                  const image =
                    item.product.images.find(
                      (img) => img.isPrimary,
                    ) ??
                    item.product.images[0];

                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 p-5 sm:p-6"
                    >
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                        {image ? (
                          <img
                            src={
                              image.thumbnailUrl ??
                              image.url
                            }
                            alt={
                              image.alt ??
                              item.productTitle
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-600">
                            <Package className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="line-clamp-2 font-medium text-white transition hover:text-amber-300"
                        >
                          {item.productTitle}
                        </Link>

                        {item.variant?.title && (
                          <p className="mt-1 text-sm text-slate-400">
                            {item.variant.title}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          SKU:{" "}
                          {item.sku ??
                            item.variant?.sku ??
                            item.product.sku ??
                            "—"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                          <span className="text-slate-400">
                            {money(item.unitPrice)} ×{" "}
                            {item.quantity}
                          </span>

                          <span className="font-semibold text-white">
                            {money(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* =================================================
                SHOPS
            ================================================= */}

            {order.sellers.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Store className="h-5 w-5 text-amber-400" />

                  <h2 className="font-semibold">
                    Продавці
                  </h2>
                </div>

                <div className="space-y-3">
                  {order.sellers.map((seller) => (
                    <Link
                      key={seller.id}
                      href={`/shop/${seller.shop.slug}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]"
                    >
                      <div>
                        <p className="font-medium">
                          {seller.shop.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {money(seller.subtotal)}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-slate-500" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* =================================================
                SHIPPING
            ================================================= */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Truck className="h-5 w-5 text-amber-400" />

                <h2 className="font-semibold">
                  Доставка
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                  <div className="text-sm">
                    <p className="font-medium">
                      {shippingMethodLabel(
                        order.shippingMethod,
                      )}
                    </p>

                    {address && (
                      <div className="mt-2 space-y-1 text-slate-400">
                        {(address.firstName ||
                          address.lastName) && (
                          <p>
                            {[
                              address.firstName,
                              address.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}

                        {address.phone && (
                          <p>{address.phone}</p>
                        )}

                        {address.city && (
                          <p>
                            {[
                              address.region,
                              address.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}

                        {(address.street ||
                          address.building ||
                          address.apartment) && (
                          <p>
                            {[
                              address.street,
                              address.building,
                              address.apartment
                                ? `кв. ${address.apartment}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}

                        {address.novaPoshtaWarehouse && (
                          <p>
                            {address.novaPoshtaWarehouse}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================
                NOTE
            ================================================= */}

            {order.customerNote && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <h2 className="mb-3 font-semibold">
                  Коментар до замовлення
                </h2>

                <p className="text-sm leading-6 text-slate-400">
                  {order.customerNote}
                </p>
              </section>
            )}
          </div>

          {/* =================================================
              RIGHT
          ================================================= */}

          <aside className="space-y-6">
            {/* =================================================
                SUMMARY
            ================================================= */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="mb-5 font-semibold">
                Підсумок
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Товари
                  </span>

                  <span>
                    {money(order.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Знижка
                  </span>

                  <span className="text-emerald-400">
                    −{money(order.discountAmount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">
                    Доставка
                  </span>

                  <span>
                    {money(order.deliveryAmount)}
                  </span>
                </div>

                <div className="my-4 border-t border-white/10" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-slate-300">
                    Разом
                  </span>

                  <span className="text-2xl font-bold text-amber-400">
                    {money(order.total)}
                  </span>
                </div>
              </div>
            </section>

            {/* =================================================
                PAYMENTS
            ================================================= */}

            {showPaymentSection && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-amber-400" />

                    <h2 className="font-semibold">
                      Оплата
                    </h2>
                  </div>

                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>

                <div className="space-y-3">
                  {order.payments.map((payment) => {
                    const isLoading =
                      paymentLoading === payment.id;

                    const canPay =
                      !hasPaidPayment &&
                      order.status === "PENDING" &&
                      isOnlinePayment(
                        payment.method,
                      ) &&
                      (payment.status ===
                        "PENDING" ||
                        payment.status ===
                          "FAILED");

                    return (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-white/10 bg-black/10 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="rounded-xl bg-white/5 p-2">
                              {payment.method ===
                                "CASH_ON_DELIVERY" ? (
                                <Wallet className="h-4 w-4 text-slate-300" />
                              ) : (
                                <CreditCard className="h-4 w-4 text-slate-300" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium">
                                {paymentMethodLabel(
                                  payment.method,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {paymentStatusLabel(
                                  payment.status,
                                )}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 text-sm font-semibold">
                            {money(payment.amount)}
                          </span>
                        </div>

                        {payment.provider ===
                          "MONOBANK" &&
                          payment.transactionId && (
                            <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs text-slate-500">
                              <div>
                                Monobank invoice
                              </div>

                              <div className="mt-1 break-all font-mono text-slate-400">
                                {
                                  payment.transactionId
                                }
                              </div>
                            </div>
                          )}

                        {payment.paidAt && (
                          <p className="mt-3 text-xs text-emerald-400">
                            Оплачено:{" "}
                            {formatDate(
                              payment.paidAt,
                            )}
                          </p>
                        )}

                        {canPay && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePayment(payment)
                            }
                            disabled={isLoading}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Створення платежу...
                              </>
                            ) : payment.status ===
                              "FAILED" ? (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Повторити оплату
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4" />
                                Оплатити зараз
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* =================================================
                PENDING
            ================================================= */}

            {pendingPayments.length > 0 &&
              !hasPaidPayment && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <div className="flex gap-3">
                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-400" />

                    <div>
                      <p className="text-sm font-medium text-amber-300">
                        Очікується оплата
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-200/70">
                        Якщо ви вже оплатили замовлення,
                        статус оновиться автоматично.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* =================================================
                FAILED
            ================================================= */}

            {failedPayments.length > 0 &&
              !hasPaidPayment && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                    <div>
                      <p className="text-sm font-medium text-red-300">
                        Попередня спроба оплати неуспішна
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-200/70">
                        Ви можете повторити оплату через
                        кнопку вище.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* =================================================
                SECURITY
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />

                <div>
                  <p className="text-sm font-medium">
                    Безпечна оплата
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Дані банківської картки не зберігаються
                    на UkrTradeHub. Онлайн-платіж обробляється
                    через Monobank.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}