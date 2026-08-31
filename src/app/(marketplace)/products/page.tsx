"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Heart,
  Loader2,
  PackageOpen,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  isPrimary?: boolean;
};

type Product = {
  id: string;
  title: string;
  slug: string;

  description?: string | null;
  shortDescription?: string | null;

  price: string | number;
  oldPrice?: string | number | null;

  stock: number;
  status: string;

  rating?: string | number;
  reviewsCount?: number;

  isFeatured?: boolean;
  isNew?: boolean;

  shop?: {
    id: string;
    name: string;
    slug: string;
  } | null;

  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;

  brand?: {
    id: string;
    name: string;
    slug: string;
  } | null;

  images?: ProductImage[];
};

type ApiResponse = {
  success?: boolean;
  data?: Product[];
  total?: number;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

const ITEMS_PER_PAGE = 24;

function formatPrice(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function getProductImage(product: Product) {
  if (!product.images || product.images.length === 0) {
    return null;
  }

  const primaryImage = product.images.find(
    (image) => image.isPrimary
  );

  return (
    primaryImage?.thumbnailUrl ||
    primaryImage?.url ||
    product.images[0]?.thumbnailUrl ||
    product.images[0]?.url ||
    null
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/products", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            typeof result === "object" &&
              result !== null &&
              "error" in result
              ? String(result.error)
              : "Не вдалося отримати товари"
          );
        }

        setProducts(
          Array.isArray(result.data)
            ? result.data
            : []
        );
      } catch (error) {
        console.error(
          "Products page error:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Не вдалося завантажити товари"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = useMemo(() => {
    const uniqueCategories = new Map<
      string,
      {
        id: string;
        name: string;
      }
    >();

    products.forEach((product) => {
      if (product.category) {
        uniqueCategories.set(
          product.category.id,
          {
            id: product.category.id,
            name: product.category.name,
          }
        );
      }
    });

    return Array.from(
      uniqueCategories.values()
    );
  }, [products]);

  // =====================================================
  // FILTER PRODUCTS
  // =====================================================

  const filteredProducts = useMemo(() => {
    let result = [...products];

    const normalizedSearch =
      search.trim().toLowerCase();

    if (normalizedSearch) {
      result = result.filter((product) => {
        const title =
          product.title?.toLowerCase() || "";

        const shop =
          product.shop?.name?.toLowerCase() || "";

        const brand =
          product.brand?.name?.toLowerCase() || "";

        return (
          title.includes(normalizedSearch) ||
          shop.includes(normalizedSearch) ||
          brand.includes(normalizedSearch)
        );
      });
    }

    if (category !== "all") {
      result = result.filter(
        (product) =>
          product.category?.id === category
      );
    }

    const min =
      minPrice.trim() !== ""
        ? Number(minPrice)
        : null;

    const max =
      maxPrice.trim() !== ""
        ? Number(maxPrice)
        : null;

    if (
      min !== null &&
      !Number.isNaN(min)
    ) {
      result = result.filter(
        (product) =>
          Number(product.price) >= min
      );
    }

    if (
      max !== null &&
      !Number.isNaN(max)
    ) {
      result = result.filter(
        (product) =>
          Number(product.price) <= max
      );
    }

    switch (sort) {
      case "price_asc":
        result.sort(
          (a, b) =>
            Number(a.price) -
            Number(b.price)
        );
        break;

      case "price_desc":
        result.sort(
          (a, b) =>
            Number(b.price) -
            Number(a.price)
        );
        break;

      case "rating":
        result.sort(
          (a, b) =>
            Number(b.rating ?? 0) -
            Number(a.rating ?? 0)
        );
        break;

      case "newest":
      default:
        break;
    }

    return result;
  }, [
    products,
    search,
    category,
    sort,
    minPrice,
    maxPrice,
  ]);

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredProducts.length /
        ITEMS_PER_PAGE
    )
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const paginatedProducts =
    filteredProducts.slice(
      (currentPage - 1) *
        ITEMS_PER_PAGE,
      currentPage *
        ITEMS_PER_PAGE
    );

  // =====================================================
  // RESET PAGE ON FILTER CHANGE
  // =====================================================

  useEffect(() => {
    setPage(1);
  }, [
    search,
    category,
    sort,
    minPrice,
    maxPrice,
  ]);

  // =====================================================
  // RESET FILTERS
  // =====================================================

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  // =====================================================
  // FILTERS CONTENT
  // =====================================================

  const filtersContent = (
    <div className="space-y-8">
      {/* HEADER */}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Фільтри
        </h2>

        <button
          type="button"
          onClick={resetFilters}
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          Скинути
        </button>
      </div>

      {/* CATEGORIES */}

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Категорія
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() =>
              setCategory("all")
            }
            className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
              category === "all"
                ? "bg-yellow-400 font-medium text-black"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Усі товари
          </button>

          {categories.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setCategory(item.id)
                }
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  category === item.id
                    ? "bg-yellow-400 font-medium text-black"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.name}
              </button>
            )
          )}
        </div>
      </div>

      {/* PRICE */}

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Ціна
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) =>
              setMinPrice(
                event.target.value
              )
            }
            placeholder="Від"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400"
          />

          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) =>
              setMaxPrice(
                event.target.value
              )
            }
            placeholder="До"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400"
          />
        </div>
      </div>
    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Link
              href="/"
              className="transition hover:text-yellow-400"
            >
              Головна
            </Link>

            <span>/</span>

            <span className="text-zinc-300">
              Товари
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Усі товари
          </h1>

          <p className="mt-3 text-zinc-400">
            Знайдіть потрібний товар серед
            пропозицій продавців UkrTradeHub
          </p>
        </div>

        {/* ================================================= */}
        {/* SEARCH + CONTROLS */}
        {/* ================================================= */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-2xl">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Пошук товарів, брендів та магазинів..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-400"
            />
          </div>

          <div className="flex gap-3">
            {/* MOBILE FILTER */}

            <button
              type="button"
              onClick={() =>
                setMobileFiltersOpen(true)
              }
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium transition hover:border-zinc-600 lg:hidden"
            >
              <SlidersHorizontal size={18} />

              Фільтри
            </button>

            {/* SORT */}

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value
                )
              }
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
            >
              <option value="newest">
                Спочатку нові
              </option>

              <option value="price_asc">
                Від дешевих
              </option>

              <option value="price_desc">
                Від дорогих
              </option>

              <option value="rating">
                За рейтингом
              </option>
            </select>
          </div>
        </div>

        {/* ================================================= */}
        {/* CONTENT */}
        {/* ================================================= */}

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* ================================================= */}
          {/* DESKTOP FILTERS */}
          {/* ================================================= */}

          <aside className="hidden h-fit rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 lg:block">
            {filtersContent}
          </aside>

          {/* ================================================= */}
          {/* PRODUCTS */}
          {/* ================================================= */}

          <section>
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                Знайдено{" "}
                <span className="font-semibold text-white">
                  {filteredProducts.length}
                </span>{" "}
                товарів
              </div>

              <div className="hidden items-center gap-2 text-sm text-zinc-500 sm:flex">
                <Grid2X2 size={18} />

                <span>
                  {currentPage} / {totalPages}
                </span>
              </div>
            </div>

            {/* LOADING */}

            {loading && (
              <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <Loader2
                  size={36}
                  className="animate-spin text-yellow-400"
                />

                <p className="text-zinc-400">
                  Завантажуємо товари...
                </p>
              </div>
            )}

            {/* ERROR */}

            {!loading && error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
                <p className="text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                  className="mt-4 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
                >
                  Спробувати ще раз
                </button>
              </div>
            )}

            {/* EMPTY */}

            {!loading &&
              !error &&
              paginatedProducts.length === 0 && (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                  <PackageOpen
                    size={52}
                    className="mb-5 text-zinc-600"
                  />

                  <h2 className="text-xl font-semibold">
                    Товари не знайдено
                  </h2>

                  <p className="mt-2 max-w-md text-sm text-zinc-500">
                    Спробуйте змінити параметри
                    пошуку або скинути фільтри.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-6 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
                  >
                    Скинути фільтри
                  </button>
                </div>
              )}

            {/* PRODUCTS GRID */}

            {!loading &&
              !error &&
              paginatedProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {paginatedProducts.map(
                    (product) => {
                      const image =
                        getProductImage(product);

                      return (
                        <Link
                          key={product.id}
                          href={`/products/${product.slug}`}
                          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 transition hover:-translate-y-1 hover:border-zinc-600 hover:bg-zinc-900"
                        >
                          {/* IMAGE */}

                          <div className="relative aspect-square overflow-hidden bg-zinc-950">
                            {image ? (
                              <img
                                src={image}
                                alt={
                                  product.title
                                }
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <PackageOpen
                                  size={42}
                                  className="text-zinc-700"
                                />
                              </div>
                            )}

                            {/* BADGES */}

                            <div className="absolute left-3 top-3 flex flex-col gap-2">
                              {product.isNew && (
                                <span className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold text-white">
                                  NEW
                                </span>
                              )}

                              {product.isFeatured && (
                                <span className="rounded-lg bg-yellow-400 px-2 py-1 text-xs font-bold text-black">
                                  TOP
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                              }}
                              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-yellow-400 hover:text-black"
                            >
                              <Heart size={18} />
                            </button>
                          </div>

                          {/* CONTENT */}

                          <div className="p-4">
                            {product.shop && (
                              <p className="mb-2 truncate text-xs text-zinc-500">
                                {product.shop.name}
                              </p>
                            )}

                            <h2 className="line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-zinc-100 transition group-hover:text-yellow-400">
                              {product.title}
                            </h2>

                            {/* RATING */}

                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Star
                                  size={15}
                                  className="fill-yellow-400 text-yellow-400"
                                />

                                <span className="text-sm text-zinc-300">
                                  {Number(
                                    product.rating ??
                                      0
                                  ).toFixed(1)}
                                </span>
                              </div>

                              {product.reviewsCount !==
                                undefined && (
                                <span className="text-xs text-zinc-600">
                                  (
                                  {
                                    product.reviewsCount
                                  }
                                  )
                                </span>
                              )}
                            </div>

                            {/* PRICE */}

                            <div className="mt-4 flex flex-wrap items-end gap-2">
                              <span className="text-lg font-bold text-white">
                                {formatPrice(
                                  product.price
                                )}{" "}
                                ₴
                              </span>

                              {product.oldPrice &&
                                Number(
                                  product.oldPrice
                                ) >
                                  Number(
                                    product.price
                                  ) && (
                                  <span className="text-xs text-zinc-600 line-through">
                                    {formatPrice(
                                      product.oldPrice
                                    )}{" "}
                                    ₴
                                  </span>
                                )}
                            </div>

                            {/* STOCK */}

                            <p
                              className={`mt-2 text-xs ${
                                product.stock > 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {product.stock > 0
                                ? "В наявності"
                                : "Немає в наявності"}
                            </p>
                          </div>
                        </Link>
                      );
                    }
                  )}
                </div>
              )}

            {/* ================================================= */}
            {/* PAGINATION */}
            {/* ================================================= */}

            {!loading &&
              !error &&
              filteredProducts.length >
                ITEMS_PER_PAGE && (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-bold text-black">
                    {currentPage}
                  </div>

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current + 1
                          )
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
          </section>
        </div>
      </div>

      {/* ================================================= */}
      {/* MOBILE FILTER MODAL */}
      {/* ================================================= */}

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Закрити фільтри"
            onClick={() =>
              setMobileFiltersOpen(false)
            }
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Фільтри
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {filtersContent}

            <button
              type="button"
              onClick={() =>
                setMobileFiltersOpen(false)
              }
              className="mt-8 w-full rounded-xl bg-yellow-400 py-4 font-semibold text-black transition hover:bg-yellow-300"
            >
              Показати товари
            </button>
          </div>
        </div>
      )}
    </main>
  );
}