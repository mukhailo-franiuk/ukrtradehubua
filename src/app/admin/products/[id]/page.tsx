
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FolderTree,
  Image as ImageIcon,
  Info,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Store,
  Tag,
  Truck,
  XCircle,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
};

type ProductSeo = {
  id?: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  canonical: string | null;
} | null;

type Product = {
  id: string;

  shopId: string;
  categoryId: string;
  brandId: string | null;

  title: string;
  slug: string;

  description: string | null;
  shortDescription: string | null;

  sku: string | null;

  price: string | number;
  oldPrice: string | number | null;

  stock: number;
  reservedStock: number;

  status:
    | "DRAFT"
    | "ACTIVE"
    | "INACTIVE"
    | "OUT_OF_STOCK"
    | "ARCHIVED";

  isFeatured: boolean;
  isNew: boolean;

  weight: string | number | null;
  length: string | number | null;
  width: string | number | null;
  height: string | number | null;

  shop: {
    id: string;
    name: string;
    slug: string;
    sellerStatus?: string;
  } | null;

  category: {
    id: string;
    name: string;
    slug: string;
    parentId?: string | null;
  } | null;

  brand: {
    id: string;
    name: string;
    slug: string;
  } | null;

  images: ProductImage[];

  seo: ProductSeo;

  createdAt?: string | null;
  updatedAt?: string | null;
};

type ProductResponse = {
  success: boolean;
  product?: Product;
  message?: string;
  error?: string;
};

// =====================================================
// HELPERS
// =====================================================

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(
  status: Product["status"]
) {
  switch (status) {
    case "DRAFT":
      return "Чернетка";

    case "ACTIVE":
      return "Активний";

    case "INACTIVE":
      return "Неактивний";

    case "OUT_OF_STOCK":
      return "Немає в наявності";

    case "ARCHIVED":
      return "Архівований";

    default:
      return status;
  }
}

function statusClasses(
  status: Product["status"]
) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";

    case "DRAFT":
      return "border-amber-400/20 bg-amber-400/10 text-amber-400";

    case "INACTIVE":
      return "border-zinc-400/20 bg-zinc-400/10 text-zinc-400";

    case "OUT_OF_STOCK":
      return "border-red-400/20 bg-red-400/10 text-red-400";

    case "ARCHIVED":
      return "border-purple-400/20 bg-purple-400/10 text-purple-400";

    default:
      return "border-white/10 bg-white/5 text-zinc-400";
  }
}

function getPrimaryImage(
  images: ProductImage[]
) {
  if (!images.length) return null;

  return (
    images.find((image) => image.isPrimary) ||
    images
      .slice()
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder
      )[0] ||
    null
  );
}

// =====================================================
// SMALL UI COMPONENTS
// =====================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/[0.05] py-4 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-zinc-600">
          {icon}
        </div>

        <span className="text-xs font-bold text-zinc-500">
          {label}
        </span>
      </div>

      <div className="min-w-0 text-right text-sm font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div>
        <h2 className="text-sm font-black text-white">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs text-zinc-600">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// =====================================================
// PAGE
// =====================================================

