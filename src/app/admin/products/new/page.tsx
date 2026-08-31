
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

type Brand = {
  id: string;
  name: string;
};

type MarketplaceShop = {
  id: string;
  name: string;
  slug: string;
};

type ImageItem = {
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
};

type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

type FormState = {
  categoryId: string;
  brandId: string;

  title: string;
  slug: string;
  description: string;
  shortDescription: string;

  sku: string;

  price: string;
  oldPrice: string;

  stock: string;
  reservedStock: string;

  status: ProductStatus;

  isFeatured: boolean;
  isNew: boolean;

  weight: string;
  length: string;
  width: string;
  height: string;

  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoCanonical: string;
};

const INITIAL_FORM: FormState = {
  categoryId: "",
  brandId: "",

  title: "",
  slug: "",
  description: "",
  shortDescription: "",

  sku: "",

  price: "",
  oldPrice: "",

  stock: "0",
  reservedStock: "0",

  status: "DRAFT",

  isFeatured: false,
  isNew: false,

  weight: "",
  length: "",
  width: "",
  height: "",

  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  seoCanonical: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const number = Number(trimmed);

  return Number.isFinite(number) ? number : null;
}

export default function NewProductPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [shop, setShop] =
    useState<MarketplaceShop | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [brands, setBrands] =
    useState<Brand[]>([]);

  const [images, setImages] =
    useState<ImageItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // =========================================================
  // LOAD MARKETPLACE SHOP + CATEGORIES + BRANDS
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          marketplaceShopResponse,
          categoriesResponse,
          brandsResponse,
        ] = await Promise.all([
          fetch("/api/admin/marketplace-shop", {
            method: "GET",
            cache: "no-store",
          }),

          fetch("/api/categories", {
            cache: "no-store",
          }),

          fetch("/api/admin/brands", {
            cache: "no-store",
          }),
        ]);

        // =====================================================
        // MARKETPLACE SHOP
        // =====================================================

        if (!marketplaceShopResponse.ok) {
          const text =
            await marketplaceShopResponse.text();

          let data: any = null;

          try {
            data = JSON.parse(text);
          } catch {
            // ignore
          }

          throw new Error(
            data?.message ||
            "Не вдалося завантажити магазин UkrTradeHub"
          );
        }

        const marketplaceShopData =
          await marketplaceShopResponse.json();

        /*
         * Підтримуємо кілька можливих відповідей:
         *
         * {
         *   success: true,
         *   shop: {...}
         * }
         *
         * або
         *
         * {
         *   success: true,
         *   data: {...}
         * }
         */

        const loadedShop =
          marketplaceShopData?.shop ??
          marketplaceShopData?.data ??
          null;

        if (!loadedShop?.id) {
          throw new Error(
            "Магазин UkrTradeHub ще не створений"
          );
        }

        // =====================================================
        // CATEGORIES
        // =====================================================

        if (!categoriesResponse.ok) {
          throw new Error(
            "Не вдалося завантажити категорії"
          );
        }

        const categoriesData =
          await categoriesResponse.json();

        // =====================================================
        // BRANDS
        // =====================================================

        let brandsData: any = {
          brands: [],
        };

        if (brandsResponse.ok) {
          brandsData =
            await brandsResponse.json();
        }

        if (cancelled) {
          return;
        }

        const loadedCategories =
          Array.isArray(categoriesData)
            ? categoriesData
            : categoriesData?.categories ??
            categoriesData?.data ??
            [];

        const loadedBrands =
          Array.isArray(brandsData)
            ? brandsData
            : brandsData?.brands ??
            brandsData?.data ??
            [];

        setShop({
          id: loadedShop.id,
          name:
            loadedShop.name ??
            "UkrTradeHub",
          slug:
            loadedShop.slug ??
            "ukrtradehub",
        });

        setCategories(
          loadedCategories.map(
            (category: any) => ({
              id: category.id,
              name: category.name,
              parentId:
                category.parentId ?? null,
            })
          )
        );

        setBrands(
          loadedBrands.map(
            (brand: any) => ({
              id: brand.id,
              name: brand.name,
            })
          )
        );
      } catch (err) {
        console.error(
          "LOAD NEW PRODUCT DATA ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося завантажити дані"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // FORM
  // =========================================================

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTitleChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const title = event.target.value;

    setForm((current) => ({
      ...current,
      title,
      slug:
        current.slug ||
        slugify(title),
    }));
  }

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error(
            `Файл ${file.name} не є зображенням`
          );
        }

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
          "/api/admin/products/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const text =
          await response.text();

        let data: any = null;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            text ||
            "Сервер повернув некоректну відповідь"
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
            "Не вдалося завантажити зображення"
          );
        }

        const url =
          data?.url ??
          data?.imageUrl ??
          data?.file?.url;

        if (!url) {
          throw new Error(
            "Сервер не повернув URL зображення"
          );
        }

        setImages((current) => {
          const isFirst =
            current.length === 0;

          const image: ImageItem = {
            url,
            thumbnailUrl:
              data?.thumbnailUrl ??
              null,
            alt:
              file.name
                .replace(/\.[^/.]+$/, "")
                .trim() || null,
            width:
              typeof data?.width === "number"
                ? data.width
                : null,
            height:
              typeof data?.height === "number"
                ? data.height
                : null,
            sortOrder:
              current.length,
            isPrimary: isFirst,
          };

          return [...current, image];
        });
      }
    } catch (err) {
      console.error(
        "UPLOAD IMAGE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Помилка завантаження зображення"
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // =========================================================
  // IMAGE ACTIONS
  // =========================================================

  function removeImage(index: number) {
    setImages((current) => {
      const removed =
        current[index];

      const next =
        current.filter(
          (_, imageIndex) =>
            imageIndex !== index
        );

      if (next.length === 0) {
        return [];
      }

      const hadPrimary =
        removed?.isPrimary;

      return next.map(
        (image, imageIndex) => ({
          ...image,
          sortOrder: imageIndex,
          isPrimary:
            hadPrimary
              ? imageIndex === 0
              : image.isPrimary,
        })
      );
    });
  }

  function setPrimaryImage(index: number) {
    setImages((current) =>
      current.map(
        (image, imageIndex) => ({
          ...image,
          isPrimary:
            imageIndex === index,
        })
      )
    );
  }

  function updateImageAlt(
    index: number,
    alt: string
  ) {
    setImages((current) =>
      current.map(
        (image, imageIndex) =>
          imageIndex === index
            ? {
              ...image,
              alt,
            }
            : image
      )
    );
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // =====================================================
      // SHOP
      // =====================================================

      if (!shop?.id) {
        throw new Error(
          "Магазин UkrTradeHub не знайдений"
        );
      }

      // =====================================================
      // REQUIRED FIELDS
      // =====================================================

      if (!form.categoryId) {
        throw new Error(
          "Оберіть категорію"
        );
      }

      if (!form.title.trim()) {
        throw new Error(
          "Введіть назву товару"
        );
      }

      if (!form.slug.trim()) {
        throw new Error(
          "Введіть slug товару"
        );
      }

      const price =
        Number(form.price);

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error(
          "Введіть коректну ціну"
        );
      }

      const stock =
        Number(form.stock);

      if (
        !Number.isFinite(stock) ||
        stock < 0
      ) {
        throw new Error(
          "Введіть коректний залишок"
        );
      }

      const reservedStock =
        Number(form.reservedStock);

      if (
        !Number.isFinite(
          reservedStock
        ) ||
        reservedStock < 0
      ) {
        throw new Error(
          "Введіть коректно зарезервований залишок"
        );
      }

      // =====================================================
      // PAYLOAD
      // =====================================================

      const payload = {
        shopId: shop.id,

        categoryId:
          form.categoryId,

        brandId:
          form.brandId || null,

        title:
          form.title.trim(),

        slug:
          form.slug.trim(),

        description:
          form.description.trim() ||
          null,

        shortDescription:
          form.shortDescription.trim() ||
          null,

        sku:
          form.sku.trim() ||
          null,

        price,

        oldPrice:
          parseNullableNumber(
            form.oldPrice
          ),

        stock,

        reservedStock,

        status:
          form.status,

        isFeatured:
          form.isFeatured,

        isNew:
          form.isNew,

        weight:
          parseNullableNumber(
            form.weight
          ),

        length:
          parseNullableNumber(
            form.length
          ),

        width:
          parseNullableNumber(
            form.width
          ),

        height:
          parseNullableNumber(
            form.height
          ),

        images:
          images.map(
            (image, index) => ({
              url:
                image.url,

              thumbnailUrl:
                image.thumbnailUrl,

              alt:
                image.alt,

              width:
                image.width,

              height:
                image.height,

              sortOrder:
                index,

              isPrimary:
                image.isPrimary,
            })
          ),

        seo: {
          title:
            form.seoTitle.trim() ||
            null,

          description:
            form.seoDescription.trim() ||
            null,

          keywords:
            form.seoKeywords.trim() ||
            null,

          canonical:
            form.seoCanonical.trim() ||
            null,
        },
      };

      // =====================================================
      // CREATE PRODUCT
      // =====================================================

      const response = await fetch(
        "/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify(
            payload
          ),
        }
      );

      const text =
        await response.text();

      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          text ||
          "Сервер повернув некоректну відповідь"
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
          "Не вдалося створити товар"
        );
      }

      setSuccess(
        "Товар успішно створено"
      );

      const productId =
        data?.product?.id ??
        data?.id;

      if (productId) {
        router.push(
          `/admin/products/${productId}`
        );

        router.refresh();

        return;
      }

      router.push(
        "/admin/products"
      );

      router.refresh();
    } catch (err) {
      console.error(
        "CREATE PRODUCT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося створити товар"
      );
    } finally {
      setSaving(false);
    }
  }

  const primaryImage =
    useMemo(
      () =>
        images.find(
          (image) =>
            image.isPrimary
        ) ??
        images[0] ??
        null,
      [images]
    );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070a10] text-white">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Завантаження...
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-8">
          <Link
            href="/admin/products"
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до товарів
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-amber-400">
                <Package className="h-5 w-5" />

                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  Marketplace
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Новий товар
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Створення товару маркетплейсу UkrTradeHub
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/products"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-sm font-bold text-zinc-400 transition hover:border-white/[0.15] hover:text-white"
              >
                Скасувати
              </Link>

              <button
                type="submit"
                form="new-product-form"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Збереження...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Створити товар
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* ALERTS */}
        {/* ================================================= */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-300">
            <X className="mt-0.5 h-5 w-5 shrink-0" />

            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />

            <div>{success}</div>
          </div>
        )}

        {/* ================================================= */}
        {/* MARKETPLACE SHOP */}
        {/* ================================================= */}

        {shop && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                Магазин маркетплейсу
              </div>

              <div className="mt-1 text-lg font-black text-white">
                {shop.name}
              </div>

              <div className="mt-1 font-mono text-xs text-zinc-600">
                {shop.slug}
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs font-bold text-emerald-300 sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Магазин вибрано автоматично
            </div>
          </div>
        )}

        <form
          id="new-product-form"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">

            {/* ================================================= */}
            {/* LEFT */}
            {/* ================================================= */}

            <div className="space-y-6">

              {/* BASIC */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-6 py-5">
                  <h2 className="text-base font-black">
                    Основна інформація
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Основні дані товару
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <Field
                    label="Назва товару"
                    required
                  >
                    <input
                      value={form.title}
                      onChange={
                        handleTitleChange
                      }
                      placeholder="Наприклад: Apple iPhone 17 Pro 256GB"
                      className="input"
                    />
                  </Field>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Slug"
                      required
                    >
                      <input
                        value={form.slug}
                        onChange={(event) =>
                          updateField(
                            "slug",
                            slugify(
                              event.target.value
                            )
                          )
                        }
                        placeholder="apple-iphone-17-pro-256gb"
                        className="input font-mono"
                      />
                    </Field>

                    <Field label="SKU">
                      <input
                        value={form.sku}
                        onChange={(event) =>
                          updateField(
                            "sku",
                            event.target.value
                          )
                        }
                        placeholder="IPH17PRO-256"
                        className="input font-mono"
                      />
                    </Field>
                  </div>

                  <Field label="Короткий опис">
                    <input
                      value={
                        form.shortDescription
                      }
                      onChange={(event) =>
                        updateField(
                          "shortDescription",
                          event.target.value
                        )
                      }
                      placeholder="Короткий опис товару"
                      className="input"
                    />
                  </Field>

                  <Field label="Опис">
                    <textarea
                      value={
                        form.description
                      }
                      onChange={(event) =>
                        updateField(
                          "description",
                          event.target.value
                        )
                      }
                      rows={8}
                      placeholder="Детальний опис товару..."
                      className="input min-h-[180px] resize-y py-3"
                    />
                  </Field>
                </div>
              </section>

              {/* PRICING */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-6 py-5">
                  <h2 className="text-base font-black">
                    Ціна та залишки
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Комерційні параметри товару
                  </p>
                </div>

                <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <Field
                    label="Ціна"
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        updateField(
                          "price",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="input"
                    />
                  </Field>

                  <Field label="Стара ціна">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.oldPrice}
                      onChange={(event) =>
                        updateField(
                          "oldPrice",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="input"
                    />
                  </Field>

                  <Field label="Залишок">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(event) =>
                        updateField(
                          "stock",
                          event.target.value
                        )
                      }
                      className="input"
                    />
                  </Field>

                  <Field label="Зарезервовано">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        form.reservedStock
                      }
                      onChange={(event) =>
                        updateField(
                          "reservedStock",
                          event.target.value
                        )
                      }
                      className="input"
                    />
                  </Field>
                </div>
              </section>

              {/* IMAGES */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
                  <div>
                    <h2 className="text-base font-black">
                      Зображення
                    </h2>

                    <p className="mt-1 text-xs text-zinc-600">
                      Фото товару та головне зображення
                    </p>
                  </div>

                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-black text-black transition hover:bg-amber-300">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}

                    Додати фото

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      onChange={
                        handleImageUpload
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-6">
                  {images.length === 0 ? (
                    <label className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] text-center transition hover:border-amber-400/30 hover:bg-amber-400/[0.02]">
                      <ImagePlus className="mb-4 h-10 w-10 text-zinc-700" />

                      <div className="font-bold text-zinc-400">
                        Додайте зображення товару
                      </div>

                      <div className="mt-2 text-xs text-zinc-700">
                        JPG, PNG, WEBP
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={
                          handleImageUpload
                        }
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {images.map(
                        (image, index) => (
                          <div
                            key={`${image.url}-${index}`}
                            className={`group overflow-hidden rounded-2xl border ${image.isPrimary
                                ? "border-amber-400/40"
                                : "border-white/[0.07]"
                              } bg-[#070a10]`}
                          >
                            <div className="relative aspect-square overflow-hidden bg-black">
                              <img
                                src={image.url}
                                alt={
                                  image.alt ??
                                  form.title
                                }
                                className="h-full w-full object-cover"
                              />

                              {image.isPrimary && (
                                <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1.5 text-[10px] font-black text-black">
                                  <Star className="h-3 w-3 fill-current" />
                                  Головне
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  removeImage(
                                    index
                                  )
                                }
                                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-red-500"
                                aria-label="Видалити зображення"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                              {!image.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPrimaryImage(
                                      index
                                    )
                                  }
                                  className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-2 text-[10px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-amber-400 hover:text-black"
                                >
                                  Зробити головним
                                </button>
                              )}
                            </div>

                            <div className="space-y-3 p-3">
                              <input
                                value={
                                  image.alt ??
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateImageAlt(
                                    index,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Alt зображення"
                                className="input h-9 text-xs"
                              />

                              <div className="flex items-center justify-between text-[10px] text-zinc-700">
                                <span>
                                  #{index + 1}
                                </span>

                                {image.width &&
                                  image.height && (
                                    <span>
                                      {
                                        image.width
                                      }{" "}
                                      ×{" "}
                                      {
                                        image.height
                                      }
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-zinc-700 transition hover:border-amber-400/30 hover:text-amber-400">
                        <Plus className="h-7 w-7" />

                        <span className="mt-2 text-xs font-bold">
                          Додати ще
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={
                            handleImageUpload
                          }
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </section>

              {/* DIMENSIONS */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-6 py-5">
                  <h2 className="text-base font-black">
                    Габарити
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Фізичні параметри товару
                  </p>
                </div>

                <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Вага">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.weight}
                      onChange={(event) =>
                        updateField(
                          "weight",
                          event.target.value
                        )
                      }
                      placeholder="кг"
                      className="input"
                    />
                  </Field>

                  <Field label="Довжина">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.length}
                      onChange={(event) =>
                        updateField(
                          "length",
                          event.target.value
                        )
                      }
                      placeholder="см"
                      className="input"
                    />
                  </Field>

                  <Field label="Ширина">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.width}
                      onChange={(event) =>
                        updateField(
                          "width",
                          event.target.value
                        )
                      }
                      placeholder="см"
                      className="input"
                    />
                  </Field>

                  <Field label="Висота">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.height}
                      onChange={(event) =>
                        updateField(
                          "height",
                          event.target.value
                        )
                      }
                      placeholder="см"
                      className="input"
                    />
                  </Field>
                </div>
              </section>

              {/* SEO */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-6 py-5">
                  <h2 className="text-base font-black">
                    SEO
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Пошукова оптимізація товару
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <Field label="SEO Title">
                    <input
                      value={
                        form.seoTitle
                      }
                      onChange={(event) =>
                        updateField(
                          "seoTitle",
                          event.target.value
                        )
                      }
                      className="input"
                    />
                  </Field>

                  <Field label="SEO Description">
                    <textarea
                      value={
                        form.seoDescription
                      }
                      onChange={(event) =>
                        updateField(
                          "seoDescription",
                          event.target.value
                        )
                      }
                      rows={4}
                      className="input resize-y py-3"
                    />
                  </Field>

                  <Field label="Keywords">
                    <input
                      value={
                        form.seoKeywords
                      }
                      onChange={(event) =>
                        updateField(
                          "seoKeywords",
                          event.target.value
                        )
                      }
                      placeholder="iphone, apple, смартфон"
                      className="input"
                    />
                  </Field>

                  <Field label="Canonical">
                    <input
                      value={
                        form.seoCanonical
                      }
                      onChange={(event) =>
                        updateField(
                          "seoCanonical",
                          event.target.value
                        )
                      }
                      placeholder="https://ukrtradehub.com/product/..."
                      className="input font-mono"
                    />
                  </Field>
                </div>
              </section>
            </div>

            {/* ================================================= */}
            {/* RIGHT */}
            {/* ================================================= */}

            <aside className="space-y-6">

              {/* ORGANIZATION */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Організація
                  </h2>
                </div>

                <div className="space-y-5 p-5">

                  {/* SHOP — AUTOMATIC */}

                  {shop && (
                    <div>
                      <div className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-600">
                        Магазин
                      </div>

                      <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black">
                            <Package className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-white">
                              {shop.name}
                            </div>

                            <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-600">
                              {shop.slug}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-[10px] font-bold text-emerald-400">
                          ✓ Магазин маркетплейсу
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CATEGORY */}

                  <Field
                    label="Категорія"
                    required
                  >
                    <select
                      value={
                        form.categoryId
                      }
                      onChange={(event) =>
                        updateField(
                          "categoryId",
                          event.target.value
                        )
                      }
                      className="input"
                    >
                      <option value="">
                        Оберіть категорію
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={
                              category.id
                            }
                            value={
                              category.id
                            }
                          >
                            {category.parentId
                              ? "↳ "
                              : ""}
                            {
                              category.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  {/* BRAND */}

                  <Field label="Бренд">
                    <select
                      value={
                        form.brandId
                      }
                      onChange={(event) =>
                        updateField(
                          "brandId",
                          event.target.value
                        )
                      }
                      className="input"
                    >
                      <option value="">
                        Без бренду
                      </option>

                      {brands.map(
                        (brand) => (
                          <option
                            key={brand.id}
                            value={brand.id}
                          >
                            {brand.name}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  {/* STATUS */}

                  <Field label="Статус">
                    <select
                      value={
                        form.status
                      }
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target
                            .value as ProductStatus
                        )
                      }
                      className="input"
                    >
                      <option value="DRAFT">
                        Чернетка
                      </option>

                      <option value="ACTIVE">
                        Активний
                      </option>

                      <option value="INACTIVE">
                        Неактивний
                      </option>

                      <option value="ARCHIVED">
                        Архів
                      </option>
                    </select>
                  </Field>
                </div>
              </section>

              {/* FLAGS */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
                <h2 className="mb-4 text-sm font-black">
                  Додаткові параметри
                </h2>

                <div className="space-y-3">
                  <Toggle
                    label="Рекомендований товар"
                    description="Показувати серед рекомендованих"
                    checked={
                      form.isFeatured
                    }
                    onChange={(value) =>
                      updateField(
                        "isFeatured",
                        value
                      )
                    }
                  />

                  <Toggle
                    label="Новинка"
                    description="Позначити товар як новий"
                    checked={
                      form.isNew
                    }
                    onChange={(value) =>
                      updateField(
                        "isNew",
                        value
                      )
                    }
                  />
                </div>
              </section>

              {/* PREVIEW */}

              <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Попередній перегляд
                  </h2>
                </div>

                <div>
                  <div className="aspect-square bg-[#070a10]">
                    {primaryImage ? (
                      <img
                        src={
                          primaryImage.url
                        }
                        alt={
                          primaryImage.alt ??
                          form.title
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-800">
                        <Package className="h-16 w-16" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="text-lg font-black text-white">
                      {form.title ||
                        "Назва товару"}
                    </div>

                    <div className="mt-2 text-sm text-zinc-500">
                      {form.shortDescription ||
                        "Короткий опис товару"}
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-black text-amber-400">
                          {form.price
                            ? `${Number(
                              form.price
                            ).toLocaleString(
                              "uk-UA"
                            )} грн`
                            : "0 грн"}
                        </div>

                        {form.oldPrice && (
                          <div className="text-xs text-zinc-700 line-through">
                            {Number(
                              form.oldPrice
                            ).toLocaleString(
                              "uk-UA"
                            )}{" "}
                            грн
                          </div>
                        )}
                      </div>

                      {form.isNew && (
                        <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                          НОВИНКА
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* SAVE */}

              <button
                type="submit"
                form="new-product-form"
                disabled={
                  saving ||
                  !shop
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Створення...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Створити товар
                  </>
                )}
              </button>
            </aside>
          </div>
        </form>
      </div>
    </main>
  );
}

// =========================================================
// FIELD
// =========================================================

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-600">
        {label}

        {required && (
          <span className="ml-1 text-amber-400">
            *
          </span>
        )}
      </div>

      {children}
    </label>
  );
}

// =========================================================
// TOGGLE
// =========================================================

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 text-left transition hover:bg-white/[0.03]"
    >
      <div>
        <div className="text-sm font-bold text-zinc-300">
          {label}
        </div>

        <div className="mt-1 text-[11px] text-zinc-700">
          {description}
        </div>
      </div>

      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked
            ? "bg-amber-400"
            : "bg-zinc-800"
          }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full transition ${checked
              ? "left-6 bg-black"
              : "left-1 bg-zinc-500"
            }`}
        />
      </div>
    </button>
  );
}