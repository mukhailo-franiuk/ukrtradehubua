
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Кошик | UkrTradeHub",
  description:
    "Перегляньте товари у вашому кошику UkrTradeHub та оформіть замовлення.",
  alternates: {
    canonical: "/cart",
  },
  robots: {
    index: false,
    follow: true,
  },
};

const cartItems = [
  {
    id: "1",
    title: "Смартфон нового покоління",
    shop: "Tech Store",
    price: 24999,
    oldPrice: 29999,
    quantity: 1,
  },
  {
    id: "2",
    title: "Бездротові навушники Pro",
    shop: "Audio Market",
    price: 2499,
    oldPrice: 3499,
    quantity: 2,
  },
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("uk-UA").format(value) + " ₴";

export default function CartPage() {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const oldSubtotal = cartItems.reduce(
    (sum, item) => sum + item.oldPrice * item.quantity,
    0
  );

  const discount = oldSubtotal - subtotal;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <ShoppingBag className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-3xl font-black sm:text-4xl">
                Кошик
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                {cartItems.length} товари у кошику
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* ITEMS */}
          <section className="space-y-4">
            {cartItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5"
              >
                <div className="flex gap-4">

                  {/* IMAGE */}
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs text-zinc-600 sm:h-36 sm:w-36">
                    Фото
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/products/${item.id}`}
                          className="line-clamp-2 font-semibold text-zinc-100 transition hover:text-amber-400"
                        >
                          {item.title}
                        </Link>

                        <p className="mt-1 text-sm text-zinc-500">
                          Магазин: {item.shop}
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-label="Видалити товар"
                        className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">

                      {/* QUANTITY */}
                      <div className="flex items-center rounded-xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          className="p-2.5 text-zinc-400 transition hover:text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <span className="min-w-10 text-center text-sm font-bold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className="p-2.5 text-zinc-400 transition hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* PRICE */}
                      <div className="text-right">
                        <div className="text-lg font-black">
                          {formatPrice(item.price * item.quantity)}
                        </div>

                        <div className="text-xs text-zinc-600 line-through">
                          {formatPrice(item.oldPrice * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex items-center border-t border-white/5 pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-amber-400"
                  >
                    <Heart className="h-4 w-4" />
                    Додати до обраного
                  </button>
                </div>
              </article>
            ))}

            {/* CONTINUE SHOPPING */}
            <Link
              href="/products"
              className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-zinc-400 transition hover:text-amber-400"
            >
              Продовжити покупки
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {/* SUMMARY */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6">

              <h2 className="text-xl font-bold">
                Підсумок замовлення
              </h2>

              <div className="mt-6 space-y-4 text-sm">

                <div className="flex justify-between gap-4 text-zinc-400">
                  <span>Товари</span>
                  <span className="font-medium text-zinc-200">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-zinc-400">
                  <span>Знижка</span>
                  <span className="font-medium text-emerald-400">
                    −{formatPrice(discount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-zinc-400">
                  <span>Доставка</span>
                  <span className="font-medium text-zinc-200">
                    За тарифами перевізника
                  </span>
                </div>
              </div>

              <div className="my-6 border-t border-white/10" />

              <div className="flex items-end justify-between gap-4">
                <span className="text-zinc-400">
                  Разом
                </span>

                <span className="text-2xl font-black">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-bold text-black transition hover:bg-amber-300"
              >
                Оформити замовлення
                <ArrowRight className="h-5 w-5" />
              </Link>

              <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
                Остаточна вартість доставки буде визначена
                під час оформлення замовлення.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
