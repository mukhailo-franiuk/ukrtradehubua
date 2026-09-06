"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  AlertCircle,
  RefreshCw,
  Store,
  Package,
  ShieldCheck,
  Truck,
  CreditCard,
  ChevronRight,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

type CartImage = {
  url: string;
  alt: string;
};

type CartShop = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sellerStatus: string;
};

type CartProduct = {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  oldPrice: number | null;
  availableStock: number;
  image: CartImage | null;
  shop: CartShop | null;
};

type CartVariant = {
  id: string;
  title: string;
};

type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: CartProduct;
  variant: CartVariant | null;
};

type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
  itemsCount: number;
  subtotal: number;
  oldSubtotal: number;
  discount: number;
  total: number;
};

// =====================================================
// API TYPES
// =====================================================

type CartResponse = {
  success: boolean;
  cart?: Cart;
  message?: string;
  error?: string;
};

type CartItemResponse = {
  success: boolean;
  data?: CartItem;
  message?: string;
  error?: string;
  availableStock?: number;
};

// =====================================================
// HELPERS
// =====================================================

function formatPrice(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(value);
}

// =====================================================
// PAGE
// =====================================================

export default function CartPage() {
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);

  // ===================================================
  // LOAD CART
  // ===================================================

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cart", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: CartResponse =
        await response.json();

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent("/cart")}`
        );
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не вдалося завантажити кошик."
        );
      }

      if (!data.cart) {
        throw new Error(
          "Сервер не повернув дані кошика."
        );
      }

      setCart(data.cart);
    } catch (err) {
      console.error(
        "Cart load error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити кошик."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // ===================================================
  // UPDATE QUANTITY
  // PATCH /api/cart/[id]
  // ===================================================

  const updateQuantity = async (
    item: CartItem,
    nextQuantity: number
  ) => {
    if (updatingId || deletingId) {
      return;
    }

    if (nextQuantity < 1) {
      return;
    }

    if (
      nextQuantity >
      item.product.availableStock
    ) {
      setError(
        `Доступно лише ${item.product.availableStock} шт.`
      );
      return;
    }

    try {
      setUpdatingId(item.id);
      setError(null);

      const response = await fetch(
        `/api/cart/${item.id}`,
        {
          method: "PATCH",

          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            quantity: nextQuantity,
          }),
        }
      );

      const data: CartItemResponse =
        await response.json();

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent("/cart")}`
        );
        return;
      }

      /*
       * API може повернути 409, якщо товар
       * став недоступним або залишку недостатньо.
       */
      if (!response.ok || !data.success) {
        setError(
          data.message ||
            data.error ||
            "Не вдалося змінити кількість."
        );

        /*
         * Перечитуємо кошик, тому що API міг
         * автоматично видалити позицію.
         */
        await loadCart();

        return;
      }

      /*
       * Оновлюємо позицію локально,
       * не перезавантажуючи всю сторінку.
       */
      if (data.data) {
        setCart((current) => {
          if (!current) return current;

          const updatedItems =
            current.items.map((currentItem) =>
              currentItem.id === item.id
                ? data.data!
                : currentItem
            );

          return recalculateCart({
            ...current,
            items: updatedItems,
          });
        });
      } else {
        await loadCart();
      }
    } catch (err) {
      console.error(
        "Cart quantity update error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося змінити кількість."
      );

      await loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  // ===================================================
  // DELETE ITEM
  // DELETE /api/cart/[id]
  // ===================================================

  const deleteItem = async (
    itemId: string
  ) => {
    if (deletingId || updatingId) {
      return;
    }

    try {
      setDeletingId(itemId);
      setError(null);

      const response = await fetch(
        `/api/cart/${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data: CartItemResponse =
        await response.json();

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent("/cart")}`
        );
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            "Не вдалося видалити товар."
        );
      }

      setCart((current) => {
        if (!current) return current;

        const updatedItems =
          current.items.filter(
            (item) => item.id !== itemId
          );

        return recalculateCart({
          ...current,
          items: updatedItems,
        });
      });
    } catch (err) {
      console.error(
        "Cart delete error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося видалити товар."
      );

      await loadCart();
    } finally {
      setDeletingId(null);
    }
  };

  // ===================================================
  // RECALCULATED VALUES
  // ===================================================

  const calculated = useMemo(() => {
    if (!cart) {
      return {
        subtotal: 0,
        oldSubtotal: 0,
        discount: 0,
        total: 0,
        itemsCount: 0,
      };
    }

    return calculateTotals(cart.items);
  }, [cart]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />

            <p>
              Завантажуємо ваш кошик...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error && !cart) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold">
              Не вдалося завантажити кошик
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadCart}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              <RefreshCw className="h-4 w-4" />
              Спробувати ще раз
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // EMPTY
  // ===================================================

  if (!cart || cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Продовжити покупки
          </Link>

          <div className="flex min-h-[65vh] items-center justify-center">
            <div className="max-w-lg text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                <ShoppingBag className="h-10 w-10 text-zinc-500" />
              </div>

              <h1 className="mt-7 text-3xl font-black tracking-tight sm:text-4xl">
                Кошик порожній
              </h1>

              <p className="mt-4 text-base leading-7 text-zinc-400">
                Додайте товари, які вам сподобалися,
                і вони з'являться тут.
              </p>

              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-7 py-4 font-bold text-black transition hover:bg-amber-300"
              >
                Перейти до покупок
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // CART
  // ===================================================

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* ===========================================
            HEADER
        =========================================== */}

        <div className="mb-8">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Продовжити покупки
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
                  <ShoppingBag className="h-5 w-5 text-amber-400" />
                </div>

                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                  UkrTradeHub
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Мій кошик
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                {calculated.itemsCount}{" "}
                {getItemWord(
                  calculated.itemsCount
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={loadCart}
              disabled={
                loading ||
                !!updatingId ||
                !!deletingId
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Оновити
            </button>
          </div>
        </div>

        {/* ===========================================
            ERROR BANNER
        =========================================== */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

            <div className="min-w-0">
              <p className="font-medium text-red-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-1 text-xs text-red-400 underline underline-offset-2 hover:text-red-300"
              >
                Закрити
              </button>
            </div>
          </div>
        )}

        {/* ===========================================
            CONTENT
        =========================================== */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* =========================================
              ITEMS
          ========================================= */}

          <section className="space-y-4">
            {cart.items.map((item) => {
              const isUpdating =
                updatingId === item.id;

              const isDeleting =
                deletingId === item.id;

              const unitPrice =
                item.product.price;

              const oldPrice =
                item.product.oldPrice;

              const itemTotal =
                unitPrice * item.quantity;

              const itemOldTotal =
                (oldPrice ?? unitPrice) *
                item.quantity;

              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex gap-4 sm:gap-5">
                      {/* IMAGE */}

                      <Link
                        href={`/products/${item.product.slug}`}
                        className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.04] sm:h-36 sm:w-36"
                      >
                        {item.product.image ? (
                          <img
                            src={
                              item.product.image
                                .url
                            }
                            alt={
                              item.product.image
                                .alt
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-10 w-10 text-zinc-700" />
                          </div>
                        )}
                      </Link>

                      {/* INFO */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="line-clamp-2 text-base font-bold leading-6 text-white transition hover:text-amber-300 sm:text-lg"
                            >
                              {item.product.title}
                            </Link>

                            {item.variant && (
                              <p className="mt-1 text-sm text-zinc-500">
                                Варіант:{" "}
                                <span className="text-zinc-300">
                                  {
                                    item.variant
                                      .title
                                  }
                                </span>
                              </p>
                            )}
                          </div>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              deleteItem(
                                item.id
                              )
                            }
                            disabled={
                              isUpdating ||
                              isDeleting
                            }
                            aria-label="Видалити товар"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {/* SHOP */}

                        {item.product.shop && (
                          <Link
                            href={`/shops/${item.product.shop.slug}`}
                            className="mt-3 inline-flex max-w-full items-center gap-2 text-sm text-zinc-500 transition hover:text-amber-300"
                          >
                            <Store className="h-4 w-4 shrink-0" />

                            <span className="truncate">
                              {
                                item.product
                                  .shop.name
                              }
                            </span>
                          </Link>
                        )}

                        {/* BOTTOM */}

                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          {/* PRICE */}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-white">
                                {formatPrice(
                                  unitPrice
                                )}
                              </span>

                              {oldPrice !==
                                null &&
                                oldPrice >
                                  unitPrice && (
                                  <span className="text-sm text-zinc-600 line-through">
                                    {formatPrice(
                                      oldPrice
                                    )}
                                  </span>
                                )}
                            </div>

                            {oldPrice !==
                              null &&
                              oldPrice >
                                unitPrice && (
                                <span className="mt-1 inline-block text-xs font-semibold text-emerald-400">
                                  Економія{" "}
                                  {formatPrice(
                                    oldPrice -
                                      unitPrice
                                  )}
                                </span>
                              )}
                          </div>

                          {/* QUANTITY */}

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <div className="flex items-center rounded-xl border border-white/10 bg-black/30">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item,
                                    item.quantity -
                                      1
                                  )
                                }
                                disabled={
                                  item.quantity <=
                                    1 ||
                                  isUpdating ||
                                  isDeleting
                                }
                                className="flex h-10 w-10 items-center justify-center text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="Зменшити кількість"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <div className="flex h-10 min-w-10 items-center justify-center border-x border-white/10 px-2 text-sm font-bold">
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                                ) : (
                                  item.quantity
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item,
                                    item.quantity +
                                      1
                                  )
                                }
                                disabled={
                                  item.quantity >=
                                    item
                                      .product
                                      .availableStock ||
                                  isUpdating ||
                                  isDeleting
                                }
                                className="flex h-10 w-10 items-center justify-center text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="Збільшити кількість"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            {/* ITEM TOTAL */}

                            <div className="min-w-[110px] text-right">
                              <p className="text-lg font-black text-white">
                                {formatPrice(
                                  itemTotal
                                )}
                              </p>

                              {itemOldTotal >
                                itemTotal && (
                                <p className="text-xs text-zinc-600 line-through">
                                  {formatPrice(
                                    itemOldTotal
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* STOCK */}

                        <div className="mt-3 flex items-center gap-2 text-xs">
                          {item.product
                            .availableStock >
                          0 ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                              <span className="text-zinc-500">
                                В наявності:{" "}
                                {
                                  item
                                    .product
                                    .availableStock
                                }{" "}
                                шт.
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                              <span className="text-red-400">
                                Немає в наявності
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {/* =========================================
              SUMMARY
          ========================================= */}

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl">
              {/* SUMMARY HEADER */}

              <div className="border-b border-white/10 p-6">
                <h2 className="text-xl font-black">
                  Підсумок замовлення
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {calculated.itemsCount}{" "}
                  {getItemWord(
                    calculated.itemsCount
                  )}
                </p>
              </div>

              {/* TOTALS */}

              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    Товари
                  </span>

                  <span className="font-medium text-zinc-200">
                    {formatPrice(
                      calculated.subtotal
                    )}
                  </span>
                </div>

                {calculated.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      Знижка
                    </span>

                    <span className="font-semibold text-emerald-400">
                      −
                      {formatPrice(
                        calculated.discount
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    Доставка
                  </span>

                  <span className="font-medium text-emerald-400">
                    Розраховується при оформленні
                  </span>
                </div>

                <div className="my-5 h-px bg-white/10" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-base font-semibold text-zinc-300">
                    Разом
                  </span>

                  <div className="text-right">
                    <p className="text-3xl font-black tracking-tight text-white">
                      {formatPrice(
                        calculated.total
                      )}
                    </p>

                    {calculated.discount >
                      0 && (
                      <p className="mt-1 text-xs text-zinc-600 line-through">
                        {formatPrice(
                          calculated.oldSubtotal
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* CHECKOUT */}

                <Link
                  href="/checkout"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-black text-black transition hover:bg-amber-300 active:scale-[0.99]"
                >
                  Оформити замовлення
                  <ChevronRight className="h-5 w-5" />
                </Link>

                <p className="text-center text-xs leading-5 text-zinc-600">
                  Перевірка адреси, доставки та
                  способу оплати буде виконана під
                  час оформлення.
                </p>
              </div>

              {/* BENEFITS */}

              <div className="border-t border-white/10 bg-black/20 p-6">
                <div className="space-y-4">
                  <Benefit
                    icon={
                      <ShieldCheck className="h-4 w-4" />
                    }
                    title="Безпечна покупка"
                    text="Захист покупця UkrTradeHub"
                  />

                  <Benefit
                    icon={
                      <Truck className="h-4 w-4" />
                    }
                    title="Зручна доставка"
                    text="Нова пошта, Укрпошта та інші"
                  />

                  <Benefit
                    icon={
                      <CreditCard className="h-4 w-4" />
                    }
                    title="Безпечна оплата"
                    text="Кілька способів оплати"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// =====================================================
// BENEFIT
// =====================================================

function Benefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-200">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-zinc-600">
          {text}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// CALCULATIONS
// =====================================================

function calculateTotals(
  items: CartItem[]
) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      item.product.price *
        item.quantity,
    0
  );

  const oldSubtotal = items.reduce(
    (sum, item) =>
      sum +
      (item.product.oldPrice ??
        item.product.price) *
        item.quantity,
    0
  );

  const discount = Math.max(
    0,
    oldSubtotal - subtotal
  );

  const itemsCount = items.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  return {
    subtotal,
    oldSubtotal,
    discount,
    total: subtotal,
    itemsCount,
  };
}

// =====================================================
// RECALCULATE CART
// =====================================================

function recalculateCart(
  cart: Cart
): Cart {
  const totals = calculateTotals(
    cart.items
  );

  return {
    ...cart,
    ...totals,
  };
}

// =====================================================
// UKRAINIAN PLURAL
// =====================================================

function getItemWord(
  count: number
) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "товарів";
  }

  if (last === 1) {
    return "товар";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "товари";
  }

  return "товарів";
}