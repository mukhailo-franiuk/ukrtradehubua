import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  ShoppingBag,
  Store,
  Truck,
  User,
  XCircle,
} from "lucide-react";

import { db } from "@/lib/prisma";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: OrderPageProps): Promise<Metadata> {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: {
      id,
    },
    select: {
      orderNumber: true,
    },
  });

  if (!order) {
    return {
      title: "Замовлення не знайдено | UkrTradeHub Admin",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `Замовлення #${order.orderNumber} | UkrTradeHub Admin`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "—";
  }

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

function orderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";

    case "CONFIRMED":
      return "Підтверджене";

    case "PAID":
      return "Оплачене";

    case "PROCESSING":
      return "В обробці";

    case "SHIPPED":
      return "Відправлене";

    case "DELIVERED":
      return "Доставлене";

    case "CANCELLED":
      return "Скасоване";

    case "REFUNDED":
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

    case "PAID":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "PROCESSING":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";

    case "SHIPPED":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

    case "DELIVERED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "CANCELLED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "REFUNDED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує оплати";

    case "PAID":
      return "Оплачено";

    case "FAILED":
      return "Помилка оплати";

    case "REFUNDED":
      return "Повернено";

    case "PARTIAL_REFUND":
      return "Часткове повернення";

    default:
      return status;
  }
}

function paymentStatusStyle(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "FAILED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "REFUNDED":
    case "PARTIAL_REFUND":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case "CASH":
      return "Готівка";

    case "CARD":
      return "Картка";

    case "ONLINE":
      return "Онлайн-оплата";

    case "COD":
      return "Післяплата";

    default:
      return method;
  }
}

function deliveryMethodLabel(method: string | null | undefined) {
  switch (method) {
    case "NOVA_POSHTA":
      return "Нова пошта";

    case "UKRPOSHTA":
      return "Укрпошта";

    case "MIST":
      return "Meest";

    case "COURIER":
      return "Кур'єр";

    case "PICKUP":
      return "Самовивіз";

    default:
      return method || "Не вказано";
  }
}

function deliveryStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";

    case "PROCESSING":
      return "В обробці";

    case "SHIPPED":
      return "Відправлено";

    case "IN_TRANSIT":
      return "У дорозі";

    case "DELIVERED":
      return "Доставлено";

    case "RETURNED":
      return "Повернено";

    default:
      return status;
  }
}

function deliveryStatusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "PROCESSING":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";

    case "SHIPPED":
    case "IN_TRANSIT":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

    case "DELIVERED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "RETURNED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function initials(
  name: string | null,
  email: string
) {
  const source = name?.trim() || email.trim();

  return source.charAt(0).toUpperCase();
}

