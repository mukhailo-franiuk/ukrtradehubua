import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  formatDate,
  formatPrice,
  orderStatusLabel,
  orderStatusStyle,
} from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Особистий кабінет | UkrTradeHub",
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // guard already handled in layout
  }

  const [ordersCount, recentOrders] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-black sm:text-3xl">
        Вітаємо, {user.name ?? user.email}
      </h1>

      <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
        <p className="text-sm text-zinc-500">Усього замовлень</p>
        <p className="mt-1 text-3xl font-black text-amber-400">
          {ordersCount}
        </p>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Останні замовлення</h2>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            Усі замовлення
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60 py-16 text-center">
            <Package className="h-6 w-6 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">Замовлень ще немає</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-white/20"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100">
                      №{order.orderNumber}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${orderStatusStyle(
                        order.status
                      )}`}
                    >
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="font-bold text-amber-400">
                  {formatPrice(Number(order.total))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}