"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingCart, Star } from "lucide-react";

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  rating: number;
  reviewsCount: number;
  isNew: boolean;
  images: ProductImage[];
  shop: {
    id: string;
    name: string;
    slug: string;
  };
};

type ProductsResponse = {
  success: boolean;
  data: Product[];
};

export default function NewProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        const response = await fetch(
          "/api/products?limit=8&isNew=true&sort=newest",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Не вдалося отримати новинки");
        }

        const data: ProductsResponse = await response.json();

        if (mounted) {
          setProducts(data.success ? data.data : []);
        }
      } catch (error) {
        console.error("NewProducts error:", error);

        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="h-7 w-32 animate-pulse rounded-lg bg-white/10" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-white/5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <div className="aspect-square animate-pulse bg-white/5" />

              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-white/10" />
                <div className="h-9 w-full animate-pulse rounded-xl bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">🆕</span>

            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Новинки
            </h2>
          </div>

          <p className="text-sm text-gray-400">
            Найсвіжіші товари на UkrTradeHub
          </p>
        </div>

        <Link
          href="/products?sort=newest"
          className="group hidden shrink-0 items-center gap-2 text-sm font-semibold text-amber-400 transition hover:text-amber-300 sm:flex"
        >
          Дивитися всі
          <ArrowRight
            size={17}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>

      {/* PRODUCTS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => {
          const primaryImage =
            product.images.find((image) => image.isPrimary) ||
            product.images[0];

          const imageUrl =
            primaryImage?.thumbnailUrl ||
            primaryImage?.url ||
            null;

          const discount =
            product.oldPrice && product.oldPrice > product.price
              ? Math.round(
                  ((product.oldPrice - product.price) /
                    product.oldPrice) *
                    100
                )
              : null;

          return (
            <article
              key={product.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111722] transition duration-300 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-xl hover:shadow-black/20"
            >
              {/* IMAGE */}
              <Link
                href={`/products/${product.slug}`}
                className="relative block aspect-square overflow-hidden bg-[#0d131d]"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={primaryImage?.alt || product.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                    Немає фото
                  </div>
                )}

                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  {product.isNew && (
                    <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-black">
                      NEW
                    </span>
                  )}

                  {discount && (
                    <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      -{discount}%
                    </span>
                  )}
                </div>
              </Link>

              {/* CONTENT */}
              <div className="p-3 sm:p-4">
                <Link
                  href={`/products/${product.slug}`}
                  className="block"
                >
                  <h3 className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-white transition hover:text-amber-400 sm:text-base">
                    {product.title}
                  </h3>
                </Link>

                {/* SHOP */}
                <Link
                  href={`/shops/${product.shop.slug}`}
                  className="mt-2 block truncate text-xs text-gray-500 transition hover:text-amber-400"
                >
                  {product.shop.name}
                </Link>

                {/* RATING */}
                <div className="mt-2 flex items-center gap-1">
                  <Star
                    size={13}
                    className="fill-amber-400 text-amber-400"
                  />

                  <span className="text-xs font-medium text-gray-300">
                    {Number(product.rating || 0).toFixed(1)}
                  </span>

                  {product.reviewsCount > 0 && (
                    <span className="text-xs text-gray-600">
                      ({product.reviewsCount})
                    </span>
                  )}
                </div>

                {/* PRICE */}
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-lg font-bold text-white sm:text-xl">
                    {Number(product.price).toLocaleString("uk-UA")} ₴
                  </span>

                  {product.oldPrice &&
                    product.oldPrice > product.price && (
                      <span className="pb-0.5 text-xs text-gray-500 line-through sm:text-sm">
                        {Number(product.oldPrice).toLocaleString(
                          "uk-UA"
                        )}{" "}
                        ₴
                      </span>
                    )}
                </div>

                {/* CART */}
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-amber-400 hover:text-black"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("ukrtradehub:add-to-cart", {
                        detail: {
                          productId: product.id,
                          quantity: 1,
                        },
                      })
                    );
                  }}
                >
                  <ShoppingCart size={16} />
                  <span>До кошика</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* MOBILE LINK */}
      <div className="mt-6 sm:hidden">
        <Link
          href="/products?sort=newest"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-amber-400/30 hover:text-amber-400"
        >
          Дивитися всі новинки
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}