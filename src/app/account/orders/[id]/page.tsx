import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Package, Truck, Wallet } from "lucide-react";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  deliveryMethodLabel,
  formatDate,
  formatPrice,
  orderStatusLabel,
  orderStatusStyle,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusStyle,
} from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Замовлення | UkrTradeHub",
  robots: { index: false, follow: false },
};

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null; // guard already handled in layout
  }

  const { id } = await params;

  // Замовлення шукаємо ТІЛЬКИ серед власних (userId: user.id) —
  // інакше можна було б переглянути чуже замовлення за id (IDOR)
  const order = await db.order.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      shippingAddress: true,
      items: {
        include: {
          product: {
            select: {
              slug: true,
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
          shop: {
            select: { id: true, name: true, slug: true },
          },
          variant: {
            select: { title: true },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    notFound();
  }

  const latestPayment = order.payments[0] ?? null;
  const address = order.shippingAddress;

  return (
    <div>
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Усі замовлення
      </Link>

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">
            Замовлення №{order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatDate(order.createdAt)}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusStyle(
            order.status
          )}`}
        >
          {orderStatusLabel(order.status)}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ITEMS */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Package className="h-4 w-4 text-amber-400" />
              Товари
            </h2>

            <div className="mt-4 divide-y divide-white/5">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 text-[10px] text-zinc-600">
                    {item.product?.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.images[0].url}
                        alt={item.productTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Фото"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {item.product?.slug ? (
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="line-clamp-2 font-medium text-zinc-100 transition hover:text-amber-400"
                      >
                        {item.productTitle}
                      </Link>
                    ) : (
                      <span className="line-clamp-2 font-medium text-zinc-100">
                        {item.productTitle}
                      </span>
                    )}

                    <p className="mt-1 text-xs text-zinc-500">
                      {item.shop.name}
                      {item.variant?.title && ` · ${item.variant.title}`}
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      {item.quantity} × {formatPrice(Number(item.unitPrice))}
                    </p>
                  </div>

                  <div className="shrink-0 text-right font-semibold text-zinc-100">
                    {formatPrice(Number(item.totalPrice))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ADDRESS */}
          {address && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="h-4 w-4 text-amber-400" />
                Адреса доставки
              </h2>

              <div className="mt-3 text-sm text-zinc-400">
                <p className="font-medium text-zinc-200">
                  {[address.firstName, address.lastName]
                    .filter(Boolean)
                    .join(" ") || "Отримувач"}
                  {address.phone && (
                    <span className="ml-2 font-normal text-zinc-500">
                      {address.phone}
                    </span>
                  )}
                </p>
                <p className="mt-1">
                  {[
                    address.region,
                    address.city,
                    address.street,
                    address.building,
                    address.apartment,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  {address.novaPoshtaWarehouse &&
                    ` · ${address.novaPoshtaWarehouse}`}
                </p>
              </div>
            </div>
          )}

          {order.customerNote && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <h2 className="text-lg font-bold">Коментар</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {order.customerNote}
              </p>
            </div>
          )}
        </section>

        {/* SUMMARY */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Підсумок</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Товари</span>
                <span className="text-zinc-200">
                  {formatPrice(Number(order.subtotal))}
                </span>
              </div>

              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Знижка</span>
                  <span className="text-emerald-400">
                    −{formatPrice(Number(order.discountAmount))}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-zinc-400">
                <span>Доставка</span>
                <span className="text-zinc-200">
                  {Number(order.deliveryAmount) > 0
                    ? formatPrice(Number(order.deliveryAmount))
                    : "Безкоштовно"}
                </span>
              </div>
            </div>

            <div className="my-4 border-t border-white/10" />

            <div className="flex items-end justify-between">
              <span className="text-sm text-zinc-400">Разом</span>
              <span className="text-xl font-black text-amber-400">
                {formatPrice(Number(order.total))}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Truck className="h-4 w-4 text-amber-400" />
              Доставка
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {deliveryMethodLabel(order.shippingMethod)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Wallet className="h-4 w-4 text-amber-400" />
              Оплата
            </h2>

            {latestPayment ? (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {paymentMethodLabel(latestPayment.method)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentStatusStyle(
                    latestPayment.status
                  )}`}
                >
                  {paymentStatusLabel(latestPayment.status)}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                Платіж ще не створено
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}