export default function ProductDetailsPage() {
  const params = useParams();

  const productId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [retryKey, setRetryKey] =
    useState(0);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  // ===================================================
  // LOAD
  // ===================================================

  useEffect(() => {
    if (!productId) {
      setError("ID товару не вказано");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/admin/products/${encodeURIComponent(
            productId
          )}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        let data: ProductResponse | null =
          null;

        try {
          data = await response.json();
        } catch {
          throw new Error(
            `Сервер повернув некоректну відповідь (${response.status})`
          );
        }

        if (!response.ok || !data?.success) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(
              "Сесія адміністратора недійсна або доступ заборонено."
            );
          }

          if (response.status === 404) {
            throw new Error(
              data?.message ||
                data?.error ||
                "Товар не знайдено."
            );
          }

          throw new Error(
            data?.message ||
              data?.error ||
              "Не вдалося завантажити товар."
          );
        }

        if (!data.product) {
          throw new Error(
            "Сервер не повернув дані товару."
          );
        }

        if (!cancelled) {
          setProduct(data.product);

          const primary =
            getPrimaryImage(
              data.product.images
            );

          setSelectedImage(
            primary?.url ||
              data.product.images[0]?.url ||
              null
          );
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "ProductDetailsPage load error:",
          err
        );

        setProduct(null);

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося завантажити товар."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId, retryKey]);

  // ===================================================
  // DERIVED
  // ===================================================

  const sortedImages = useMemo(() => {
    if (!product?.images) return [];

    return product.images
      .slice()
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder
      );
  }, [product]);

  const currentImage = useMemo(() => {
    if (!sortedImages.length) {
      return null;
    }

    return (
      sortedImages.find(
        (image) =>
          image.url === selectedImage
      ) ||
      getPrimaryImage(sortedImages) ||
      sortedImages[0]
    );
  }, [sortedImages, selectedImage]);

  const availableStock =
    product
      ? Math.max(
          product.stock -
            product.reservedStock,
          0
        )
      : 0;

  const discountPercent = useMemo(() => {
    if (
      !product?.oldPrice ||
      !product.price
    ) {
      return null;
    }

    const oldPrice = Number(
      product.oldPrice
    );

    const price = Number(product.price);

    if (
      !Number.isFinite(oldPrice) ||
      !Number.isFinite(price) ||
      oldPrice <= price
    ) {
      return null;
    }

    return Math.round(
      ((oldPrice - price) / oldPrice) *
        100
    );
  }, [product]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-full bg-[#070a10] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-[1700px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Loader2
                className="h-6 w-6 animate-spin text-amber-400"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-lg font-black">
              Завантаження товару
            </h1>

            <p className="mt-2 text-sm text-zinc-600">
              Отримуємо дані товару...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error || !product) {
    return (
      <main className="min-h-full bg-[#070a10] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-[1700px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10">
              <AlertCircle
                className="h-6 w-6 text-red-400"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-xl font-black">
              Не вдалося завантажити товар
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              {error ||
                "Товар не знайдено або стався невідомий збій."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() =>
                  setRetryKey(
                    (value) => value + 1
                  )
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
              >
                <RefreshCw
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Спробувати ще раз
              </button>

              <Link
                href="/admin/products"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-5 text-sm font-bold text-zinc-400 transition hover:border-white/[0.14] hover:text-white"
              >
                <ArrowLeft
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                До товарів
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ============================================
            TOP
        ============================================ */}

        <div className="mb-7">
          <Link
            href="/admin/products"
            className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-zinc-600 transition hover:text-amber-400"
          >
            <ArrowLeft
              className="h-4 w-4"
              aria-hidden="true"
            />
            Назад до товарів
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-amber-400">
                <Package
                  className="h-5 w-5"
                  aria-hidden="true"
                />

                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  UkrTradeHub
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
                {product.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusClasses(
                    product.status
                  )}`}
                >
                  {product.status ===
                    "ACTIVE" ||
                  product.status ===
                    "OUT_OF_STOCK" ? (
                    product.status ===
                    "ACTIVE" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )
                  ) : (
                    <Info className="h-3.5 w-3.5" />
                  )}

                  {statusLabel(
                    product.status
                  )}
                </span>

                {product.isFeatured && (
                  <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1.5 text-[10px] font-black text-purple-400">
                    РЕКОМЕНДОВАНИЙ
                  </span>
                )}

                {product.isNew && (
                  <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-[10px] font-black text-blue-400">
                    НОВИНКА
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
              >
                <Edit3
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Редагувати
              </Link>

              {product.slug && (
                <Link
                  href={`/products/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0f16] px-5 text-sm font-bold text-zinc-300 transition hover:border-white/[0.14] hover:text-white"
                >
                  <ExternalLink
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Відкрити товар
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ============================================
            MAIN GRID
        ============================================ */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* ==========================================
              LEFT
          ========================================== */}

          <div className="space-y-6">
            {/* IMAGE GALLERY */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.05] px-5 py-5 sm:px-6">
                <SectionTitle
                  icon={
                    <ImageIcon className="h-5 w-5" />
                  }
                  title="Зображення товару"
                  description={`${sortedImages.length} зображень`}
                />
              </div>

              <div className="p-5 sm:p-6">
                {sortedImages.length > 0 ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_110px]">
                    {/* MAIN IMAGE */}

                    <div className="relative flex aspect-square min-h-[400px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[#070a10]">
                      {currentImage?.url ? (
                        <img
                          src={currentImage.url}
                          alt={
                            currentImage.alt ||
                            product.title
                          }
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-700">
                          <ImageIcon className="h-16 w-16" />

                          <span className="mt-3 text-xs">
                            Немає зображення
                          </span>
                        </div>
                      )}

                      {currentImage?.isPrimary && (
                        <div className="absolute left-4 top-4 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black text-amber-400">
                          ОСНОВНЕ
                        </div>
                      )}
                    </div>

                    {/* THUMBNAILS */}

                    <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-y-auto">
                      {sortedImages.map(
                        (image, index) => {
                          const active =
                            image.url ===
                            currentImage?.url;

                          return (
                            <button
                              key={image.id}
                              type="button"
                              onClick={() =>
                                setSelectedImage(
                                  image.url
                                )
                              }
                              className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border transition lg:h-[104px] lg:w-[104px] ${
                                active
                                  ? "border-amber-400 ring-1 ring-amber-400/30"
                                  : "border-white/[0.07] hover:border-white/[0.15]"
                              }`}
                            >
                              <img
                                src={image.url}
                                alt={
                                  image.alt ||
                                  `${product.title} ${
                                    index + 1
                                  }`
                                }
                                className="h-full w-full object-cover"
                              />

                              {image.isPrimary && (
                                <span className="absolute bottom-1 left-1 right-1 rounded bg-black/70 px-1 py-1 text-center text-[8px] font-black text-amber-400">
                                  MAIN
                                </span>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.07] bg-[#070a10]">
                    <ImageIcon className="h-14 w-14 text-zinc-800" />

                    <p className="mt-4 text-sm font-bold text-zinc-600">
                      Зображення відсутні
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* DESCRIPTION */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5 sm:p-6">
              <SectionTitle
                icon={
                  <Info className="h-5 w-5" />
                }
                title="Опис товару"
                description="Інформація для покупця"
              />

              {product.shortDescription && (
                <div className="mb-6 rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
                    Короткий опис
                  </div>

                  <p className="text-sm leading-7 text-zinc-300">
                    {product.shortDescription}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
                  Повний опис
                </div>

                {product.description ? (
                  <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                    {product.description}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center text-sm text-zinc-700">
                    Опис не додано
                  </div>
                )}
              </div>
            </section>

            {/* PRODUCT DETAILS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5 sm:p-6">
              <SectionTitle
                icon={
                  <Package className="h-5 w-5" />
                }
                title="Характеристики"
                description="Основні параметри товару"
              />

              <div className="grid gap-x-10 md:grid-cols-2">
                <InfoRow
                  icon={
                    <Tag className="h-4 w-4" />
                  }
                  label="SKU"
                  value={
                    product.sku || "—"
                  }
                />

                <InfoRow
                  icon={
                    <Tag className="h-4 w-4" />
                  }
                  label="Slug"
                  value={
                    <span className="max-w-[220px] truncate font-mono text-xs text-zinc-500">
                      {product.slug}
                    </span>
                  }
                />

                <InfoRow
                  icon={
                    <Package className="h-4 w-4" />
                  }
                  label="ID"
                  value={
                    <span className="max-w-[220px] truncate font-mono text-[10px] text-zinc-600">
                      {product.id}
                    </span>
                  }
                />

                <InfoRow
                  icon={
                    <Boxes className="h-4 w-4" />
                  }
                  label="Загальний залишок"
                  value={product.stock}
                />

                <InfoRow
                  icon={
                    <Boxes className="h-4 w-4" />
                  }
                  label="Зарезервовано"
                  value={
                    product.reservedStock
                  }
                />

                <InfoRow
                  icon={
                    <Boxes className="h-4 w-4" />
                  }
                  label="Доступно"
                  value={
                    <span
                      className={
                        availableStock <=
                        0
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    >
                      {availableStock}
                    </span>
                  }
                />
              </div>
            </section>

            {/* DIMENSIONS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5 sm:p-6">
              <SectionTitle
                icon={
                  <Truck className="h-5 w-5" />
                }
                title="Габарити та вага"
                description="Дані для доставки"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                    Вага
                  </div>

                  <div className="mt-2 text-sm font-bold text-white">
                    {product.weight ??
                      "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                    Довжина
                  </div>

                  <div className="mt-2 text-sm font-bold text-white">
                    {product.length ??
                      "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                    Ширина
                  </div>

                  <div className="mt-2 text-sm font-bold text-white">
                    {product.width ??
                      "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                    Висота
                  </div>

                  <div className="mt-2 text-sm font-bold text-white">
                    {product.height ??
                      "—"}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ==========================================
              RIGHT
          ========================================== */}

          <aside className="space-y-6">
            {/* PRICE */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                  Ціна товару
                </span>

                <Tag className="h-4 w-4 text-amber-400" />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-black tracking-tight text-amber-400">
                  {formatPrice(
                    product.price
                  )}
                </span>

                {product.oldPrice && (
                  <span className="mb-1 text-sm font-bold text-zinc-700 line-through">
                    {formatPrice(
                      product.oldPrice
                    )}
                  </span>
                )}
              </div>

              {discountPercent !==
                null && (
                <div className="mt-4 inline-flex rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-black text-red-400">
                  -{discountPercent}%
                </div>
              )}
            </section>

            {/* INVENTORY */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  <Boxes className="h-5 w-5" />
                }
                title="Склад"
              />

              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      На складі
                    </span>

                    <span className="text-lg font-black text-white">
                      {product.stock}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Зарезервовано
                    </span>

                    <span className="text-lg font-black text-amber-400">
                      {product.reservedStock}
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    availableStock >
                    0
                      ? "border-emerald-400/10 bg-emerald-400/[0.03]"
                      : "border-red-400/10 bg-red-400/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Доступно
                    </span>

                    <span
                      className={`text-lg font-black ${
                        availableStock >
                        0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {availableStock}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SHOP */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  <Store className="h-5 w-5" />
                }
                title="Магазин"
                description="Продавець товару"
              />

              {product.shop ? (
                <>
                  <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Store className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">
                          {product.shop.name}
                        </div>

                        <div className="mt-1 truncate font-mono text-[10px] text-zinc-700">
                          /{product.shop.slug}
                        </div>
                      </div>
                    </div>

                    {product.shop.sellerStatus && (
                      <div className="mt-4 border-t border-white/[0.05] pt-4">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                          Seller status
                        </span>

                        <div className="mt-1 text-xs font-bold text-zinc-400">
                          {
                            product.shop
                              .sellerStatus
                          }
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/admin/shops/${product.shop.id}`}
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] py-3 text-xs font-bold text-zinc-500 transition hover:border-white/[0.12] hover:text-white"
                  >
                    Переглянути магазин
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] p-5 text-center text-xs text-zinc-700">
                  Магазин не знайдено
                </div>
              )}
            </section>

            {/* CATEGORY */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  <FolderTree className="h-5 w-5" />
                }
                title="Категорія"
              />

              {product.category ? (
                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="text-sm font-black text-white">
                    {product.category.name}
                  </div>

                  <div className="mt-1 font-mono text-[10px] text-zinc-700">
                    /{product.category.slug}
                  </div>

                  {product.category
                    .parentId && (
                    <div className="mt-4 border-t border-white/[0.05] pt-4">
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                        Parent category ID
                      </div>

                      <div className="mt-1 break-all font-mono text-[10px] text-zinc-600">
                        {
                          product
                            .category
                            .parentId
                        }
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] p-5 text-center text-xs text-zinc-700">
                  Категорія не знайдена
                </div>
              )}
            </section>

            {/* BRAND */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  <Tag className="h-5 w-5" />
                }
                title="Бренд"
              />

              {product.brand ? (
                <div className="rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <div className="text-sm font-black text-white">
                    {product.brand.name}
                  </div>

                  <div className="mt-1 font-mono text-[10px] text-zinc-700">
                    /{product.brand.slug}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] p-5 text-center text-xs text-zinc-700">
                  Бренд не вказано
                </div>
              )}
            </section>

            {/* SEO */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  <Search className="h-5 w-5" />
                }
                title="SEO"
                description="Пошукова оптимізація"
              />

              {product.seo ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                      Title
                    </div>

                    <div className="mt-1 text-xs leading-5 text-zinc-400">
                      {product.seo.title ||
                        "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                      Description
                    </div>

                    <div className="mt-1 text-xs leading-5 text-zinc-400">
                      {product.seo
                        .description ||
                        "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                      Keywords
                    </div>

                    <div className="mt-1 text-xs leading-5 text-zinc-400">
                      {product.seo
                        .keywords ||
                        "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                      Canonical
                    </div>

                    <div className="mt-1 break-all font-mono text-[10px] text-zinc-600">
                      {product.seo
                        .canonical ||
                        "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] p-5 text-center text-xs text-zinc-700">
                  SEO дані не налаштовані
                </div>
              )}
            </section>

            {/* DATES */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  <CalendarDays className="h-5 w-5" />
                }
                title="Системна інформація"
              />

              <div className="space-y-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                    Product ID
                  </div>

                  <div className="mt-1 break-all font-mono text-[10px] text-zinc-600">
                    {product.id}
                  </div>
                </div>

                {product.createdAt && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                      Створено
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {formatDate(
                        product.createdAt
                      )}
                    </div>
                  </div>
                )}

                {product.updatedAt && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700">
                      Оновлено
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {formatDate(
                        product.updatedAt
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* VISIBILITY */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
              <SectionTitle
                icon={
                  product.status ===
                    "ACTIVE" ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )
                }
                title="Видимість"
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <span className="text-xs text-zinc-500">
                    Статус
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusClasses(
                      product.status
                    )}`}
                  >
                    {statusLabel(
                      product.status
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <span className="text-xs text-zinc-500">
                    Рекомендований
                  </span>

                  <span
                    className={
                      product.isFeatured
                        ? "text-emerald-400"
                        : "text-zinc-700"
                    }
                  >
                    {product.isFeatured
                      ? "Так"
                      : "Ні"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#070a10] p-4">
                  <span className="text-xs text-zinc-500">
                    Новинка
                  </span>

                  <span
                    className={
                      product.isNew
                        ? "text-emerald-400"
                        : "text-zinc-700"
                    }
                  >
                    {product.isNew
                      ? "Так"
                      : "Ні"}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}