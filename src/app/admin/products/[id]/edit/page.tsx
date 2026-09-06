"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import ProductForm from "@/app/admin/products/components/ProductForm";

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
};

type ProductResponse = {
  success: boolean;
  product?: Product;
  message?: string;
  error?: string;
};

// =====================================================
// PAGE
// =====================================================

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

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

  // ===================================================
  // LOAD PRODUCT
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

        /*
         * ВАЖЛИВО:
         *
         * Не використовуємо абсолютний URL.
         *
         * Браузер сам відправить HttpOnly cookie
         * session_token на /api/admin/products/[id].
         *
         * credentials: "include" явно говорить fetch
         * передавати cookie.
         */

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
          if (response.status === 401 ||
            response.status === 403) {
            throw new Error(
              "Сесія адміністратора недійсна або доступ заборонено"
            );
          }

          if (response.status === 404) {
            throw new Error(
              data?.message ||
              data?.error ||
              "Товар не знайдено"
            );
          }

          throw new Error(
            data?.message ||
            data?.error ||
            "Не вдалося завантажити товар"
          );
        }

        if (!data.product) {
          throw new Error(
            "Сервер не повернув дані товару"
          );
        }

        if (!cancelled) {
          setProduct(data.product);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "EditProductPage load error:",
          err
        );

        setProduct(null);

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося завантажити товар"
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
                  setRetryKey((value) => value + 1)
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
  // FORM
  // ===================================================

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {/* TOP BAR */}
        <div className="mb-6">
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

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
                Редагування товару
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                Редагування товару продавця та його
                параметрів у UkrTradeHub.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-[#0b0f16] px-4 py-3">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
                ID товару
              </div>

              <div className="mt-1 max-w-[260px] truncate font-mono text-xs text-zinc-500">
                {product.id}
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT INFO */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
              Товар
            </div>

            <div className="mt-2 truncate text-sm font-bold text-white">
              {product.title}
            </div>

            <div className="mt-1 truncate font-mono text-[10px] text-zinc-700">
              /{product.slug}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
              Магазин
            </div>

            <div className="mt-2 truncate text-sm font-bold text-white">
              {product.shop?.name ||
                "Без магазину"}
            </div>

            {product.shop?.slug && (
              <div className="mt-1 truncate font-mono text-[10px] text-zinc-700">
                /{product.shop.slug}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-700">
              Категорія
            </div>

            <div className="mt-2 truncate text-sm font-bold text-white">
              {product.category?.name ||
                "Без категорії"}
            </div>

            {product.category?.slug && (
              <div className="mt-1 truncate font-mono text-[10px] text-zinc-700">
                /{product.category.slug}
              </div>
            )}
          </div>
        </div>

        {/* FORM */}
        <ProductForm
          mode="edit"
          productId={product.id}
          initialData={product}
        />
      </div>
    </main>
  );
}