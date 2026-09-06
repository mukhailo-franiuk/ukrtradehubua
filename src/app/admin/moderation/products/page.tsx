
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  sellerStatus: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Brand = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  price: string | number;
  oldPrice: string | number | null;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
  isFeatured: boolean;
  isNew: boolean;
  createdAt: string;
  shop: Shop | null;
  category: Category | null;
  brand: Brand | null;
  images: ProductImage[];
};

type ModerationResponse = {
  products: Product[];
  total: number;
};

type ActionState = {
  id: string;
  type: "approve" | "reject";
} | null;

const PAGE_SIZE = 12;

export default function ProductModerationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [action, setAction] = useState<ActionState>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const response = await fetch("/api/admin/products/moderation", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "API повернув не JSON. Перевір маршрут /api/admin/products/moderation."
        );
      }

      const data = (await response.json()) as ModerationResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Не вдалося завантажити товари на модерацію"
        );
      }

      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити товари"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.shop?.name.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query) ||
        product.brand?.name.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const approveProduct = async (productId: string) => {
    try {
      setAction({
        id: productId,
        type: "approve",
      });

      setError(null);
      setSuccess(null);

      const response = await fetch(
        `/api/admin/products/${productId}/moderation/approve`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error("API повернув не JSON.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося схвалити товар");
      }

      setProducts((current) =>
        current.filter((product) => product.id !== productId)
      );

      setSuccess(data.message || "Товар успішно схвалено");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося схвалити товар"
      );
    } finally {
      setAction(null);
    }
  };

  const rejectProduct = async (productId: string) => {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    const confirmed = window.confirm(
      `Відхилити товар "${product.title}"?\n\nТовар буде переведено у статус ARCHIVED.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setAction({
        id: productId,
        type: "reject",
      });

      setError(null);
      setSuccess(null);

      const response = await fetch(
        `/api/admin/products/${productId}/moderation/reject`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error("API повернув не JSON.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося відхилити товар");
      }

      setProducts((current) =>
        current.filter((product) => product.id !== productId)
      );

      setSuccess(data.message || "Товар відхилено");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося відхилити товар"
      );
    } finally {
      setAction(null);
    }
  };

  const getProductImage = (product: Product) => {
    const primary = product.images.find((image) => image.isPrimary);

    return primary?.thumbnailUrl || primary?.url || null;
  };

  const formatPrice = (value: string | number) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "—";
    }

    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "UAH",
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-white">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Модерація товарів
                </h1>

                <p className="text-sm text-zinc-500">
                  Перевірка товарів перед публікацією на UkrTradeHub
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadProducts(true)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Оновити
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Очікують модерації
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {products.length}
                </p>
              </div>

              <div className="rounded-xl bg-amber-400/10 p-3">
                <Package className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div>
              <p className="text-sm text-zinc-500">
                Знайдено
              </p>

              <p className="mt-2 text-3xl font-bold">
                {filteredProducts.length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div>
              <p className="text-sm text-zinc-500">
                Сторінка
              </p>

              <p className="mt-2 text-3xl font-bold">
                {currentPage}
                <span className="ml-2 text-base font-normal text-zinc-600">
                  / {totalPages}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Помилка</p>
              <p className="mt-1 text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Готово</p>
              <p className="mt-1 text-emerald-300/80">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Пошук за назвою, SKU, магазином, категорією або брендом..."
              className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/40"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <span>Завантаження товарів...</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-6 text-center">
            <div className="mb-4 rounded-2xl bg-emerald-400/10 p-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>

            <h2 className="text-lg font-semibold">
              {search
                ? "Товарів не знайдено"
                : "Черга модерації порожня"}
            </h2>

            <p className="mt-2 max-w-md text-sm text-zinc-500">
              {search
                ? "Спробуй змінити пошуковий запит."
                : "Усі товари наразі перевірені. Нові товари з'являться тут автоматично."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] xl:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="border-b border-white/10 bg-white/[0.025]">
                    <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-4 font-medium">
                        Товар
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Магазин
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Категорія
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Ціна
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Створено
                      </th>
                      <th className="px-5 py-4 text-right font-medium">
                        Дії
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.06]">
                    {paginatedProducts.map((product) => {
                      const image = getProductImage(product);

                      const approving =
                        action?.id === product.id &&
                        action.type === "approve";

                      const rejecting =
                        action?.id === product.id &&
                        action.type === "reject";

                      return (
                        <tr
                          key={product.id}
                          className="transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={product.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-6 w-6 text-zinc-700" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[320px] truncate font-medium text-white">
                                  {product.title}
                                </p>

                                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                                  {product.sku && (
                                    <span>
                                      SKU: {product.sku}
                                    </span>
                                  )}

                                  {product.isNew && (
                                    <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-blue-300">
                                      Новинка
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p className="font-medium text-zinc-200">
                                {product.shop?.name || "—"}
                              </p>

                              {product.shop && (
                                <p className="mt-1 text-xs text-zinc-600">
                                  {product.shop.slug}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm text-zinc-300">
                              {product.category?.name || "Без категорії"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-white">
                              {formatPrice(product.price)}
                            </p>

                            {product.oldPrice != null && (
                              <p className="mt-1 text-xs text-zinc-600 line-through">
                                {formatPrice(product.oldPrice)}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-zinc-500">
                            {formatDate(product.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/admin/moderation/products/${product.id}`}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                <Eye className="h-4 w-4" />
                                Переглянути
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  void approveProduct(product.id)
                                }
                                disabled={action !== null}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500/90 px-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {approving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Схвалити
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void rejectProduct(product.id)
                                }
                                disabled={action !== null}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500/10 px-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {rejecting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                                Відхилити
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile / tablet cards */}
            <div className="grid gap-4 xl:hidden">
              {paginatedProducts.map((product) => {
                const image = getProductImage(product);

                const approving =
                  action?.id === product.id &&
                  action.type === "approve";

                const rejecting =
                  action?.id === product.id &&
                  action.type === "reject";

                return (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        {image ? (
                          <img
                            src={image}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-8 w-8 text-zinc-700" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 font-semibold text-white">
                          {product.title}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-500">
                          {product.shop?.name || "Без магазину"}
                        </p>

                        <p className="mt-1 text-sm text-zinc-400">
                          {product.category?.name || "Без категорії"}
                        </p>

                        <p className="mt-2 font-semibold text-amber-400">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
                      <Link
                        href={`/admin/moderation/products/${product.id}`}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-zinc-300"
                      >
                        <Eye className="h-4 w-4" />
                        Перегляд
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          void approveProduct(product.id)
                        }
                        disabled={action !== null}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-emerald-500/90 text-xs font-semibold disabled:opacity-50"
                      >
                        {approving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Схвалити
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void rejectProduct(product.id)
                        }
                        disabled={action !== null}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-red-500/10 text-xs font-semibold text-red-300 disabled:opacity-50"
                      >
                        {rejecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Відхилити
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="px-2 text-sm text-zinc-500">
                  {filteredProducts.length} товарів
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="min-w-[80px] text-center text-sm text-zinc-400">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}