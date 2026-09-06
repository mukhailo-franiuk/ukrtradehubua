
"use client";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  Package,
  ShieldCheck,
  Store,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SellerStatus =
  | "PENDING"
  | "ACTIVE"
  | "BLOCKED"
  | "SUSPENDED";

type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "OUT_OF_STOCK"
  | "ARCHIVED";

type UserStatus =
  | "ACTIVE"
  | "BLOCKED"
  | "SUSPENDED";

type Seller = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: UserStatus;
  isBlocked: boolean;
};

type Shop = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  sellerStatus: SellerStatus;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
};

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
  id: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  canonical: string | null;
};

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

  status: ProductStatus;

  isFeatured: boolean;
  isNew: boolean;

  weight: string | number | null;
  length: string | number | null;
  width: string | number | null;
  height: string | number | null;

  createdAt?: string;
  updatedAt?: string;

  shop: Shop | null;
  category: Category | null;
  brand: Brand | null;
  images: ProductImage[];
  seo: ProductSeo | null;
};

type SellerChecks = {
  exists: boolean;
  isSellerRole: boolean;
  isBlocked: boolean;
  userActive: boolean;
  shopExists: boolean;
  shopSellerStatus: SellerStatus | null;
  shopSellerStatusAllowed: boolean;
};

type ModerationData = {
  product: {
    id: string;
    title: string;
    status: ProductStatus;
  };

  seller: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    status: UserStatus | null;
    isBlocked: boolean;
  };

  shop: {
    id: string | null;
    userId: string | null;
    name: string | null;
    slug: string | null;
    sellerStatus: SellerStatus | null;
  };

  checks: SellerChecks;

  sellerCanSell: boolean;
};

type ApiResponse = {
  product: Product;
  seller: Seller | null;
  shop: Shop | null;
  moderation: ModerationData;
};

type ApiErrorResponse = {
  error?: string;
  message?: string;
};

type ActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  product?: {
    id: string;
    title: string;
    status: ProductStatus;
  };
};

type LoadingAction = "approve" | "reject" | null;

function getSellerStatusLabel(
  status: SellerStatus | null
) {
  switch (status) {
    case "ACTIVE":
      return "Активний";

    case "PENDING":
      return "Очікує перевірки";

    case "BLOCKED":
      return "Заблокований";

    case "SUSPENDED":
      return "Призупинений";

    default:
      return "Невідомо";
  }
}

function getSellerStatusClass(
  status: SellerStatus | null
) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";

    case "BLOCKED":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    case "SUSPENDED":
      return "border-orange-500/30 bg-orange-500/10 text-orange-400";

    default:
      return "border-white/10 bg-white/5 text-zinc-400";
  }
}

function getProductStatusLabel(status: ProductStatus) {
  switch (status) {
    case "DRAFT":
      return "На модерації";

    case "ACTIVE":
      return "Активний";

    case "OUT_OF_STOCK":
      return "Немає в наявності";

    case "ARCHIVED":
      return "Архівований";

    default:
      return status;
  }
}

function getProductStatusClass(status: ProductStatus) {
  switch (status) {
    case "DRAFT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";

    case "ACTIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";

    case "OUT_OF_STOCK":
      return "border-orange-500/30 bg-orange-500/10 text-orange-400";

    case "ARCHIVED":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    default:
      return "border-white/10 bg-white/5 text-zinc-400";
  }
}

function formatPrice(value: string | number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function CheckRow({
  label,
  ok,
  warning = false,
}: {
  label: string;
  ok: boolean;
  warning?: boolean;
}) {
  const isWarning = warning && !ok;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-300">
        {label}
      </span>

      {ok ? (
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Так
        </span>
      ) : isWarning ? (
        <span className="flex items-center gap-2 text-sm font-medium text-amber-400">
          <AlertCircle className="h-4 w-4" />
          Перевірити
        </span>
      ) : (
        <span className="flex items-center gap-2 text-sm font-medium text-red-400">
          <XCircle className="h-4 w-4" />
          Ні
        </span>
      )}
    </div>
  );
}

