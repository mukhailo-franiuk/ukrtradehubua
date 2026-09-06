
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  ShoppingCart,
  Star,
  Store,
  Truck,
} from "lucide-react";

import ProductReviews from "@/components/reviews/ProductReviews";

type ProductImage = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

type AttributeValue = {
  id: string;
  value: string;
  slug: string;
  colorHex?: string | null;
};

type Attribute = {
  id: string;
  name: string;
  slug: string;
  type: string;
};

type ProductAttributeValue = {
  id: string;
  attribute: Attribute;
  value: AttributeValue;
};

type VariantValue = {
  id: string;
  attribute: Attribute;
  value: AttributeValue;
};

type ProductVariant = {
  id: string;
  title?: string | null;

  price?: string | number | null;
  oldPrice?: string | number | null;

  stock: number;
  reservedStock: number;

  isActive: boolean;

  values?: VariantValue[];

  images?: Array<{
    image: ProductImage;
  }>;
};

type Product = {
  id: string;

  shopId: string;
  categoryId: string;
  brandId?: string | null;

  title: string;
  slug: string;

  description?: string | null;
  shortDescription?: string | null;

  sku?: string | null;

  price: string | number;
  oldPrice?: string | number | null;

  stock: number;
  reservedStock: number;

  status: string;

  rating: string | number;
  reviewsCount: number;

  viewsCount: number;
  favoritesCount: number;
  salesCount: number;

  isFeatured: boolean;
  isNew: boolean;

  weight?: string | number | null;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;

  createdAt?: string;

  shop?: {
    id: string;
    name: string;
    slug: string;
    rating?: string | number;
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

  variants?: ProductVariant[];

  attributes?: ProductAttributeValue[];
};

type ApiResponse = {
  success?: boolean;
  data?: Product | Product[];
  error?: string;
  message?: string;
};

type CartResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPrice(
  value: string | number | null | undefined
) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function getVariantLabel(variant: ProductVariant) {
  if (variant.title) {
    return variant.title;
  }

  const values = variant.values
    ?.map((item) => item.value.value)
    .filter(Boolean);

  if (values && values.length > 0) {
    return values.join(" / ");
  }

  return "Варіант товару";
}

export default function ProductPage({
  params,
}: PageProps) {
  const [slug, setSlug] = useState<string>("");

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  const [selectedVariantId, setSelectedVariantId] =
    useState<string | null>(null);

  const [quantity, setQuantity] =
    useState(1);

  const [addingToCart, setAddingToCart] =
    useState(false);

  const [cartMessage, setCartMessage] =
    useState("");

  const [cartSuccess, setCartSuccess] =
    useState(false);

  // =====================================================
  // GET SLUG
  // =====================================================

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;

      setSlug(resolvedParams.slug);
    }

    resolveParams();
  }, [params]);

  // =====================================================
  // LOAD PRODUCT
  // =====================================================

  useEffect(() => {
    if (!slug) {
      return;
    }

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/products?slug=${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.message ||
              "Не вдалося завантажити товар"
          );
        }

        let loadedProduct: Product | null = null;

        if (
          result.data &&
          !Array.isArray(result.data)
        ) {
          loadedProduct = result.data;
        }

        if (Array.isArray(result.data)) {
          loadedProduct =
            result.data.find(
              (item) => item.slug === slug
            ) ?? null;
        }

        if (!loadedProduct) {
          throw new Error("Товар не знайдено");
        }

        setProduct(loadedProduct);

        const firstActiveVariant =
          loadedProduct.variants?.find(
            (variant) =>
              variant.isActive &&
              variant.stock -
                variant.reservedStock >
                0
          );

        if (firstActiveVariant) {
          setSelectedVariantId(
            firstActiveVariant.id
          );
        } else {
          setSelectedVariantId(null);
        }

        setQuantity(1);
        setSelectedImageIndex(0);
        setCartMessage("");
        setCartSuccess(false);
      } catch (error) {
        console.error(
          "Product page error:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Не вдалося завантажити товар"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  // =====================================================
  // SELECTED VARIANT
  // =====================================================

  const selectedVariant = useMemo(() => {
    if (!product || !selectedVariantId) {
      return null;
    }

    return (
      product.variants?.find(
        (variant) =>
          variant.id === selectedVariantId
      ) ?? null
    );
  }, [
    product,
    selectedVariantId,
  ]);

  // =====================================================
  // PRODUCT PRICE
  // =====================================================

  const currentPrice =
    selectedVariant?.price ??
    product?.price ??
    0;

  const currentOldPrice =
    selectedVariant?.oldPrice ??
    product?.oldPrice ??
    null;

  const availableStock =
    selectedVariant
      ? Math.max(
          0,
          selectedVariant.stock -
            selectedVariant.reservedStock
        )
      : Math.max(
          0,
          (product?.stock ?? 0) -
            (product?.reservedStock ?? 0)
        );

  // =====================================================
  // IMAGES
  // =====================================================

  const images = useMemo(() => {
    if (!product) {
      return [];
    }

    const variantImages =
      selectedVariant?.images
        ?.map((item) => item.image)
        .filter(Boolean) ?? [];

    if (variantImages.length > 0) {
      return variantImages;
    }

    return [...(product.images ?? [])].sort(
      (a, b) =>
        (a.sortOrder ?? 0) -
        (b.sortOrder ?? 0)
    );
  }, [
    product,
    selectedVariant,
  ]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariantId]);

  const selectedImage =
    images[selectedImageIndex] ??
    images[0] ??
    null;

  // =====================================================
  // QUANTITY
  // =====================================================

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }

  function increaseQuantity() {
    if (availableStock <= 0) {
      return;
    }

    setQuantity((current) =>
      Math.min(
        availableStock,
        current + 1
      )
    );
  }

  useEffect(() => {
    if (
      availableStock > 0 &&
      quantity > availableStock
    ) {
      setQuantity(availableStock);
    }

    if (availableStock <= 0) {
      setQuantity(1);
    }
  }, [
    availableStock,
    quantity,
  ]);

  // =====================================================
  // ADD TO CART
  // =====================================================

  async function addToCart() {
    if (!product || addingToCart) {
      return;
    }

    setCartMessage("");
    setCartSuccess(false);

    if (product.status !== "ACTIVE") {
      setCartMessage(
        "Цей товар зараз недоступний для покупки."
      );

      return;
    }

    if (availableStock <= 0) {
      setCartMessage(
        "Товару немає в наявності."
      );

      return;
    }

    if (
      quantity < 1 ||
      quantity > availableStock
    ) {
      setCartMessage(
        `Максимальна доступна кількість: ${availableStock}.`
      );

      return;
    }

    try {
      setAddingToCart(true);

      const response = await fetch(
        "/api/cart",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            productId: product.id,
            variantId:
              selectedVariant?.id ?? null,
            quantity,
          }),
        }
      );

      let result: CartResponse = {};

      try {
        result =
          (await response.json()) as CartResponse;
      } catch {
        result = {};
      }

      if (response.status === 401) {
        setCartMessage(
          "Щоб додати товар у кошик, увійдіть у свій акаунт."
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Не вдалося додати товар у кошик."
        );
      }

      setCartSuccess(true);

      setCartMessage(
        "Товар успішно додано до кошика."
      );
    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );

      setCartSuccess(false);

      setCartMessage(
        error instanceof Error
          ? error.message
          : "Не вдалося додати товар у кошик."
      );
    } finally {
      setAddingToCart(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <Loader2
            size={40}
            className="animate-spin text-yellow-400"
          />

          <p className="text-zinc-400">
            Завантажуємо товар...
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <PackageOpen
            size={52}
            className="mx-auto text-zinc-600"
          />

          <h1 className="mt-5 text-xl font-bold text-white">
            Товар не знайдено
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            {error ||
              "Цей товар більше недоступний"}
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300"
          >
            Перейти до товарів
          </Link>
        </div>
      </main>
    );
  }

  // =====================================================
  // PRODUCT PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">

        {/* ================================================= */}
        {/* BREADCRUMBS */}
        {/* ================================================= */}

        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/"
            className="transition hover:text-yellow-400"
          >
            Головна
          </Link>

          <ChevronRight size={14} />

          <Link
            href="/products"
            className="transition hover:text-yellow-400"
          >
            Товари
          </Link>

          {product.category && (
            <>
              <ChevronRight size={14} />

              <span>
                {product.category.name}
              </span>
            </>
          )}

          <ChevronRight size={14} />

          <span className="max-w-[250px] truncate text-zinc-300">
            {product.title}
          </span>
        </div>

        {/* ================================================= */}
        {/* PRODUCT MAIN */}
        {/* ================================================= */}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">

          {/* ================================================= */}
          {/* GALLERY */}
          {/* ================================================= */}

          <section>
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              {selectedImage ? (
                <img
                  src={selectedImage.url}
                  alt={
                    selectedImage.alt ||
                    product.title
                  }
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <PackageOpen
                    size={80}
                    className="text-zinc-700"
                  />
                </div>
              )}

              <button
                type="button"
                className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-yellow-400 hover:text-black"
                aria-label="Додати в обране"
              >
                <Heart size={21} />
              </button>

              {product.isNew && (
                <span className="absolute left-5 top-5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black">
                  NEW
                </span>
              )}
            </div>

            {/* ================================================= */}
            {/* THUMBNAILS */}
            {/* ================================================= */}

            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map(
                  (image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex(
                          index
                        )
                      }
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-900 transition ${
                        selectedImageIndex ===
                        index
                          ? "border-yellow-400"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <img
                        src={
                          image.thumbnailUrl ||
                          image.url
                        }
                        alt={
                          image.alt ||
                          product.title
                        }
                        className="h-full w-full object-cover"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </section>

          {/* ================================================= */}
          {/* PRODUCT INFO */}
          {/* ================================================= */}

          <section>
            {product.brand && (
              <p className="mb-3 text-sm text-zinc-500">
                Бренд:{" "}
                <span className="text-zinc-300">
                  {product.brand.name}
                </span>
              </p>
            )}

            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              {product.title}
            </h1>

            {/* ================================================= */}
            {/* RATING */}
            {/* ================================================= */}

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                <Star
                  size={19}
                  className="fill-yellow-400 text-yellow-400"
                />

                <span className="font-medium">
                  {Number(
                    product.rating
                  ).toFixed(1)}
                </span>

                <span className="text-sm text-zinc-500">
                  ({product.reviewsCount}{" "}
                  {product.reviewsCount === 1
                    ? "відгук"
                    : product.reviewsCount >= 2 &&
                        product.reviewsCount <= 4
                      ? "відгуки"
                      : "відгуків"}
                  )
                </span>
              </div>

              <span className="text-sm text-zinc-500">
                Код товару:{" "}
                {product.sku ||
                  product.id}
              </span>
            </div>

            {/* ================================================= */}
            {/* PRICE */}
            {/* ================================================= */}

            <div className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-4xl font-bold text-yellow-400">
                  {formatPrice(
                    currentPrice
                  )}{" "}
                  ₴
                </span>

                {currentOldPrice &&
                  Number(
                    currentOldPrice
                  ) >
                    Number(
                      currentPrice
                    ) && (
                    <span className="pb-1 text-lg text-zinc-500 line-through">
                      {formatPrice(
                        currentOldPrice
                      )}{" "}
                      ₴
                    </span>
                  )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    availableStock > 0
                      ? "bg-emerald-400"
                      : "bg-red-500"
                  }`}
                />

                <span
                  className={`text-sm font-medium ${
                    availableStock > 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {availableStock > 0
                    ? `В наявності: ${availableStock}`
                    : "Немає в наявності"}
                </span>
              </div>
            </div>

            {/* ================================================= */}
            {/* SHORT DESCRIPTION */}
            {/* ================================================= */}

            {product.shortDescription && (
              <p className="mt-6 leading-7 text-zinc-400">
                {product.shortDescription}
              </p>
            )}

            {/* ================================================= */}
            {/* VARIANTS */}
            {/* ================================================= */}

            {product.variants &&
              product.variants.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    Варіанти товару
                  </h2>

                  <div className="flex flex-wrap gap-3">
                    {product.variants
                      .filter(
                        (variant) =>
                          variant.isActive
                      )
                      .map(
                        (variant) => {
                          const label =
                            getVariantLabel(
                              variant
                            );

                          const variantStock =
                            Math.max(
                              0,
                              variant.stock -
                                variant.reservedStock
                            );

                          return (
                            <button
                              key={
                                variant.id
                              }
                              type="button"
                              disabled={
                                variantStock <=
                                0
                              }
                              onClick={() => {
                                setSelectedVariantId(
                                  variant.id
                                );
                                setQuantity(
                                  1
                                );
                                setCartMessage(
                                  ""
                                );
                                setCartSuccess(
                                  false
                                );
                              }}
                              className={`rounded-xl border px-4 py-3 text-sm transition ${
                                selectedVariantId ===
                                variant.id
                                  ? "border-yellow-400 bg-yellow-400 text-black"
                                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              {label}
                            </button>
                          );
                        }
                      )}
                  </div>
                </div>
              )}

            {/* ================================================= */}
            {/* QUANTITY + CART */}
            {/* ================================================= */}

            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-zinc-300">
                Кількість
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex w-fit items-center rounded-xl border border-zinc-800 bg-zinc-900">
                  <button
                    type="button"
                    onClick={
                      decreaseQuantity
                    }
                    disabled={
                      availableStock <=
                        0 ||
                      quantity <= 1 ||
                      addingToCart
                    }
                    className="flex h-12 w-12 items-center justify-center transition hover:text-yellow-400 disabled:opacity-40"
                    aria-label="Зменшити кількість"
                  >
                    <Minus size={18} />
                  </button>

                  <span className="flex h-12 min-w-12 items-center justify-center font-semibold">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={
                      increaseQuantity
                    }
                    disabled={
                      availableStock <=
                        quantity ||
                      availableStock <= 0 ||
                      addingToCart
                    }
                    className="flex h-12 w-12 items-center justify-center transition hover:text-yellow-400 disabled:opacity-40"
                    aria-label="Збільшити кількість"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={
                    addingToCart ||
                    availableStock <= 0
                  }
                  onClick={addToCart}
                  className="flex min-h-12 flex-1 items-center justify-center gap-3 rounded-xl bg-yellow-400 px-6 py-3.5 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingToCart ? (
                    <>
                      <Loader2
                        size={20}
                        className="animate-spin"
                      />

                      Додаємо...
                    </>
                  ) : (
                    <>
                      <ShoppingCart
                        size={20}
                      />

                      Додати у кошик
                    </>
                  )}
                </button>
              </div>

              {cartMessage && (
                <div
                  className={`mt-4 rounded-xl border p-4 text-sm ${
                    cartSuccess
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {cartMessage}
                    </span>

                    {cartSuccess && (
                      <Link
                        href="/cart"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black transition hover:bg-yellow-300"
                      >
                        <ShoppingCart
                          size={16}
                        />

                        Перейти в кошик
                      </Link>
                    )}

                    {!cartSuccess &&
                      cartMessage.includes(
                        "увійдіть"
                      ) && (
                        <Link
                          href="/login"
                          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black transition hover:bg-yellow-300"
                        >
                          Увійти
                        </Link>
                      )}
                  </div>
                </div>
              )}

              {availableStock > 0 && (
                <p className="mt-3 text-xs text-zinc-600">
                  Максимальна кількість для
                  замовлення:{" "}
                  {availableStock}
                </p>
              )}
            </div>

            {/* ================================================= */}
            {/* SHOP */}
            {/* ================================================= */}

            {product.shop && (
              <Link
                href={`/shops/${product.shop.slug}`}
                className="mt-8 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-yellow-400"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                    <Store
                      size={22}
                      className="text-yellow-400"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Продавець
                    </p>

                    <p className="mt-1 font-semibold">
                      {product.shop.name}
                    </p>

                    {product.shop.rating !==
                      undefined && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <Star
                          size={12}
                          className="fill-yellow-400 text-yellow-400"
                        />

                        <span>
                          {Number(
                            product.shop.rating
                          ).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight
                  className="text-zinc-500"
                  size={20}
                />
              </Link>
            )}

            {/* ================================================= */}
            {/* DELIVERY */}
            {/* ================================================= */}

            <div className="mt-5 flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <Truck
                size={24}
                className="shrink-0 text-yellow-400"
              />

              <div>
                <p className="font-medium">
                  Доставка по Україні
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Нова Пошта, Укрпошта,
                  Meest, кур&apos;єр або
                  самовивіз — залежно від
                  продавця.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ================================================= */}
        {/* DESCRIPTION */}
        {/* ================================================= */}

        {product.description && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold">
              Опис товару
            </h2>

            <div className="mt-6 whitespace-pre-wrap rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 leading-8 text-zinc-300">
              {product.description}
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* CHARACTERISTICS */}
        {/* ================================================= */}

        {(product.attributes?.length ||
          product.weight ||
          product.length ||
          product.width ||
          product.height) && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold">
              Характеристики
            </h2>

            <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800">
              {product.attributes?.map(
                (item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40 last:border-b-0"
                  >
                    <div className="p-4 text-zinc-500">
                      {
                        item.attribute
                          .name
                      }
                    </div>

                    <div className="p-4 font-medium">
                      {item.value.value}
                    </div>
                  </div>
                )
              )}

              {product.weight && (
                <div className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40">
                  <div className="p-4 text-zinc-500">
                    Вага
                  </div>

                  <div className="p-4 font-medium">
                    {product.weight} кг
                  </div>
                </div>
              )}

              {product.length && (
                <div className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40">
                  <div className="p-4 text-zinc-500">
                    Довжина
                  </div>

                  <div className="p-4 font-medium">
                    {product.length} см
                  </div>
                </div>
              )}

              {product.width && (
                <div className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40">
                  <div className="p-4 text-zinc-500">
                    Ширина
                  </div>

                  <div className="p-4 font-medium">
                    {product.width} см
                  </div>
                </div>
              )}

              {product.height && (
                <div className="grid grid-cols-2 bg-zinc-900/40">
                  <div className="p-4 text-zinc-500">
                    Висота
                  </div>

                  <div className="p-4 font-medium">
                    {product.height} см
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* REVIEWS */}
        {/* ================================================= */}

        <ProductReviews
          productId={product.id}
        />
      </div>
    </main>
  );
}