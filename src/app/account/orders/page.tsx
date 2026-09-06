import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  formatDate,
  formatPrice,
  orderStatusLabel,
  orderStatusStyle,
} from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Мої замовлення | UkrTradeHub",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 10;

type OrdersPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AccountOrdersPage({
  searchParams,
}: OrdersPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null; // guard already handled in layout
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        items: {
          take: 3,
          include: {
            product: {
              include: {
                images: {
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                },
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
          <Package className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-semibold text-zinc-200">
          У вас ще немає замовлень
        </p>
        <Link
          href="/products"
          className="mt-4 text-sm font-semibold text-amber-400 hover:text-amber-300"
        >
          Перейти до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black sm:text-3xl">Мої замовлення</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="block rounded-2xl border border-white/10 bg-zinc-900/60 p-5 transition hover:border-white/20 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-100">
                    №{order.orderNumber}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${orderStatusStyle(
                      order.status
                    )}`}
                  >
                    {orderStatusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatDate(order.createdAt)} · {order._count.items}{" "}
                  товар(ів)
                </p>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-amber-400">
                  {formatPrice(Number(order.total))}
                </div>
              </div>
            </div>

            {/* THUMBNAILS */}
            <div className="mt-4 flex gap-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 text-[10px] text-zinc-600"
                >
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
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Link
            href={`/account/orders?page=${Math.max(1, page - 1)}`}
            aria-disabled={page <= 1}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 transition hover:bg-white/5 ${
              page <= 1 ? "pointer-events-none opacity-30" : ""
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <span className="px-3 text-sm text-zinc-400">
            {page} з {totalPages}
          </span>

          <Link
            href={`/account/orders?page=${Math.min(totalPages, page + 1)}`}
            aria-disabled={page >= totalPages}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 transition hover:bg-white/5 ${
              page >= totalPages ? "pointer-events-none opacity-30" : ""
            }`}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}