export default function ProductModerationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const productId = params?.id;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [seller, setSeller] =
    useState<Seller | null>(null);

  const [shop, setShop] =
    useState<Shop | null>(null);

  const [moderation, setModeration] =
    useState<ModerationData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [actionLoading, setActionLoading] =
    useState<LoadingAction>(null);

  const [selectedImage, setSelectedImage] =
    useState(0);

  useEffect(() => {
    if (!productId) {
      setError("Не вказано ID товару.");
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
          )}/moderation`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json() as
          | ApiResponse
          | ApiErrorResponse;

        if (!response.ok) {
          const errorData =
            data as ApiErrorResponse;

          throw new Error(
            errorData.error ||
              errorData.message ||
              `Не вдалося завантажити товар. Код: ${response.status}`
          );
        }

        const successData =
          data as ApiResponse;

        if (!successData.product) {
          throw new Error(
            "API не повернув дані товару."
          );
        }

        if (cancelled) {
          return;
        }

        setProduct(successData.product);
        setSeller(successData.seller ?? null);
        setShop(successData.shop ?? null);
        setModeration(
          successData.moderation ?? null
        );

        setSelectedImage(0);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Moderation product load error:",
          err
        );

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
  }, [productId]);

  const productChecks = useMemo(() => {
    if (!product) {
      return [];
    }

    return [
      {
        id: "title",
        label: "Назва товару",
        status:
          product.title.trim().length >= 3
            ? "ok"
            : "error",
      },
      {
        id: "description",
        label: "Опис товару",
        status:
          Boolean(
            product.description &&
              product.description.trim().length >=
                20
          )
            ? "ok"
            : "warning",
      },
      {
        id: "price",
        label: "Ціна",
        status:
          Number(product.price) > 0
            ? "ok"
            : "error",
      },
      {
        id: "stock",
        label: "Залишок товару",
        status:
          product.stock > 0
            ? "ok"
            : "warning",
      },
      {
        id: "category",
        label: "Категорія",
        status:
          product.category &&
          product.category.isActive
            ? "ok"
            : "error",
      },
      {
        id: "shop",
        label: "Магазин",
        status:
          product.shop ? "ok" : "error",
      },
      {
        id: "images",
        label: "Зображення",
        status:
          product.images.length > 0
            ? "ok"
            : "error",
      },
      {
        id: "primaryImage",
        label: "Основне зображення",
        status:
          product.images.some(
            (image) => image.isPrimary
          )
            ? "ok"
            : "warning",
      },
      {
        id: "sku",
        label: "SKU",
        status:
          product.sku &&
          product.sku.trim().length > 0
            ? "ok"
            : "warning",
      },
    ] as Array<{
      id: string;
      label: string;
      status: "ok" | "warning" | "error";
    }>;
  }, [product]);

  const productHasErrors = productChecks.some(
    (item) => item.status === "error"
  );

  const sellerHasCriticalIssue =
    moderation
      ? !moderation.sellerCanSell
      : true;

  const canApprove =
    Boolean(product) &&
    product?.status === "DRAFT" &&
    !productHasErrors &&
    !sellerHasCriticalIssue &&
    !actionLoading;

  const handleModerationAction = async (
    action: "approve" | "reject"
  ) => {
    if (!product) {
      return;
    }

    const actionText =
      action === "approve"
        ? "затвердити"
        : "відхилити";

    const confirmed = window.confirm(
      action === "approve"
        ? `Ви впевнені, що хочете затвердити товар «${product.title}»?`
        : `Ви впевнені, що хочете відхилити товар «${product.title}»?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(action);
      setError(null);

      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(
          product.id
        )}/moderation/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data =
        await response.json() as ActionResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Не вдалося ${actionText} товар. Код: ${response.status}`
        );
      }

      if (data.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            `Не вдалося ${actionText} товар.`
        );
      }

      router.push(
        "/admin/moderation/products"
      );

      router.refresh();
    } catch (err) {
      console.error(
        `Product ${action} error:`,
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : `Не вдалося ${actionText} товар.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" />

          <p className="text-sm text-zinc-400">
            Завантаження товару...
          </p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/admin/moderation/products"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до модерації
        </Link>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />

            <div>
              <h1 className="font-semibold text-white">
                Не вдалося завантажити товар
              </h1>

              <p className="mt-2 text-sm leading-6 text-red-300">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center">
          <Package className="mx-auto h-10 w-10 text-zinc-500" />

          <h1 className="mt-4 text-lg font-semibold text-white">
            Товар не знайдено
          </h1>

          <Link
            href="/admin/moderation/products"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            До модерації
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];

  const currentImage =
    images[selectedImage] ?? null;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/admin/moderation/products"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до модерації
          </Link>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getProductStatusClass(
                    product.status
                  )}`}
                >
                  {getProductStatusLabel(
                    product.status
                  )}
                </span>

                {product.isFeatured && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                    Рекомендований
                  </span>
                )}

                {product.isNew && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    Новинка
                  </span>
                )}
              </div>

              <h1 className="max-w-4xl text-2xl font-bold tracking-tight sm:text-3xl">
                {product.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
                <span>
                  SKU:{" "}
                  <span className="text-zinc-300">
                    {product.sku || "—"}
                  </span>
                </span>

                <span>
                  ID:{" "}
                  <span className="font-mono text-zinc-400">
                    {product.id}
                  </span>
                </span>

                <span>
                  Slug:{" "}
                  <span className="text-zinc-300">
                    {product.slug}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/products/${product.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                <Eye className="h-4 w-4" />
                Переглянути
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <Link
                href={`/admin/products/${product.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Редагувати
              </Link>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <p className="font-medium text-red-300">
                  Помилка
                </p>

                <p className="mt-1 text-sm text-red-300/80">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* IMAGES */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Зображення
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      {images.length}{" "}
                      {images.length === 1
                        ? "зображення"
                        : "зображень"}
                    </p>
                  </div>

                  <ImageIcon className="h-5 w-5 text-zinc-500" />
                </div>
              </div>

              <div className="p-5">
                {currentImage ? (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <img
                        src={
                          currentImage.url
                        }
                        alt={
                          currentImage.alt ||
                          product.title
                        }
                        className="h-full w-full object-contain"
                      />

                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedImage(
                                (prev) =>
                                  prev === 0
                                    ? images.length -
                                      1
                                    : prev - 1
                              )
                            }
                            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black"
                            aria-label="Попереднє зображення"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedImage(
                                (prev) =>
                                  prev ===
                                  images.length - 1
                                    ? 0
                                    : prev + 1
                              )
                            }
                            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black"
                            aria-label="Наступне зображення"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
                        {selectedImage + 1} /{" "}
                        {images.length}
                      </div>
                    </div>

                    {images.length > 1 && (
                      <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                        {images.map(
                          (image, index) => (
                            <button
                              key={image.id}
                              type="button"
                              onClick={() =>
                                setSelectedImage(
                                  index
                                )
                              }
                              className={`relative aspect-square overflow-hidden rounded-xl border bg-black transition ${
                                selectedImage ===
                                index
                                  ? "border-amber-400 ring-2 ring-amber-400/20"
                                  : "border-white/10 hover:border-white/30"
                              }`}
                            >
                              <img
                                src={image.url}
                                alt={
                                  image.alt ||
                                  product.title
                                }
                                className="h-full w-full object-cover"
                              />

                              {image.isPrimary && (
                                <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-black">
                                  MAIN
                                </span>
                              )}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20">
                    <ImageIcon className="h-12 w-12 text-zinc-700" />

                    <p className="mt-3 text-sm text-zinc-500">
                      Зображення відсутні
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* PRODUCT INFO */}
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold">
                  Інформація про товар
                </h2>
              </div>

              <div className="grid gap-px overflow-hidden bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  label="Ціна"
                  value={formatPrice(
                    product.price
                  )}
                  highlight
                />

                <InfoCard
                  label="Стара ціна"
                  value={formatPrice(
                    product.oldPrice
                  )}
                />

                <InfoCard
                  label="Залишок"
                  value={`${product.stock} шт.`}
                />

                <InfoCard
                  label="Зарезервовано"
                  value={`${product.reservedStock} шт.`}
                />

                <InfoCard
                  label="SKU"
                  value={
                    product.sku || "Не вказано"
                  }
                />

                <InfoCard
                  label="Slug"
                  value={product.slug}
                />

                <InfoCard
                  label="Вага"
                  value={
                    product.weight
                      ? `${product.weight}`
                      : "—"
                  }
                />

                <InfoCard
                  label="Довжина"
                  value={
                    product.length
                      ? `${product.length}`
                      : "—"
                  }
                />

                <InfoCard
                  label="Ширина"
                  value={
                    product.width
                      ? `${product.width}`
                      : "—"
                  }
                />

                <InfoCard
                  label="Висота"
                  value={
                    product.height
                      ? `${product.height}`
                      : "—"
                  }
                />
              </div>
            </section>

            {/* DESCRIPTION */}
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold">
                  Опис
                </h2>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Короткий опис
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                    {product.shortDescription ||
                      "Короткий опис відсутній."}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Повний опис
                  </p>

                  <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                    {product.description ||
                      "Повний опис відсутній."}
                  </div>
                </div>
              </div>
            </section>

            {/* CATEGORY / BRAND */}
            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
                    <Tag className="h-5 w-5 text-amber-400" />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Категорія
                    </p>

                    <p className="font-semibold text-white">
                      {product.category?.name ||
                        "Не вказана"}
                    </p>
                  </div>
                </div>

                {product.category && (
                  <div className="space-y-2 text-sm">
                    <p className="text-zinc-500">
                      Slug:{" "}
                      <span className="text-zinc-300">
                        {product.category.slug}
                      </span>
                    </p>

                    <p className="text-zinc-500">
                      Активна:{" "}
                      <span
                        className={
                          product.category
                            .isActive
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {product.category
                          .isActive
                          ? "Так"
                          : "Ні"}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10">
                    <Tag className="h-5 w-5 text-blue-400" />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Бренд
                    </p>

                    <p className="font-semibold text-white">
                      {product.brand?.name ||
                        "Не вказаний"}
                    </p>
                  </div>
                </div>

                {product.brand && (
                  <p className="text-sm text-zinc-500">
                    Slug:{" "}
                    <span className="text-zinc-300">
                      {product.brand.slug}
                    </span>
                  </p>
                )}
              </div>
            </section>

            {/* SEO */}
            {product.seo && (
              <section className="rounded-2xl border border-white/10 bg-zinc-900/70">
                <div className="border-b border-white/10 px-5 py-4">
                  <h2 className="font-semibold">
                    SEO
                  </h2>
                </div>

                <div className="space-y-4 p-5">
                  <InfoRow
                    label="SEO title"
                    value={
                      product.seo.title || "—"
                    }
                  />

                  <InfoRow
                    label="SEO description"
                    value={
                      product.seo.description ||
                      "—"
                    }
                  />

                  <InfoRow
                    label="Keywords"
                    value={
                      product.seo.keywords || "—"
                    }
                  />

                  <InfoRow
                    label="Canonical"
                    value={
                      product.seo.canonical || "—"
                    }
                  />
                </div>
              </section>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* SELLER */}
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Продавець
                    </h2>

                    <p className="text-xs text-zinc-500">
                      Власник магазину
                    </p>
                  </div>
                </div>

                {seller && (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSellerStatusClass(
                      shop?.sellerStatus ??
                        null
                    )}`}
                  >
                    {getSellerStatusLabel(
                      shop?.sellerStatus ??
                        null
                    )}
                  </span>
                )}
              </div>

              <div className="space-y-4 p-5">
                {seller ? (
                  <>
                    <div>
                      <p className="text-xs text-zinc-500">
                        Ім'я
                      </p>

                      <p className="mt-1 font-medium text-white">
                        {seller.name ||
                          "Не вказано"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Email
                      </p>

                      <p className="mt-1 break-all text-sm text-zinc-300">
                        {seller.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Телефон
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {seller.phone ||
                          "Не вказано"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Роль
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {seller.role}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Статус акаунта
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {seller.status}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-red-300">
                      У товару не знайдено продавця.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* SHOP */}
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                    <Store className="h-5 w-5 text-purple-400" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Магазин
                    </h2>

                    <p className="text-xs text-zinc-500">
                      Дані магазину продавця
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {shop ? (
                  <>
                    <div>
                      <p className="text-xs text-zinc-500">
                        Назва
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {shop.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Slug
                      </p>

                      <p className="mt-1 break-all text-sm text-zinc-300">
                        {shop.slug}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Seller status
                      </p>

                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSellerStatusClass(
                            shop.sellerStatus
                          )}`}
                        >
                          {getSellerStatusLabel(
                            shop.sellerStatus
                          )}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Shop ID
                      </p>

                      <p className="mt-1 break-all font-mono text-xs text-zinc-400">
                        {shop.id}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-red-300">
                      Магазин не знайдено.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* SELLER SECURITY */}
            <section
              className={`rounded-2xl border ${
                moderation?.sellerCanSell
                  ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                  : "border-red-500/20 bg-red-500/[0.04]"
              }`}
            >
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      moderation?.sellerCanSell
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    <ShieldCheck
                      className={`h-5 w-5 ${
                        moderation?.sellerCanSell
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Перевірка продавця
                    </h2>

                    <p className="text-xs text-zinc-500">
                      Чи може продавець продавати
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-5">
                {moderation ? (
                  <>
                    <CheckRow
                      label="Продавець існує"
                      ok={
                        moderation.checks
                          .exists
                      }
                    />

                    <CheckRow
                      label="Роль SELLER"
                      ok={
                        moderation.checks
                          .isSellerRole
                      }
                    />

                    <CheckRow
                      label="Акаунт не заблокований"
                      ok={
                        !moderation.checks
                          .isBlocked
                      }
                    />

                    <CheckRow
                      label="Акаунт ACTIVE"
                      ok={
                        moderation.checks
                          .userActive
                      }
                    />

                    <CheckRow
                      label="Магазин існує"
                      ok={
                        moderation.checks
                          .shopExists
                      }
                    />

                    <CheckRow
                      label="Магазин ACTIVE"
                      ok={
                        moderation.checks
                          .shopSellerStatusAllowed
                      }
                    />

                    <div
                      className={`mt-4 rounded-xl border p-4 ${
                        moderation.sellerCanSell
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-red-500/20 bg-red-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {moderation.sellerCanSell ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}

                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              moderation.sellerCanSell
                                ? "text-emerald-300"
                                : "text-red-300"
                            }`}
                          >
                            {moderation.sellerCanSell
                              ? "Продавець може продавати"
                              : "Продавець не може продавати"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {moderation.sellerCanSell
                              ? "Усі критичні перевірки пройдено."
                              : "Є критична проблема зі статусом продавця або магазину."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Дані перевірки відсутні.
                  </p>
                )}
              </div>
            </section>

            {/* PRODUCT CHECKLIST */}
            <section className="rounded-2xl border border-white/10 bg-zinc-900/70">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      Перевірка товару
                    </h2>

                    <p className="mt-1 text-xs text-zinc-500">
                      Перед затвердженням
                    </p>
                  </div>

                  {productHasErrors ? (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                      Є помилки
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                      OK
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-5">
                {productChecks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 px-4 py-3"
                  >
                    <span className="text-sm text-zinc-300">
                      {check.label}
                    </span>

                    {check.status ===
                    "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : check.status ===
                      "warning" ? (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* MODERATION */}
            <section className="sticky top-6 rounded-2xl border border-white/10 bg-zinc-900/90 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
                    <BadgeCheck className="h-5 w-5 text-amber-400" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Рішення модерації
                    </h2>

                    <p className="text-xs text-zinc-500">
                      Керування статусом товару
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {product.status !==
                  "DRAFT" && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-300">
                      Товар уже має статус{" "}
                      <span className="font-semibold text-white">
                        {getProductStatusLabel(
                          product.status
                        )}
                      </span>
                      .
                    </p>
                  </div>
                )}

                {product.status ===
                  "DRAFT" &&
                  productHasErrors && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                        <div>
                          <p className="text-sm font-semibold text-red-300">
                            Неможливо затвердити
                          </p>

                          <p className="mt-1 text-xs leading-5 text-red-300/80">
                            Виправте критичні
                            помилки товару
                            перед
                            затвердженням.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {product.status ===
                  "DRAFT" &&
                  !productHasErrors &&
                  sellerHasCriticalIssue && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                        <div>
                          <p className="text-sm font-semibold text-red-300">
                            Продавець не допущений
                          </p>

                          <p className="mt-1 text-xs leading-5 text-red-300/80">
                            Товар не можна
                            затвердити, доки
                            продавець або його
                            магазин не матимуть
                            статусу ACTIVE.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="grid gap-3">
                  <button
                    type="button"
                    disabled={!canApprove}
                    onClick={() =>
                      handleModerationAction(
                        "approve"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {actionLoading ===
                    "approve" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Затвердження...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Затвердити товар
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={
                      product.status !==
                        "DRAFT" ||
                      Boolean(actionLoading)
                    }
                    onClick={() =>
                      handleModerationAction(
                        "reject"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {actionLoading ===
                    "reject" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Відхилення...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Відхилити товар
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] leading-5 text-zinc-600">
                  Відхилення переводить товар у
                  статус ARCHIVED.
                  <br />
                  Затвердження переводить товар у
                  статус ACTIVE.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* SYSTEM INFO */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/70">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-zinc-500" />

              <h2 className="font-semibold">
                Системна інформація
              </h2>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              label="Product ID"
              value={product.id}
              mono
            />

            <InfoCard
              label="Shop ID"
              value={product.shopId}
              mono
            />

            <InfoCard
              label="Category ID"
              value={product.categoryId}
              mono
            />

            <InfoCard
              label="Brand ID"
              value={
                product.brandId || "—"
              }
              mono
            />

            {product.createdAt && (
              <InfoCard
                label="Створено"
                value={new Date(
                  product.createdAt
                ).toLocaleString("uk-UA")}
              />
            )}

            {product.updatedAt && (
              <InfoCard
                label="Оновлено"
                value={new Date(
                  product.updatedAt
                ).toLocaleString("uk-UA")}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight = false,
  mono = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-1 break-words ${
          highlight
            ? "text-lg font-bold text-amber-400"
            : "text-sm font-medium text-zinc-200"
        } ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm leading-6 text-zinc-300">
        {value}
      </p>
    </div>
  );
}