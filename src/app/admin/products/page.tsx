import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Tag,
  TrendingUp,
} from "lucide-react";

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Товари | UkrTradeHub Admin",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminProductsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 20;
const MAX_SEARCH_LENGTH = 200;

const PRODUCT_STATUSES = [
  "ACTIVE",
  "DRAFT",
  "ARCHIVED",
  "OUT_OF_STOCK",
] as const;

type ProductStatus = (typeof PRODUCT_STATUSES)[number];

function isProductStatus(value: string): value is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

function productStatusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Чернетка";

    case "ACTIVE":
      return "Активний";

    case "ARCHIVED":
      return "Архівований";

    case "OUT_OF_STOCK":
      return "Немає в наявності";

    default:
      return status;
  }
}

function productStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "DRAFT":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "ARCHIVED":
      return "border-purple-400/20 bg-purple-400/10 text-purple-300";

    case "OUT_OF_STOCK":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
  }).format(date);
}

function formatPrice(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₴`;
}

function formatNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("uk-UA");
}

function formatRating(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toFixed(1);
}

function parsePage(value?: string) {
  const page = Number(value);

  if (!Number.isSafeInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;

  const page = parsePage(params.page);

  const search =
    params.search?.trim().slice(0, MAX_SEARCH_LENGTH) || "";

  const rawStatus = params.status?.trim() || "";

  const status = isProductStatus(rawStatus)
    ? rawStatus
    : undefined;

  const where = {
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              shop: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              category: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [totalProducts, activeProducts, featuredProducts] =
    await Promise.all([
      db.product.count({
        where,
      }),

      db.product.count({
        where: {
          ...where,
          status: "ACTIVE",
        },
      }),

      db.product.count({
        where: {
          ...where,
          isFeatured: true,
        },
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalProducts / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  if (safePage !== page) {
    redirect(
      createPageUrl({
        page: safePage,
        search,
        status: status || "",
      })
    );
  }

  const products = await db.product.findMany({
    where,

    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          sellerStatus: true,
        },
      },

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      images: {
        select: {
          id: true,
          url: true,
          alt: true,
          isPrimary: true,
          sortOrder: true,
        },

        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],

        take: 1,
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const hasFilters = Boolean(search || status);

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <Package
                className="h-5 w-5"
                aria-hidden="true"
              />

              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Marketplace
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Товари
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Керування товарами продавців UkrTradeHub
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 hover:shadow-amber-400/20"
          >
            <Plus
              className="h-4 w-4"
              aria-hidden="true"
            />
            Додати товар
          </Link>
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <Package
                className="h-5 w-5"
                aria-hidden="true"
              />
            }
            value={totalProducts}
            label="Знайдено товарів"
          />

          <SummaryCard
            icon={
              <ShoppingBag
                className="h-5 w-5"
                aria-hidden="true"
              />
            }
            value={activeProducts}
            label="Активних у вибірці"
          />

          <SummaryCard
            icon={
              <TrendingUp
                className="h-5 w-5"
                aria-hidden="true"
              />
            }
            value={featuredProducts}
            label="Рекомендованих у вибірці"
          />

          <SummaryCard
            icon={
              <Store
                className="h-5 w-5"
                aria-hidden="true"
              />
            }
            value={products.length}
            label="На поточній сторінці"
          />
        </div>

        {/* FILTERS */}
        <form
          method="GET"
          className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <label
                htmlFor="product-search"
                className="sr-only"
              >
                Пошук товарів
              </label>

              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                aria-hidden="true"
              />

              <input
                id="product-search"
                type="search"
                name="search"
                defaultValue={search}
                maxLength={MAX_SEARCH_LENGTH}
                placeholder="Пошук за назвою, slug, магазином або категорією..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30"
              />
            </div>

            <div>
              <label
                htmlFor="product-status"
                className="sr-only"
              >
                Статус товару
              </label>

              <select
                id="product-status"
                name="status"
                defaultValue={status || ""}
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-zinc-400 outline-none transition focus:border-amber-400/30 lg:w-auto"
              >
                <option value="">Усі статуси</option>

                <option value="ACTIVE">
                  Активні
                </option>

                <option value="DRAFT">
                  Чернетки
                </option>

                <option value="ARCHIVED">
                  Архівовані
                </option>

                <option value="OUT_OF_STOCK">
                  Немає в наявності
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Знайти
            </button>

            {hasFilters && (
              <Link
                href="/admin/products"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.07] px-5 text-sm font-bold text-zinc-500 transition hover:border-white/[0.12] hover:text-white"
              >
                Скинути
              </Link>
            )}
          </div>
        </form>

        {/* TABLE */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-black">
                Список товарів
              </h2>

              <p className="mt-1 text-xs text-zinc-700">
                {hasFilters
                  ? "Результати пошуку та фільтрації"
                  : "Усі товари маркетплейсу"}
              </p>
            </div>

            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-400/15"
            >
              <Plus
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
              Новий товар
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <caption className="sr-only">
                Список товарів маркетплейсу
              </caption>

              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <TableHead>Товар</TableHead>
                  <TableHead>Продавець</TableHead>
                  <TableHead>Категорія</TableHead>
                  <TableHead>Ціна</TableHead>
                  <TableHead>Залишок</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Перегляди</TableHead>
                  <TableHead>Рейтинг</TableHead>
                  <TableHead>Створено</TableHead>

                  <th
                    scope="col"
                    aria-label="Дії"
                    className="w-[70px] px-4 py-4"
                  />
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const image = product.images[0];
                  const stock = Number(product.stock);

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                    >
                      {/* PRODUCT */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-[#070a10]">
                            {image?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image.url}
                                alt={
                                  image.alt ||
                                  product.title
                                }
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package
                                className="h-5 w-5 text-zinc-700"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          <div className="min-w-0 max-w-[280px]">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-bold text-white">
                                {product.title}
                              </div>

                              {product.isFeatured && (
                                <span className="shrink-0 rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">
                                  TOP
                                </span>
                              )}

                              {product.isNew && (
                                <span className="shrink-0 rounded-md border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-blue-300">
                                  NEW
                                </span>
                              )}
                            </div>

                            <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-700">
                              /{product.slug}
                            </div>

                            {product.sku && (
                              <div className="mt-0.5 truncate text-[10px] text-zinc-700">
                                SKU: {product.sku}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SELLER */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300">
                            <Store
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="max-w-[180px] truncate text-sm font-semibold text-zinc-300">
                              {product.shop?.name ||
                                "Без магазину"}
                            </div>

                            {product.shop?.slug && (
                              <div className="mt-0.5 max-w-[180px] truncate text-xs text-zinc-700">
                                /{product.shop.slug}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Tag
                            className="h-3.5 w-3.5 text-zinc-700"
                            aria-hidden="true"
                          />

                          <span className="max-w-[170px] truncate text-xs font-medium text-zinc-500">
                            {product.category?.name ||
                              "Без категорії"}
                          </span>
                        </div>
                      </td>

                      {/* PRICE */}
                      <td className="px-4 py-4">
                        <div className="whitespace-nowrap">
                          <div className="text-sm font-black text-white">
                            {formatPrice(product.price)}
                          </div>

                          {product.oldPrice != null && (
                            <div className="mt-0.5 text-[10px] text-zinc-700 line-through">
                              {formatPrice(product.oldPrice)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* STOCK */}
                      <td className="px-4 py-4">
                        <div>
                          <span
                            className={`text-sm font-bold ${
                              stock <= 0
                                ? "text-red-400"
                                : stock <= 5
                                  ? "text-amber-400"
                                  : "text-zinc-300"
                            }`}
                          >
                            {formatNumber(product.stock)}
                          </span>

                          {Number(product.reservedStock) >
                            0 && (
                            <div className="mt-0.5 text-[10px] text-zinc-700">
                              Зарезервовано:{" "}
                              {formatNumber(
                                product.reservedStock
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${productStatusStyle(
                            product.status
                          )}`}
                        >
                          {productStatusLabel(
                            product.status
                          )}
                        </span>
                      </td>

                      {/* VIEWS */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                          <Eye
                            className="h-3.5 w-3.5 text-zinc-700"
                            aria-hidden="true"
                          />

                          {formatNumber(product.viewsCount)}
                        </div>
                      </td>

                      {/* RATING */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-amber-400">
                          {formatRating(product.rating)}
                        </span>
                      </td>

                      {/* CREATED */}
                      <td className="px-4 py-4">
                        <span className="text-xs text-zinc-500">
                          {formatDate(product.createdAt)}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
                          aria-label={`Переглянути ${product.title}`}
                          title={`Переглянути ${product.title}`}
                        >
                          <Eye
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-700">
                          <Package
                            className="h-6 w-6"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="font-bold text-zinc-400">
                          Товарів не знайдено
                        </div>

                        <div className="mt-1 text-sm text-zinc-700">
                          {hasFilters
                            ? "Спробуйте змінити параметри пошуку"
                            : "У маркетплейсі поки немає товарів"}
                        </div>

                        <Link
                          href={
                            hasFilters
                              ? "/admin/products"
                              : "/admin/products/new"
                          }
                          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-black text-black transition hover:bg-amber-300"
                        >
                          {hasFilters ? (
                            "Скинути фільтри"
                          ) : (
                            <>
                              <Plus
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Додати перший товар
                            </>
                          )}
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
              <div className="text-xs text-zinc-600">
                Сторінка {safePage} з {totalPages}
              </div>

              <div className="flex gap-2">
                <PaginationLink
                  disabled={safePage <= 1}
                  href={createPageUrl({
                    page: safePage - 1,
                    search,
                    status: status || "",
                  })}
                  ariaLabel="Попередня сторінка"
                >
                  <ChevronLeft
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </PaginationLink>

                <PaginationLink
                  disabled={safePage >= totalPages}
                  href={createPageUrl({
                    page: safePage + 1,
                    search,
                    status: status || "",
                  })}
                  ariaLabel="Наступна сторінка"
                >
                  <ChevronRight
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </PaginationLink>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="text-2xl font-black text-white">
        {value.toLocaleString("uk-UA")}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-zinc-700"
    >
      {children}
    </th>
  );
}

function PaginationLink({
  href,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  disabled: boolean;
  ariaLabel: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={ariaLabel}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.05] text-zinc-800"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
    >
      {children}
    </Link>
  );
}

function createPageUrl({
  page,
  search,
  status,
}: {
  page: number;
  search: string;
  status: string;
}) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (search) {
    params.set("search", search);
  }

  if (status) {
    params.set("status", status);
  }

  const query = params.toString();

  return query
    ? `/admin/products?${query}`
    : "/admin/products";
}