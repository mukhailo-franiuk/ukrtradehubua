"use client";

import {
  AlertCircle,
  ArrowRight,
  Heart,
  Loader2,
  PackageOpen,
  RefreshCw,
  ShoppingCart,
  Star,
  Store,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  sortOrder: number;
  isPrimary?: boolean;
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  rating?: number | string | null;
  isActive: boolean;
  sellerStatus?: string | null;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  price: number | string;
  oldPrice?: number | string | null;
  stock: number;
  reservedStock?: number;
  status: string;
  rating?: number | string | null;
  reviewsCount?: number;
  favoritesCount?: number;
  images: ProductImage[];
  shop: Shop;
};

type Favorite = {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: Product;
};

type ApiResponse = {
  success?: boolean;
  data?: Favorite[];
  total?: number;
  error?: string;
  message?: string;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getProductImage(product: Product) {
  return (
    product.images.find(
      (image) => image.isPrimary
    ) ??
    product.images[0] ??
    null
  );
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/favorites",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const json: ApiResponse =
        await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          json.error ||
            json.message ||
            "Не вдалося завантажити обране"
        );
      }

      setFavorites(json.data ?? []);
    } catch (error) {
      console.error(
        "Load favorites error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити обране"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (
    favorite: Favorite
  ) => {
    if (removingId) {
      return;
    }

    try {
      setRemovingId(favorite.id);
      setError("");

      const response = await fetch(
        "/api/favorites",
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: favorite.productId,
          }),
        }
      );

      const json: ApiResponse =
        await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          json.error ||
            json.message ||
            "Не вдалося видалити товар"
        );
      }

      if (json.success) {
        setFavorites((current) =>
          current.filter(
            (item) => item.id !== favorite.id
          )
        );
      } else {
        throw new Error(
          json.error ||
            json.message ||
            "Не вдалося видалити товар"
        );
      }
    } catch (error) {
      console.error(
        "Remove favorite error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Не вдалося видалити товар з обраного"
      );
    } finally {
      setRemovingId(null);
    }
  };

  const statistics = useMemo(() => {
    const total = favorites.length;

    const available = favorites.filter(
      (favorite) =>
        favorite.product.status === "ACTIVE" &&
        favorite.product.stock -
          (favorite.product.reservedStock ?? 0) >
          0
    ).length;

    const unavailable = total - available;

    return {
      total,
      available,
      unavailable,
    };
  }, [favorites]);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
              <Heart
                className="text-red-400"
                size={25}
                fill="currentColor"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Обране
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Товари, які ти зберіг для себе
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle
              className="mt-0.5 shrink-0 text-red-400"
              size={20}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-300">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={loadFavorites}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              <RefreshCw size={15} />
              Повторити
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-zinc-400">
              <Loader2
                size={34}
                className="animate-spin text-amber-400"
              />

              <span className="text-sm">
                Завантаження обраного...
              </span>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          /* EMPTY */
          <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] px-6 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <Heart
                size={38}
                className="text-red-400"
              />
            </div>

            <h2 className="text-2xl font-bold">
              В обраному поки порожньо
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
              Додавай товари, які тобі сподобалися,
              щоб швидко повернутися до них пізніше.
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Перейти до покупок
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            {/* STATISTICS */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <Heart
                    size={20}
                    className="text-red-400"
                  />

                  <span className="text-sm text-zinc-400">
                    Всього товарів
                  </span>
                </div>

                <p className="mt-3 text-2xl font-bold">
                  {statistics.total}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <PackageOpen
                    size={20}
                    className="text-emerald-400"
                  />

                  <span className="text-sm text-zinc-400">
                    Доступні
                  </span>
                </div>

                <p className="mt-3 text-2xl font-bold">
                  {statistics.available}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <AlertCircle
                    size={20}
                    className="text-orange-400"
                  />

                  <span className="text-sm text-zinc-400">
                    Недоступні
                  </span>
                </div>

                <p className="mt-3 text-2xl font-bold">
                  {statistics.unavailable}
                </p>
              </div>
            </div>

            {/* PRODUCTS */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favorites.map((favorite) => {
                const product = favorite.product;

                const image =
                  getProductImage(product);

                const price = toNumber(
                  product.price
                );

                const oldPrice =
                  product.oldPrice !== null &&
                  product.oldPrice !== undefined
                    ? toNumber(product.oldPrice)
                    : null;

                const availableStock =
                  product.stock -
                  (product.reservedStock ?? 0);

                const isAvailable =
                  product.status === "ACTIVE" &&
                  availableStock > 0;

                const rating =
                  toNumber(product.rating);

                const isRemoving =
                  removingId === favorite.id;

                return (
                  <article
                    key={favorite.id}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045]"
                  >
                    {/* IMAGE */}
                    <div className="relative aspect-square overflow-hidden bg-zinc-900">
                      <Link
                        href={`/products/${product.slug}`}
                        className="block h-full w-full"
                      >
                        {image?.url ? (
                          <img
                            src={
                              image.thumbnailUrl ??
                              image.url
                            }
                            alt={
                              image.alt ??
                              product.title
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <PackageOpen
                              size={42}
                              className="text-zinc-700"
                            />
                          </div>
                        )}
                      </Link>

                      {/* FAVORITE */}
                      <button
                        type="button"
                        onClick={() =>
                          handleRemove(favorite)
                        }
                        disabled={
                          removingId !== null
                        }
                        aria-label="Видалити з обраного"
                        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-red-400 backdrop-blur-md transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRemoving ? (
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>

                      {/* STATUS */}
                      {!isAvailable && (
                        <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-md">
                          Немає в наявності
                        </div>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="p-5">
                      {/* SHOP */}
                      <Link
                        href={`/shops/${product.shop.slug}`}
                        className="mb-2 flex items-center gap-2 text-xs text-zinc-500 transition hover:text-amber-400"
                      >
                        <Store size={14} />

                        <span className="truncate">
                          {product.shop.name}
                        </span>
                      </Link>

                      {/* TITLE */}
                      <Link
                        href={`/products/${product.slug}`}
                        className="block"
                      >
                        <h2 className="line-clamp-2 min-h-[48px] text-sm font-semibold leading-6 text-zinc-100 transition group-hover:text-amber-400">
                          {product.title}
                        </h2>
                      </Link>

                      {/* RATING */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star
                            size={14}
                            className="fill-amber-400 text-amber-400"
                          />

                          <span className="text-xs font-medium text-zinc-300">
                            {rating.toFixed(1)}
                          </span>
                        </div>

                        <span className="text-xs text-zinc-600">
                          •
                        </span>

                        <span className="text-xs text-zinc-500">
                          {product.reviewsCount ?? 0} відгуків
                        </span>
                      </div>

                      {/* PRICE */}
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-xl font-bold text-white">
                          {formatPrice(price)} ₴
                        </span>

                        {oldPrice !== null &&
                          oldPrice > price && (
                            <span className="pb-0.5 text-sm text-zinc-500 line-through">
                              {formatPrice(oldPrice)} ₴
                            </span>
                          )}
                      </div>

                      {/* FOOTER */}
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                        <span
                          className={`text-xs font-medium ${
                            isAvailable
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {isAvailable
                            ? "Є в наявності"
                            : "Недоступний"}
                        </span>

                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                        >
                          Детальніше
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* CONTINUE SHOPPING */}
            <div className="mt-10 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                <ShoppingCart size={17} />
                Продовжити покупки
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}