
"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export type ProductImage = {
  id?: string;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type ProductFormInitialData = {
  id?: string;

  shopId?: string | null;
  categoryId?: string | null;
  brandId?: string | null;

  title?: string | null;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  sku?: string | null;

  price?: number | string | null;
  oldPrice?: number | string | null;

  stock?: number | string | null;
  reservedStock?: number | string | null;

  status?:
    | "DRAFT"
    | "ACTIVE"
    | "INACTIVE"
    | "OUT_OF_STOCK"
    | "ARCHIVED"
    | null;

  isFeatured?: boolean;
  isNew?: boolean;

  weight?: number | string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;

  images?: ProductImage[];

  seo?: {
    id?: string;
    title?: string | null;
    description?: string | null;
    keywords?: string | null;
    canonical?: string | null;
  } | null;
};

type Option = {
  id: string;
  name: string;
  slug?: string;
};

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialData?: ProductFormInitialData;
};

type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "ARCHIVED";

type FormState = {
  shopId: string;
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

const EMPTY_FORM: FormState = {
  shopId: "",
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

const STATUS_OPTIONS: {
  value: ProductStatus;
  label: string;
}[] = [
  {
    value: "DRAFT",
    label: "Чернетка",
  },
  {
    value: "ACTIVE",
    label: "Активний",
  },
  {
    value: "INACTIVE",
    label: "Неактивний",
  },
  {
    value: "OUT_OF_STOCK",
    label: "Немає в наявності",
  },
  {
    value: "ARCHIVED",
    label: "Архівований",
  },
];

function nullableString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function numberString(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return String(value);
}

function slugify(value: string): string {
  const ukrainianMap: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    є: "ye",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "yi",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ю: "yu",
    я: "ya",
    "'": "",
    "’": "",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => ukrainianMap[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createInitialForm(
  initialData?: ProductFormInitialData
): FormState {
  if (!initialData) {
    return { ...EMPTY_FORM };
  }

  return {
    shopId: nullableString(initialData.shopId),
    categoryId: nullableString(
      initialData.categoryId
    ),
    brandId: nullableString(initialData.brandId),

    title: nullableString(initialData.title),
    slug: nullableString(initialData.slug),

    description: nullableString(
      initialData.description
    ),

    shortDescription: nullableString(
      initialData.shortDescription
    ),

    sku: nullableString(initialData.sku),

    price: numberString(initialData.price),
    oldPrice: numberString(initialData.oldPrice),

    stock:
      numberString(initialData.stock) || "0",

    reservedStock:
      numberString(initialData.reservedStock) ||
      "0",

    status:
      initialData.status || "DRAFT",

    isFeatured:
      Boolean(initialData.isFeatured),

    isNew: Boolean(initialData.isNew),

    weight: numberString(initialData.weight),
    length: numberString(initialData.length),
    width: numberString(initialData.width),
    height: numberString(initialData.height),

    seoTitle: nullableString(
      initialData.seo?.title
    ),

    seoDescription: nullableString(
      initialData.seo?.description
    ),

    seoKeywords: nullableString(
      initialData.seo?.keywords
    ),

    seoCanonical: nullableString(
      initialData.seo?.canonical
    ),
  };
}

function normalizeImages(
  images?: ProductImage[]
): ProductImage[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => ({
      ...image,
      url: image.url,
      thumbnailUrl:
        image.thumbnailUrl ?? null,
      alt: image.alt ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
      sortOrder:
        typeof image.sortOrder === "number"
          ? image.sortOrder
          : index,
      isPrimary: Boolean(image.isPrimary),
    }))
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) -
        (b.sortOrder ?? 0)
    )
    .map((image, index) => ({
      ...image,
      sortOrder: index,
    }));
}

export default function ProductForm({
  mode,
  productId,
  initialData,
}: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialForm(initialData)
  );

  const [shops, setShops] =
    useState<Option[]>([]);

  const [categories, setCategories] =
    useState<Option[]>([]);

  const [brands, setBrands] =
    useState<Option[]>([]);

  const [images, setImages] =
    useState<ProductImage[]>(() =>
      normalizeImages(initialData?.images)
    );

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [slugManuallyChanged, setSlugManuallyChanged] =
    useState(Boolean(initialData?.slug));

  const [draggedIndex, setDraggedIndex] =
    useState<number | null>(null);

  /*
   * Якщо initialData приходить після першого
   * render — синхронізуємо форму.
   */
  useEffect(() => {
    if (!initialData) {
      if (mode === "create") {
        setForm({ ...EMPTY_FORM });
        setImages([]);
        setSlugManuallyChanged(false);
      }

      return;
    }

    setForm(createInitialForm(initialData));
    setImages(normalizeImages(initialData.images));
    setSlugManuallyChanged(
      Boolean(initialData.slug)
    );
  }, [initialData, mode]);

  /*
   * Завантаження магазинів, категорій та брендів.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setError("");

        const response = await fetch(
          "/api/admin/products",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        let data: {
          success?: boolean;
          message?: string;
          shops?: Option[];
          categories?: Option[];
          brands?: Option[];
        };

        try {
          data = await response.json();
        } catch {
          throw new Error(
            `Сервер повернув некоректну відповідь (${response.status})`
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(
              "Сесія адміністратора недійсна або доступ заборонено"
            );
          }

          throw new Error(
            data.message ||
              "Не вдалося завантажити дані"
          );
        }

        if (cancelled) {
          return;
        }

        setShops(
          Array.isArray(data.shops)
            ? data.shops
            : []
        );

        setCategories(
          Array.isArray(data.categories)
            ? data.categories
            : []
        );

        setBrands(
          Array.isArray(data.brands)
            ? data.brands
            : []
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося завантажити дані"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Автоматичний slug тільки поки
   * користувач не редагував його вручну.
   */
  useEffect(() => {
    if (
      !slugManuallyChanged &&
      form.title.trim()
    ) {
      const generatedSlug = slugify(
        form.title
      );

      setForm((current) => {
        if (
          current.slug === generatedSlug
        ) {
          return current;
        }

        return {
          ...current,
          slug: generatedSlug,
        };
      });
    }
  }, [
    form.title,
    slugManuallyChanged,
  ]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleSlugChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setSlugManuallyChanged(true);

    updateField(
      "slug",
      event.target.value
    );
  }

  async function uploadImages(
    files: FileList | File[]
  ) {
    const fileArray = Array.from(files);

    if (fileArray.length === 0) {
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      for (const file of fileArray) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ].includes(file.type)
        ) {
          throw new Error(
            `Непідтримуваний формат: ${file.name}`
          );
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(
            `Файл ${file.name} перевищує 5 MB`
          );
        }

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
          "/api/admin/products/upload",
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        let data: {
          success?: boolean;
          message?: string;
          imageUrl?: string;
          thumbnailUrl?: string | null;
          width?: number | null;
          height?: number | null;
        };

        try {
          data = await response.json();
        } catch {
          throw new Error(
            `Некоректна відповідь сервера при завантаженні ${file.name}`
          );
        }

        if (
          !response.ok ||
          !data.success ||
          !data.imageUrl
        ) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(
              "Сесія адміністратора недійсна або доступ заборонено"
            );
          }

          throw new Error(
            data.message ||
              `Не вдалося завантажити ${file.name}`
          );
        }

        setImages((current) => {
          const newImage: ProductImage = {
            url: data.imageUrl!,
            thumbnailUrl:
              data.thumbnailUrl ?? null,
            width: data.width ?? null,
            height: data.height ?? null,
            alt: file.name
              .replace(/\.[^/.]+$/, "")
              .trim(),
            sortOrder: current.length,
            isPrimary:
              current.length === 0,
          };

          return [...current, newImage];
        });
      }

      setSuccess(
        "Зображення успішно завантажено"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Помилка завантаження зображення"
      );
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (event.target.files) {
      void uploadImages(event.target.files);
    }

    event.target.value = "";
  }

  function removeImage(index: number) {
    setImages((current) => {
      const next = current.filter(
        (_, imageIndex) =>
          imageIndex !== index
      );

      if (
        next.length > 0 &&
        !next.some(
          (image) => image.isPrimary
        )
      ) {
        next[0] = {
          ...next[0],
          isPrimary: true,
        };
      }

      return next.map(
        (image, imageIndex) => ({
          ...image,
          sortOrder: imageIndex,
        })
      );
    });

    setSuccess("");
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

    setSuccess("");
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

    setSuccess("");
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>,
    targetIndex: number
  ) {
    event.preventDefault();

    if (
      draggedIndex === null ||
      draggedIndex === targetIndex
    ) {
      return;
    }

    setImages((current) => {
      const next = [...current];

      const [moved] = next.splice(
        draggedIndex,
        1
      );

      if (!moved) {
        return current;
      }

      next.splice(
        targetIndex,
        0,
        moved
      );

      return next.map(
        (image, index) => ({
          ...image,
          sortOrder: index,
        })
      );
    });

    setDraggedIndex(targetIndex);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function validate(): string {
    if (!form.shopId) {
      return "Оберіть магазин";
    }

    if (!form.categoryId) {
      return "Оберіть категорію";
    }

    if (!form.title.trim()) {
      return "Введіть назву товару";
    }

    if (!form.slug.trim()) {
      return "Введіть slug товару";
    }

    if (!form.price.trim()) {
      return "Введіть ціну";
    }

    const price = Number(form.price);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return "Некоректна ціна";
    }

    if (
      form.oldPrice.trim() &&
      (!Number.isFinite(
        Number(form.oldPrice)
      ) ||
        Number(form.oldPrice) < 0)
    ) {
      return "Некоректна стара ціна";
    }

    const stock = Number(form.stock);

    if (
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      return "Некоректний залишок";
    }

    const reservedStock = Number(
      form.reservedStock
    );

    if (
      !Number.isFinite(reservedStock) ||
      reservedStock < 0
    ) {
      return "Некоректна кількість зарезервованого товару";
    }

    const numericFields = [
      {
        label: "ваги",
        value: form.weight,
      },
      {
        label: "довжини",
        value: form.length,
      },
      {
        label: "ширини",
        value: form.width,
      },
      {
        label: "висоти",
        value: form.height,
      },
    ];

    for (const field of numericFields) {
      if (!field.value.trim()) {
        continue;
      }

      const value = Number(field.value);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return `Некоректне значення ${field.label}`;
      }
    }

    if (
      reservedStock > stock
    ) {
      return "Зарезервована кількість не може перевищувати залишок";
    }

    return "";
  }

  function buildPayload() {
    const normalizedImages =
      images.map(
        (image, index) => ({
          url: image.url,

          thumbnailUrl:
            image.thumbnailUrl ?? null,

          alt:
            image.alt?.trim() || null,

          width:
            image.width ?? null,

          height:
            image.height ?? null,

          sortOrder: index,

          isPrimary:
            image.isPrimary === true ||
            (index === 0 &&
              !images.some(
                (item) =>
                  item.isPrimary === true
              )),
        })
      );

    return {
      shopId: form.shopId,
      categoryId: form.categoryId,
      brandId: form.brandId || null,

      title: form.title.trim(),
      slug: form.slug.trim(),

      description:
        form.description.trim() || null,

      shortDescription:
        form.shortDescription.trim() ||
        null,

      sku:
        form.sku.trim() || null,

      price: Number(form.price),

      oldPrice:
        form.oldPrice.trim()
          ? Number(form.oldPrice)
          : null,

      stock: Math.max(
        0,
        Math.floor(
          Number(form.stock) || 0
        )
      ),

      reservedStock: Math.max(
        0,
        Math.floor(
          Number(
            form.reservedStock
          ) || 0
        )
      ),

      status: form.status,

      isFeatured: form.isFeatured,
      isNew: form.isNew,

      weight:
        form.weight.trim()
          ? Number(form.weight)
          : null,

      length:
        form.length.trim()
          ? Number(form.length)
          : null,

      width:
        form.width.trim()
          ? Number(form.width)
          : null,

      height:
        form.height.trim()
          ? Number(form.height)
          : null,

      seo: {
        title:
          form.seoTitle.trim() || null,

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

      images: normalizedImages,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      mode === "edit" &&
      !productId
    ) {
      setError(
        "ID товару не вказано"
      );
      return;
    }

    setSaving(true);

    try {
      const endpoint =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${encodeURIComponent(
              productId!
            )}`;

      const method =
        mode === "create"
          ? "POST"
          : "PATCH";

      const response = await fetch(
        endpoint,
        {
          method,
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify(
            buildPayload()
          ),
        }
      );

      let data: {
        success?: boolean;
        message?: string;
        error?: string;
        product?: {
          id?: string;
        };
      };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Сервер повернув некоректну відповідь (${response.status})`
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Сесія адміністратора недійсна або доступ заборонено"
          );
        }

        throw new Error(
          data.message ||
            data.error ||
            "Не вдалося зберегти товар"
        );
      }

      if (mode === "create") {
        const createdId =
          data.product?.id;

        if (createdId) {
          window.location.href =
            `/admin/products/${createdId}`;

          return;
        }

        setSuccess(
          "Товар успішно створено"
        );

        setForm({ ...EMPTY_FORM });
        setImages([]);
        setSlugManuallyChanged(false);

        return;
      }

      setSuccess(
        "Товар успішно оновлено"
      );
    } catch (err) {
      console.error(
        "ProductForm submit error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося зберегти товар"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      mode !== "edit" ||
      !productId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Ви впевнені, що хочете видалити цей товар? Цю дію неможливо скасувати."
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(
          productId
        )}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      let data: {
        success?: boolean;
        message?: string;
        error?: string;
      };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Сервер повернув некоректну відповідь (${response.status})`
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Сесія адміністратора недійсна або доступ заборонено"
          );
        }

        throw new Error(
          data.message ||
            data.error ||
            "Не вдалося видалити товар"
        );
      }

      window.location.href =
        "/admin/products";
    } catch (err) {
      console.error(
        "ProductForm delete error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося видалити товар"
      );
    } finally {
      setDeleting(false);
    }
  }

  const imageCountLabel = useMemo(() => {
    const count = images.length;

    if (count === 0) {
      return "Немає зображень";
    }

    if (count === 1) {
      return "1 зображення";
    }

    if (
      count >= 2 &&
      count <= 4
    ) {
      return `${count} зображення`;
    }

    return `${count} зображень`;
  }, [images.length]);

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-full bg-[#070a10] text-white"
    >
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin/products"
              className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-zinc-600 transition hover:text-amber-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад до товарів
            </Link>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {mode === "create"
                ? "Новий товар"
                : "Редагування товару"}
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {mode === "create"
                ? "Створення нового товару маркетплейсу"
                : "Редагування даних товару"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={
                  deleting || saving
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-5 text-sm font-black text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                Видалити
              </button>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                deleting ||
                loadingOptions ||
                uploading
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-black text-black shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {mode === "create"
                ? "Створити товар"
                : "Зберегти зміни"}
            </button>
          </div>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="leading-6">
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="leading-6">
              {success}
            </div>
          </div>
        )}

        {/* OPTIONS LOADING */}

        {loadingOptions ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />

              Завантаження даних...
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* LEFT */}

            <div className="space-y-6">
              {/* BASIC */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Основна інформація
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Основні дані товару
                  </p>
                </div>

                <div className="grid gap-5 p-5">
                  <Field
                    label="Назва товару"
                    required
                  >
                    <input
                      value={form.title}
                      onChange={(event) =>
                        updateField(
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="Наприклад: Apple iPhone 16 Pro 256GB"
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Slug"
                      required
                    >
                      <input
                        value={form.slug}
                        onChange={
                          handleSlugChange
                        }
                        placeholder="apple-iphone-16-pro"
                        className={inputClass}
                      />

                      <p className="mt-2 text-[11px] text-zinc-700">
                        URL: /product/
                        {form.slug ||
                          "slug"}
                      </p>
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
                        placeholder="IPHONE-16-PRO-256"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Короткий опис">
                    <textarea
                      value={
                        form.shortDescription
                      }
                      onChange={(event) =>
                        updateField(
                          "shortDescription",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Короткий опис товару..."
                      className={textareaClass}
                    />
                  </Field>

                  <Field label="Опис">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateField(
                          "description",
                          event.target.value
                        )
                      }
                      rows={9}
                      placeholder="Повний опис товару..."
                      className={textareaClass}
                    />
                  </Field>
                </div>
              </section>

              {/* RELATIONS */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Магазин, категорія та бренд
                  </h2>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-3">
                  <Field
                    label="Магазин"
                    required
                  >
                    <select
                      value={form.shopId}
                      onChange={(event) =>
                        updateField(
                          "shopId",
                          event.target.value
                        )
                      }
                      className={selectClass}
                    >
                      <option value="">
                        Оберіть магазин
                      </option>

                      {shops.map((shop) => (
                        <option
                          key={shop.id}
                          value={shop.id}
                        >
                          {shop.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Категорія"
                    required
                  >
                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        updateField(
                          "categoryId",
                          event.target.value
                        )
                      }
                      className={selectClass}
                    >
                      <option value="">
                        Оберіть категорію
                      </option>

                      {categories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Бренд">
                    <select
                      value={form.brandId}
                      onChange={(event) =>
                        updateField(
                          "brandId",
                          event.target.value
                        )
                      }
                      className={selectClass}
                    >
                      <option value="">
                        Без бренду
                      </option>

                      {brands.map((brand) => (
                        <option
                          key={brand.id}
                          value={brand.id}
                        >
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              {/* PRICE */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Ціна та залишок
                  </h2>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="Ціна, ₴"
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
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Стара ціна, ₴">
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
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              {/* DIMENSIONS */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Габарити
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Значення можна залишити порожніми
                  </p>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Вага">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.weight}
                      onChange={(event) =>
                        updateField(
                          "weight",
                          event.target.value
                        )
                      }
                      placeholder="кг"
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              {/* SEO */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    SEO
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    Пошукова оптимізація сторінки товару
                  </p>
                </div>

                <div className="grid gap-5 p-5">
                  <Field label="SEO Title">
                    <input
                      value={form.seoTitle}
                      onChange={(event) =>
                        updateField(
                          "seoTitle",
                          event.target.value
                        )
                      }
                      placeholder="SEO заголовок"
                      className={inputClass}
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
                      placeholder="SEO опис..."
                      className={textareaClass}
                    />
                  </Field>

                  <div className="grid gap-5 md:grid-cols-2">
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
                        placeholder="iphone, apple, smartphone"
                        className={inputClass}
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
                        placeholder="https://ukrtradehub.com/..."
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT */}

            <aside className="space-y-6">
              {/* STATUS */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Статус
                  </h2>
                </div>

                <div className="space-y-4 p-5">
                  <Field label="Статус">
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target
                            .value as ProductStatus
                        )
                      }
                      className={selectClass}
                    >
                      {STATUS_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-[#070a10] p-4">
                    <div>
                      <div className="text-sm font-bold">
                        Рекомендований
                      </div>

                      <div className="mt-1 text-xs text-zinc-700">
                        Показувати як TOP
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        form.isFeatured
                      }
                      onChange={(event) =>
                        updateField(
                          "isFeatured",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-amber-400"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-[#070a10] p-4">
                    <div>
                      <div className="text-sm font-bold">
                        Новинка
                      </div>

                      <div className="mt-1 text-xs text-zinc-700">
                        Позначати як NEW
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.isNew}
                      onChange={(event) =>
                        updateField(
                          "isNew",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-amber-400"
                    />
                  </label>
                </div>
              </section>

              {/* IMAGES */}

              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <div>
                    <h2 className="text-sm font-black">
                      Зображення
                    </h2>

                    <p className="mt-1 text-xs text-zinc-600">
                      {imageCountLabel}
                    </p>
                  </div>

                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-3 text-xs font-black text-black transition hover:bg-amber-300">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}

                    Додати

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      onChange={
                        handleFileChange
                      }
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-5">
                  {images.length === 0 ? (
                    <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-[#070a10] text-center transition hover:border-amber-400/30 hover:bg-amber-400/[0.02]">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-700">
                        <ImageIcon className="h-7 w-7" />
                      </div>

                      <div className="text-sm font-bold text-zinc-400">
                        Завантажте зображення
                      </div>

                      <div className="mt-2 max-w-[220px] text-xs leading-5 text-zinc-700">
                        JPG, PNG, WEBP або AVIF
                        <br />
                        до 5 MB кожне
                      </div>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        multiple
                        onChange={
                          handleFileChange
                        }
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      {images.map(
                        (
                          image,
                          index
                        ) => (
                          <div
                            key={
                              image.id ||
                              `${image.url}-${index}`
                            }
                            draggable
                            onDragStart={() =>
                              handleDragStart(
                                index
                              )
                            }
                            onDragOver={(
                              event
                            ) =>
                              handleDragOver(
                                event,
                                index
                              )
                            }
                            onDragEnd={
                              handleDragEnd
                            }
                            className={`rounded-xl border p-2 transition ${
                              draggedIndex ===
                              index
                                ? "border-amber-400/40 bg-amber-400/5"
                                : "border-white/[0.07] bg-[#070a10]"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="flex w-6 shrink-0 items-center justify-center text-zinc-700">
                                <GripVertical className="h-4 w-4" />
                              </div>

                              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-black">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    image.thumbnailUrl ||
                                    image.url
                                  }
                                  alt={
                                    image.alt ||
                                    ""
                                  }
                                  className="h-full w-full object-cover"
                                />

                                {image.isPrimary && (
                                  <div className="absolute left-1.5 top-1.5 rounded-md bg-amber-400 px-1.5 py-1 text-[9px] font-black text-black">
                                    MAIN
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div className="truncate text-[10px] text-zinc-700">
                                    {image.url}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeImage(
                                        index
                                      )
                                    }
                                    disabled={
                                      saving ||
                                      deleting
                                    }
                                    className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition hover:bg-red-400/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Видалити"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>

                                <input
                                  value={
                                    image.alt ||
                                    ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateImageAlt(
                                      index,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Alt текст"
                                  disabled={
                                    saving ||
                                    deleting
                                  }
                                  className="h-9 w-full rounded-lg border border-white/[0.07] bg-[#0b0f16] px-3 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-amber-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                                />

                                {!image.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPrimaryImage(
                                        index
                                      )
                                    }
                                    disabled={
                                      saving ||
                                      deleting
                                    }
                                    className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 transition hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Star className="h-3 w-3" />
                                    Зробити головним
                                  </button>
                                )}

                                {image.isPrimary && (
                                  <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                                    <Check className="h-3 w-3" />
                                    Головне зображення
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* SAVE */}

              <section className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.025] p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                    <Save className="h-4 w-4" />
                  </div>

                  <div>
                    <div className="text-sm font-black">
                      Готово до збереження
                    </div>

                    <div className="mt-1 text-xs leading-5 text-zinc-600">
                      Перевірте дані товару перед
                      збереженням.
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    deleting ||
                    loadingOptions ||
                    uploading
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {mode === "create"
                    ? "Створити товар"
                    : "Зберегти зміни"}
                </button>
              </section>
            </aside>
          </div>
        )}
      </div>
    </form>
  );
}

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
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
        {label}

        {required && (
          <span className="ml-1 text-amber-400">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10";

const selectClass =
  "h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-white outline-none transition focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10";

const textareaClass =
  "w-full rounded-xl border border-white/[0.07] bg-[#070a10] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10";