export default async function AdminOrderPage({
  params,
}: OrderPageProps) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: {
      id,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isBlocked: true,
          createdAt: true,
        },
      },

      shippingAddress: true,

      items: {
        orderBy: {
          createdAt: "asc",
        },

        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              status: true,
            },
          },

          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },

          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              sellerStatus: true,
            },
          },
        },
      },

      sellers: {
        orderBy: {
          createdAt: "asc",
        },

        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              sellerStatus: true,
              isActive: true,
            },
          },
        },
      },

      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },

      delivery: true,

      returnRequests: {
        orderBy: {
          createdAt: "desc",
        },
      },

      couponUsages: {
        include: {
          coupon: {
            select: {
              id: true,
              code: true,
              type: true,
              value: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const totalItems = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const paidPayment = order.payments.find(
    (payment) => payment.status === "PAID"
  );

  const latestPayment = order.payments[0] ?? null;

  const paymentStatus =
    paidPayment?.status ??
    latestPayment?.status ??
    "PENDING";

  const customerInitial = initials(
    order.user.name,
    order.user.email
  );

  const address = order.shippingAddress;

  const recipientName =
    `${address?.firstName ?? ""} ${address?.lastName ?? ""}`.trim();

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6">
          <Link
            href="/admin/orders"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до замовлень
          </Link>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-400/10">
                <ShoppingBag className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Замовлення #{order.orderNumber}
                  </h1>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${orderStatusStyle(
                      order.status
                    )}`}
                  >
                    {orderStatusLabel(order.status)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-zinc-500">
                  Створено {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${paymentStatusStyle(
                  paymentStatus
                )}`}
              >
                {paymentStatus === "PAID" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : paymentStatus === "FAILED" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}

                {paymentStatusLabel(paymentStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* CONTENT */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* MAIN */}

          <div className="space-y-6">

            {/* ORDER SUMMARY */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Підсумок замовлення
                  </h2>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2 lg:grid-cols-4">
                <StatBox
                  label="Товарів"
                  value={totalItems.toLocaleString("uk-UA")}
                  icon={<Package className="h-4 w-4" />}
                />

                <StatBox
                  label="Підсумок товарів"
                  value={formatMoney(order.subtotal)}
                  icon={<ShoppingBag className="h-4 w-4" />}
                />

                <StatBox
                  label="Доставка"
                  value={formatMoney(order.deliveryAmount)}
                  icon={<Truck className="h-4 w-4" />}
                />

                <StatBox
                  label="Всього"
                  value={formatMoney(order.total)}
                  icon={<ReceiptText className="h-4 w-4" />}
                  accent
                />
              </div>
            </section>

            {/* PRODUCTS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Товари
                  </h2>
                </div>

                <span className="text-xs text-zinc-600">
                  {totalItems} шт.
                </span>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <Package className="h-6 w-6 text-zinc-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/products/${item.productId}`}
                            className="text-sm font-bold text-white transition hover:text-amber-400"
                          >
                            {item.productTitle}
                          </Link>

                          {item.variant && (
                            <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-zinc-500">
                              {item.variant.name}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                          {item.sku && (
                            <span>
                              SKU: {item.sku}
                            </span>
                          )}

                          <span>
                            ID: {item.productId}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Store className="h-3.5 w-3.5 text-zinc-700" />

                          <Link
                            href={`/admin/sellers/${item.shop.id}`}
                            className="text-xs font-semibold text-zinc-500 transition hover:text-amber-400"
                          >
                            {item.shop.name}
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-5 sm:min-w-[330px] sm:text-right">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-zinc-700">
                            Ціна
                          </div>

                          <div className="mt-1 text-sm font-bold text-zinc-300">
                            {formatMoney(item.unitPrice)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-zinc-700">
                            Кількість
                          </div>

                          <div className="mt-1 text-sm font-bold text-zinc-300">
                            × {item.quantity}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-zinc-700">
                            Сума
                          </div>

                          <div className="mt-1 text-sm font-black text-white">
                            {formatMoney(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {order.items.length === 0 && (
                  <EmptyState text="Товарів у замовленні немає." />
                )}
              </div>
            </section>

            {/* SELLERS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Продавці
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {order.sellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                          <Store className="h-5 w-5" />
                        </div>

                        <div>
                          <Link
                            href={`/admin/sellers/${seller.shop.id}`}
                            className="text-sm font-bold text-white transition hover:text-amber-400"
                          >
                            {seller.shop.name}
                          </Link>

                          <div className="mt-0.5 text-xs text-zinc-600">
                            /{seller.shop.slug}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5">
                        <SellerAmount
                          label="Товари"
                          value={formatMoney(seller.subtotal)}
                        />

                        <SellerAmount
                          label="Доставка"
                          value={formatMoney(seller.shipping)}
                        />

                        <SellerAmount
                          label="Разом"
                          value={formatMoney(seller.total)}
                          strong
                        />

                        <span
                          className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase ${orderStatusStyle(
                            seller.status
                          )}`}
                        >
                          {orderStatusLabel(seller.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {order.sellers.length === 0 && (
                  <EmptyState text="Продавців не знайдено." />
                )}
              </div>
            </section>

            {/* CUSTOMER */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Покупець
                  </h2>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-lg font-black text-black">
                    {customerInitial}
                  </div>

                  <div className="flex-1">
                    <div className="text-lg font-black text-white">
                      {order.user.name || "Без імені"}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
                      <span className="inline-flex items-center gap-2">
                        <ReceiptText className="h-3.5 w-3.5" />
                        {order.user.email}
                      </span>

                      {order.user.phone && (
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          {order.user.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/admin/users/${order.user.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-white"
                  >
                    Профіль покупця
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </section>

            {/* SHIPPING ADDRESS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Адреса доставки
                  </h2>
                </div>
              </div>

              <div className="p-5">
                {address ? (
                  <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.05] sm:grid-cols-2">
                    <InfoItem
                      label="Отримувач"
                      value={recipientName || "—"}
                    />

                    <InfoItem
                      label="Телефон"
                      value={address.phone || "—"}
                    />

                    <InfoItem
                      label="Країна"
                      value={address.country || "—"}
                    />

                    <InfoItem
                      label="Область"
                      value={address.region || "—"}
                    />

                    <InfoItem
                      label="Місто"
                      value={address.city || "—"}
                    />

                    <InfoItem
                      label="Вулиця"
                      value={address.street || "—"}
                    />

                    <InfoItem
                      label="Будинок"
                      value={address.building || "—"}
                    />

                    <InfoItem
                      label="Квартира"
                      value={address.apartment || "—"}
                    />

                    <InfoItem
                      label="Поштовий індекс"
                      value={address.postalCode || "—"}
                    />

                    <InfoItem
                      label="Нова пошта — відділення"
                      value={address.novaPoshtaWarehouse || "—"}
                    />

                    <InfoItem
                      label="Нова пошта — REF"
                      value={address.novaPoshtaRef || "—"}
                    />

                    <InfoItem
                      label="Назва адреси"
                      value={address.title || "—"}
                    />
                  </div>
                ) : (
                  <EmptyState text="Адресу доставки не збережено." />
                )}
              </div>
            </section>

            {/* DELIVERY */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Доставка
                  </h2>
                </div>
              </div>

              <div className="p-5">
                {order.delivery ? (
                  <div className="grid gap-px overflow-hidden rounded-xl bg-white/[0.05] sm:grid-cols-2">
                    <InfoItem
                      label="Спосіб"
                      value={deliveryMethodLabel(
                        order.delivery.method
                      )}
                    />

                    <div className="bg-[#0b0f16] p-4">
                      <div className="mb-1.5 text-[11px] text-zinc-600">
                        Статус
                      </div>

                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase ${deliveryStatusStyle(
                          order.delivery.status
                        )}`}
                      >
                        {deliveryStatusLabel(
                          order.delivery.status
                        )}
                      </span>
                    </div>

                    <InfoItem
                      label="Перевізник"
                      value={order.delivery.carrier || "—"}
                    />

                    <InfoItem
                      label="Трек-номер"
                      value={
                        order.delivery.trackingNumber || "—"
                      }
                    />

                    <InfoItem
                      label="Місто"
                      value={order.delivery.city || "—"}
                    />

                    <InfoItem
                      label="Відділення"
                      value={order.delivery.warehouse || "—"}
                    />

                    <InfoItem
                      label="Адреса"
                      value={order.delivery.address || "—"}
                    />

                    <InfoItem
                      label="Відправлено"
                      value={formatDate(
                        order.delivery.shippedAt
                      )}
                    />

                    <InfoItem
                      label="Доставлено"
                      value={formatDate(
                        order.delivery.deliveredAt
                      )}
                    />
                  </div>
                ) : (
                  <EmptyState text="Дані доставки ще не створені." />
                )}
              </div>
            </section>

            {/* PAYMENTS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Оплата
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {paymentMethodLabel(
                              payment.method
                            )}
                          </span>

                          <span
                            className={`rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase ${paymentStatusStyle(
                              payment.status
                            )}`}
                          >
                            {paymentStatusLabel(
                              payment.status
                            )}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-zinc-600">
                          <div>
                            ID:{" "}
                            <span className="font-mono">
                              {payment.id}
                            </span>
                          </div>

                          {payment.provider && (
                            <div>
                              Провайдер: {payment.provider}
                            </div>
                          )}

                          {payment.transactionId && (
                            <div>
                              Транзакція:{" "}
                              <span className="font-mono">
                                {payment.transactionId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-left lg:text-right">
                        <div className="text-xl font-black text-white">
                          {formatMoney(payment.amount)}
                        </div>

                        <div className="mt-1 text-xs text-zinc-600">
                          Створено{" "}
                          {formatDate(payment.createdAt)}
                        </div>

                        {payment.paidAt && (
                          <div className="mt-1 text-xs text-emerald-400/70">
                            Оплачено{" "}
                            {formatDate(payment.paidAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {order.payments.length === 0 && (
                  <EmptyState text="Платежів для цього замовлення немає." />
                )}
              </div>
            </section>

            {/* CUSTOMER NOTE */}

            {order.customerNote && (
              <section className="overflow-hidden rounded-2xl border border-amber-400/10 bg-amber-400/[0.03]">
                <div className="border-b border-amber-400/10 px-5 py-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <FileText className="h-4 w-4" />

                    <h2 className="text-sm font-black">
                      Коментар покупця
                    </h2>
                  </div>
                </div>

                <div className="p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                    {order.customerNote}
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* SIDEBAR */}

          <aside className="space-y-6">

            {/* ORDER */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Замовлення
              </div>

              <div className="space-y-4">
                <SidebarItem
                  label="Номер"
                  value={`#${order.orderNumber}`}
                />

                <SidebarItem
                  label="ID"
                  value={order.id}
                  mono
                />

                <SidebarItem
                  label="Статус"
                  value={orderStatusLabel(order.status)}
                />

                <SidebarItem
                  label="Створено"
                  value={formatDate(order.createdAt)}
                />

                <SidebarItem
                  label="Оновлено"
                  value={formatDate(order.updatedAt)}
                />

                <SidebarItem
                  label="Валюта"
                  value="UAH"
                />
              </div>
            </section>

            {/* FINANCES */}

            <section className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-amber-400" />

                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/70">
                  Фінанси
                </div>
              </div>

              <div className="space-y-3">
                <MoneyRow
                  label="Товари"
                  value={order.subtotal}
                />

                <MoneyRow
                  label="Знижка"
                  value={order.discountAmount}
                  negative
                />

                <MoneyRow
                  label="Доставка"
                  value={order.deliveryAmount}
                />

                <div className="border-t border-amber-400/10 pt-3">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-sm font-bold text-zinc-400">
                      Разом
                    </span>

                    <span className="text-2xl font-black text-amber-400">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* DELIVERY QUICK INFO */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-400" />

                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Доставка
                </div>
              </div>

              <div className="space-y-4">
                <SidebarItem
                  label="Метод"
                  value={deliveryMethodLabel(
                    order.shippingMethod
                  )}
                />

                <SidebarItem
                  label="Адреса"
                  value={
                    address
                      ? `${address.city || "—"}, ${
                          address.firstName || ""
                        } ${address.lastName || ""}`.trim()
                      : "Не вказано"
                  }
                />

                {order.delivery?.trackingNumber && (
                  <SidebarItem
                    label="Трек-номер"
                    value={
                      order.delivery.trackingNumber
                    }
                    mono
                  />
                )}
              </div>
            </section>

            {/* PAYMENT QUICK INFO */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-400" />

                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Оплата
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-600">
                    Статус
                  </span>

                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${paymentStatusStyle(
                      paymentStatus
                    )}`}
                  >
                    {paymentStatusLabel(paymentStatus)}
                  </span>
                </div>

                <SidebarItem
                  label="Платежів"
                  value={String(order.payments.length)}
                />

                {latestPayment && (
                  <SidebarItem
                    label="Метод"
                    value={paymentMethodLabel(
                      latestPayment.method
                    )}
                  />
                )}
              </div>
            </section>

            {/* QUICK LINKS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Швидкі переходи
              </div>

              <div className="space-y-2">
                <QuickLink
                  href={`/admin/users/${order.user.id}`}
                  icon={<User className="h-4 w-4" />}
                  label="Профіль покупця"
                />

                <QuickLink
                  href="/admin/orders"
                  icon={
                    <ShoppingBag className="h-4 w-4" />
                  }
                  label="Усі замовлення"
                />

                <QuickLink
                  href="/admin/products"
                  icon={<Package className="h-4 w-4" />}
                  label="Усі товари"
                />

                <QuickLink
                  href="/admin/sellers"
                  icon={<Store className="h-4 w-4" />}
                  label="Усі продавці"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-6 py-12 text-center text-sm text-zinc-600">
      {text}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#0b0f16] p-5">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
          accent
            ? "bg-amber-400/10 text-amber-400"
            : "bg-white/[0.03] text-zinc-600"
        }`}
      >
        {icon}
      </div>

      <div
        className={`text-xl font-black ${
          accent ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0b0f16] p-4">
      <div className="mb-1.5 text-[11px] text-zinc-600">
        {label}
      </div>

      <div className="break-words text-sm font-semibold text-zinc-300">
        {value}
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-zinc-600">
        {label}
      </span>

      <span
        className={`max-w-[220px] break-words text-right text-xs text-zinc-400 ${
          mono ? "font-mono text-[10px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: unknown;
  negative?: boolean;
}) {
  const amount = Number(value);

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-zinc-600">
        {label}
      </span>

      <span
        className={`text-sm font-bold ${
          negative && amount > 0
            ? "text-red-300"
            : "text-zinc-300"
        }`}
      >
        {negative && amount > 0
          ? `−${formatMoney(value)}`
          : formatMoney(value)}
      </span>
    </div>
  );
}

function SellerAmount({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-700">
        {label}
      </div>

      <div
        className={`mt-1 text-sm ${
          strong
            ? "font-black text-white"
            : "font-bold text-zinc-400"
        }`}
      >
        {value}
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

      <ExternalLink className="h-3.5 w-3.5 text-zinc-700" />
    </Link>
  );
}