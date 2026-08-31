"use client";

import {
ChangeEvent,
FormEvent,
useEffect,
useMemo,
useState,
} from "react";
import Link from "next/link";
import {
ArrowLeft,
Image as ImageIcon,
Link2,
Loader2,
Save,
Store,
FolderTree,
CalendarDays,
Eye,
EyeOff,
Smartphone,
Monitor,
AlertCircle,
CheckCircle2,
Upload,
X,
} from "lucide-react";

type Shop = {
id: string;
name: string;
slug: string;
};

type Category = {
id: string;
name: string;
slug: string;
};

type BannerPosition =
| "HOME_HERO"
| "HOME_SECONDARY"
| "CATEGORY_HERO"
| "CATEGORY_PROMO"
| "SHOP_PROMO";

const positions: {
value: BannerPosition;
label: string;
description: string;
}[] = [
{
value: "HOME_HERO",
label: "Головний Hero",
description:
"Великий головний банер на головній сторінці",
},
{
value: "HOME_SECONDARY",
label: "Головна — додатковий",
description:
"Додатковий рекламний банер на головній",
},
{
value: "CATEGORY_HERO",
label: "Hero категорії",
description:
"Головний банер сторінки категорії",
},
{
value: "CATEGORY_PROMO",
label: "Промо категорії",
description:
"Промо-банер всередині категорії",
},
{
value: "SHOP_PROMO",
label: "Промо магазину",
description:
"Рекламний банер конкретного магазину",
},
];

export default function NewBannerPage() {
const [shops, setShops] = useState<Shop[]>([]);
const [categories, setCategories] = useState<Category[]>([]);

const [loadingShops, setLoadingShops] =
useState(true);
const [loadingCategories, setLoadingCategories] =
useState(true);

const [shopsError, setShopsError] = useState("");
const [categoriesError, setCategoriesError] =
useState("");

const [uploadingDesktop, setUploadingDesktop] =
useState(false);
const [uploadingMobile, setUploadingMobile] =
useState(false);

const [saving, setSaving] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const [imageUrl, setImageUrl] = useState("");
const [mobileImageUrl, setMobileImageUrl] =
useState("");

const [title, setTitle] = useState("");
const [subtitle, setSubtitle] = useState("");
const [linkUrl, setLinkUrl] = useState("");

const [position, setPosition] =
useState<BannerPosition>("HOME_HERO");

const [sortOrder, setSortOrder] = useState("0");

const [shopId, setShopId] = useState("");
const [categoryId, setCategoryId] = useState("");

const [startsAt, setStartsAt] = useState("");
const [endsAt, setEndsAt] = useState("");

const [isActive, setIsActive] = useState(true);

// ============================================================
// LOAD SHOPS
// GET /api/shops
// Response:
// {
//   success: true,
//   data: [...]
// }
// ============================================================

useEffect(() => {
let cancelled = false;


async function loadShops() {
  try {
    setLoadingShops(true);
    setShopsError("");

    const response = await fetch(
      "/api/shops?limit=100",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Не вдалося завантажити магазини"
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Не вдалося завантажити магазини"
      );
    }

    if (!cancelled) {
      setShops(
        Array.isArray(data.data)
          ? data.data.map(
              (shop: Partial<Shop>) => ({
                id: String(shop.id ?? ""),
                name: String(
                  shop.name ?? "Без назви"
                ),
                slug: String(
                  shop.slug ?? ""
                ),
              })
            )
          : []
      );
    }
  } catch (error) {
    console.error(
      "Load shops error:",
      error
    );

    if (!cancelled) {
      setShops([]);

      setShopsError(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити магазини"
      );
    }
  } finally {
    if (!cancelled) {
      setLoadingShops(false);
    }
  }
}

loadShops();

return () => {
  cancelled = true;
};


}, []);

// ============================================================
// LOAD CATEGORIES
// GET /api/categories
// Response:
// {
//   success: true,
//   categories: [...]
// }
// ============================================================

useEffect(() => {
let cancelled = false;

async function loadCategories() {
  try {
    setLoadingCategories(true);
    setCategoriesError("");

    const response = await fetch(
      "/api/categories",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Не вдалося завантажити категорії"
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Не вдалося завантажити категорії"
      );
    }

    if (!cancelled) {
      setCategories(
        Array.isArray(data.categories)
          ? data.categories.map(
              (
                category: Partial<Category>
              ) => ({
                id: String(
                  category.id ?? ""
                ),
                name: String(
                  category.name ??
                    "Без назви"
                ),
                slug: String(
                  category.slug ?? ""
                ),
              })
            )
          : []
      );
    }
  } catch (error) {
    console.error(
      "Load categories error:",
      error
    );

    if (!cancelled) {
      setCategories([]);

      setCategoriesError(
        error instanceof Error
          ? error.message
          : "Не вдалося завантажити категорії"
      );
    }
  } finally {
    if (!cancelled) {
      setLoadingCategories(false);
    }
  }
}

loadCategories();

return () => {
  cancelled = true;
};

}, []);

// ============================================================
// POSITION
// ============================================================

const selectedPosition = useMemo(
() =>
positions.find(
(item) => item.value === position
),
[position]
);

const requiresCategory =
position === "CATEGORY_HERO" ||
position === "CATEGORY_PROMO";

const requiresShop =
position === "SHOP_PROMO";

// ============================================================
// IMAGE UPLOAD
// POST /api/admin/banners/upload
// ============================================================

async function uploadImage(
file: File,
mobile: boolean
) {
if (!file.type.startsWith("image/")) {
setError(
"Будь ласка, виберіть файл зображення"
);
return;
}

if (file.size > 5 * 1024 * 1024) {
  setError(
    "Максимальний розмір зображення — 5 MB"
  );
  return;
}

try {
  setError("");

  if (mobile) {
    setUploadingMobile(true);
  } else {
    setUploadingDesktop(true);
  }

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    "/api/admin/banners/upload",
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Не вдалося завантажити зображення"
    );
  }

  const uploadedUrl =
    data.imageUrl || data.url;

  if (
    !uploadedUrl ||
    typeof uploadedUrl !== "string"
  ) {
    throw new Error(
      "Сервер не повернув URL зображення"
    );
  }

  if (mobile) {
    setMobileImageUrl(uploadedUrl);
  } else {
    setImageUrl(uploadedUrl);
  }
} catch (error) {
  console.error(
    "Banner image upload error:",
    error
  );

  setError(
    error instanceof Error
      ? error.message
      : "Не вдалося завантажити зображення"
  );
} finally {
  if (mobile) {
    setUploadingMobile(false);
  } else {
    setUploadingDesktop(false);
  }
}


}

function handleDesktopFile(
event: ChangeEvent<HTMLInputElement>
) {
const file = event.target.files?.[0];


if (!file) return;

uploadImage(file, false);

event.target.value = "";


}

function handleMobileFile(
event: ChangeEvent<HTMLInputElement>
) {
const file = event.target.files?.[0];


if (!file) return;

uploadImage(file, true);

event.target.value = "";


}

// ============================================================
// VALIDATION
// ============================================================

function validate(): string | null {
if (!imageUrl.trim()) {
return "Завантажте основне зображення банера";
}


if (!position) {
  return "Оберіть позицію банера";
}

if (requiresCategory && !categoryId) {
  return "Для банера категорії потрібно вибрати категорію";
}

if (requiresShop && !shopId) {
  return "Для промо магазину потрібно вибрати магазин";
}

const parsedSortOrder = Number(sortOrder);

if (
  !Number.isInteger(parsedSortOrder) ||
  parsedSortOrder < 0
) {
  return "Порядок сортування має бути цілим числом від 0";
}

if (
  startsAt &&
  Number.isNaN(
    new Date(startsAt).getTime()
  )
) {
  return "Некоректна дата початку";
}

if (
  endsAt &&
  Number.isNaN(
    new Date(endsAt).getTime()
  )
) {
  return "Некоректна дата завершення";
}

if (
  startsAt &&
  endsAt &&
  new Date(endsAt) <=
    new Date(startsAt)
) {
  return "Дата завершення має бути пізніше дати початку";
}

return null;

}

// ============================================================
// SUBMIT
// ============================================================

async function handleSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();


setError("");
setSuccess("");

const validationError = validate();

if (validationError) {
  setError(validationError);
  return;
}

try {
  setSaving(true);

  const response = await fetch(
    "/api/admin/banners",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        imageUrl:
          imageUrl.trim(),

        mobileImageUrl:
          mobileImageUrl.trim() ||
          null,

        title:
          title.trim() || null,

        subtitle:
          subtitle.trim() || null,

        linkUrl:
          linkUrl.trim() || null,

        position,

        sortOrder:
          Number(sortOrder),

        shopId:
          shopId || null,

        categoryId:
          categoryId || null,

        startsAt:
          startsAt || null,

        endsAt:
          endsAt || null,

        isActive,
      }),
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Не вдалося створити банер"
    );
  }

  setSuccess(
    "Банер успішно створено"
  );

  window.location.href =
    "/admin/banners";
} catch (error) {
  console.error(
    "Create banner error:",
    error
  );

  setError(
    error instanceof Error
      ? error.message
      : "Не вдалося створити банер"
  );
} finally {
  setSaving(false);
}

}

const hasDesktopImage =
imageUrl.trim().length > 0;

const hasMobileImage =
mobileImageUrl.trim().length > 0;

const selectedShop =
shops.find(
(shop) => shop.id === shopId
);

const selectedCategory =
categories.find(
(category) =>
category.id === categoryId
);

// ============================================================
// UI
// ============================================================

return ( <main className="min-h-screen bg-[#080b11] text-white"> <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

```
    {/* HEADER */}

    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link
          href="/admin/banners"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до банерів
        </Link>

        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Створити банер
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Створіть рекламний або інформаційний
          банер для UkrTradeHub.
        </p>
      </div>

      <div
        className={[
          "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold",
          isActive
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
            : "border-white/10 bg-white/[0.03] text-zinc-500",
        ].join(" ")}
      >
        {isActive ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}

        {isActive
          ? "Активний"
          : "Неактивний"}
      </div>
    </div>

    {/* ALERT */}

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-4 text-sm">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

        <div>
          <div className="font-black text-red-300">
            Помилка
          </div>

          <div className="mt-1 text-red-300/70">
            {error}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setError("")}
          className="ml-auto rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}

    {success && (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

        <div className="font-bold text-emerald-300">
          {success}
        </div>
      </div>
    )}

    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[1fr_420px]"
    >

      {/* ================================================== */}
      {/* LEFT */}
      {/* ================================================== */}

      <div className="space-y-6">

        {/* BASIC */}

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
              <ImageIcon className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-black">
                Основна інформація
              </h2>

              <p className="text-xs text-zinc-600">
                Зображення та текст банера.
              </p>
            </div>
          </div>

          <div className="space-y-5">

            {/* DESKTOP IMAGE */}

            <div>
              <label className="mb-2 block text-sm font-bold">
                Основне зображення
                <span className="ml-1 text-red-400">
                  *
                </span>
              </label>

              <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/20 transition hover:border-emerald-400/30">
                {hasDesktopImage ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt={
                        title ||
                        "Banner preview"
                      }
                      className="aspect-[16/7] w-full object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 p-3 backdrop-blur">
                      <span className="truncate pr-4 text-xs text-zinc-400">
                        Зображення завантажено
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setImageUrl("")
                        }
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-400/20"
                      >
                        <X className="h-3.5 w-3.5" />
                        Видалити
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center px-6 py-12 text-center">
                    {uploadingDesktop ? (
                      <>
                        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />

                        <p className="mt-4 text-sm font-bold">
                          Завантаження...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                          <Upload className="h-6 w-6" />
                        </div>

                        <p className="mt-4 text-sm font-black">
                          Завантажити зображення
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          JPG, PNG, WEBP або AVIF · до 5 MB
                        </p>
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={
                        handleDesktopFile
                      }
                      disabled={
                        uploadingDesktop
                      }
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <p className="mt-2 text-xs text-zinc-600">
                Основне desktop-зображення.
              </p>
            </div>

            {/* MOBILE IMAGE */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Smartphone className="h-4 w-4 text-zinc-500" />
                Мобільне зображення
              </label>

              <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/20 transition hover:border-emerald-400/30">
                {hasMobileImage ? (
                  <div className="relative">
                    <img
                      src={mobileImageUrl}
                      alt={
                        title ||
                        "Mobile banner preview"
                      }
                      className="mx-auto aspect-[9/14] max-h-[360px] object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 p-3 backdrop-blur">
                      <span className="text-xs text-zinc-400">
                        Mobile-зображення
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setMobileImageUrl("")
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-400/20"
                      >
                        <X className="h-3.5 w-3.5" />
                        Видалити
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center px-6 py-10 text-center">
                    {uploadingMobile ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />

                        <p className="mt-3 text-sm font-bold">
                          Завантаження...
                        </p>
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-9 w-9 text-zinc-700" />

                        <p className="mt-3 text-sm font-black">
                          Завантажити mobile-версію
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          Необов&apos;язково
                        </p>
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={
                        handleMobileFile
                      }
                      disabled={
                        uploadingMobile
                      }
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <p className="mt-2 text-xs text-zinc-600">
                Якщо не вказати — на мобільному
                використовуватиметься основне зображення.
              </p>
            </div>

            {/* TITLE */}

            <div>
              <label className="mb-2 block text-sm font-bold">
                Заголовок
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Наприклад: Великий розпродаж"
                maxLength={200}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
              />
            </div>

            {/* SUBTITLE */}

            <div>
              <label className="mb-2 block text-sm font-bold">
                Підзаголовок
              </label>

              <textarea
                value={subtitle}
                onChange={(e) =>
                  setSubtitle(e.target.value)
                }
                placeholder="Короткий опис або додатковий текст"
                maxLength={500}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
              />
            </div>

            {/* LINK */}

            <div>
              <label className="mb-2 block text-sm font-bold">
                Посилання
              </label>

              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) =>
                    setLinkUrl(
                      e.target.value
                    )
                  }
                  placeholder="/catalog або https://..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* POSITION */}

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="mb-6">
            <h2 className="font-black">
              Розміщення
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Виберіть місце показу банера.
            </p>
          </div>

          <div className="grid gap-3">
            {positions.map(
              (item) => {
                const active =
                  position ===
                  item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setPosition(
                        item.value
                      )
                    }
                    className={[
                      "w-full rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-emerald-400/40 bg-emerald-400/[0.08]"
                        : "border-white/[0.07] bg-black/10 hover:border-white/15 hover:bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          "mt-0.5 h-4 w-4 rounded-full border",
                          active
                            ? "border-emerald-400 bg-emerald-400"
                            : "border-zinc-700",
                        ].join(" ")}
                      />

                      <div>
                        <div className="text-sm font-black">
                          {item.label}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-zinc-600">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>

          {selectedPosition && (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Обрана позиція
              </div>

              <div className="mt-1 text-sm font-black text-emerald-400">
                {
                  selectedPosition.label
                }
              </div>
            </div>
          )}
        </section>

        {/* RELATIONS */}

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="mb-6">
            <h2 className="font-black">
              Прив&apos;язка
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Прив&apos;яжіть банер до магазину або категорії.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* SHOP */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Store className="h-4 w-4 text-zinc-500" />
                Магазин
              </label>

              <select
                value={shopId}
                onChange={(e) =>
                  setShopId(
                    e.target.value
                  )
                }
                disabled={
                  loadingShops
                }
                className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-4 py-3 text-sm outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  Без магазину
                </option>

                {shops.map(
                  (shop) => (
                    <option
                      key={shop.id}
                      value={shop.id}
                    >
                      {shop.name}
                    </option>
                  )
                )}
              </select>

              {loadingShops && (
                <p className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Завантаження магазинів...
                </p>
              )}

              {!loadingShops &&
                !shopsError &&
                shops.length ===
                  0 && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Активних магазинів немає.
                  </p>
                )}

              {shopsError && (
                <p className="mt-2 text-xs font-bold text-red-400">
                  {shopsError}
                </p>
              )}

              {requiresShop && (
                <p className="mt-2 text-xs font-bold text-amber-400">
                  Для цієї позиції магазин
                  обов&apos;язковий.
                </p>
              )}
            </div>

            {/* CATEGORY */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <FolderTree className="h-4 w-4 text-zinc-500" />
                Категорія
              </label>

              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value
                  )
                }
                disabled={
                  loadingCategories
                }
                className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-4 py-3 text-sm outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  Без категорії
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
                      {category.name}
                    </option>
                  )
                )}
              </select>

              {loadingCategories && (
                <p className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Завантаження категорій...
                </p>
              )}

              {!loadingCategories &&
                !categoriesError &&
                categories.length ===
                  0 && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Активних категорій немає.
                  </p>
                )}

              {categoriesError && (
                <p className="mt-2 text-xs font-bold text-red-400">
                  {categoriesError}
                </p>
              )}

              {requiresCategory && (
                <p className="mt-2 text-xs font-bold text-amber-400">
                  Для цієї позиції категорія
                  обов&apos;язкова.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* SCHEDULE */}

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-black">
                Розклад
              </h2>

              <p className="text-xs text-zinc-600">
                Необов&apos;язковий період показу.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">
                Початок показу
              </label>

              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) =>
                  setStartsAt(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Завершення показу
              </label>

              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) =>
                  setEndsAt(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
              />
            </div>
          </div>
        </section>

        {/* SETTINGS */}

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <h2 className="mb-6 font-black">
            Налаштування
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-bold">
                Порядок сортування
              </label>

              <input
                type="number"
                min={0}
                step={1}
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10"
              />

              <p className="mt-2 text-xs text-zinc-600">
                Менше число = вище у списку.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Статус
              </label>

              <button
                type="button"
                onClick={() =>
                  setIsActive(
                    (value) =>
                      !value
                  )
                }
                className={[
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                  isActive
                    ? "border-emerald-400/20 bg-emerald-400/[0.07]"
                    : "border-white/10 bg-black/20",
                ].join(" ")}
              >
                <span className="flex items-center gap-2 font-bold">
                  {isActive ? (
                    <Eye className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-zinc-600" />
                  )}

                  {isActive
                    ? "Банер активний"
                    : "Банер вимкнений"}
                </span>

                <span
                  className={[
                    "h-5 w-9 rounded-full p-0.5 transition",
                    isActive
                      ? "bg-emerald-400"
                      : "bg-zinc-800",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block h-4 w-4 rounded-full bg-white transition",
                      isActive
                        ? "translate-x-4"
                        : "translate-x-0",
                    ].join(" ")}
                  />
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* SUBMIT */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/banners"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            Скасувати
          </Link>

          <button
            type="submit"
            disabled={
              saving ||
              uploadingDesktop ||
              uploadingMobile
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Створення...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Створити банер
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* RIGHT PREVIEW */}
      {/* ================================================== */}

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025]">

          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-emerald-400" />

              <span className="text-sm font-black">
                Попередній перегляд
              </span>
            </div>
          </div>

          <div className="p-5">

            {/* DESKTOP */}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Desktop
                </span>

                <Monitor className="h-3.5 w-3.5 text-zinc-700" />
              </div>

              <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                {hasDesktopImage ? (
                  <img
                    src={imageUrl}
                    alt={
                      title ||
                      "Preview banner"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-zinc-800" />

                      <p className="mt-2 text-xs text-zinc-700">
                        Завантажте зображення
                      </p>
                    </div>
                  </div>
                )}

                {(title ||
                  subtitle) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                    {title && (
                      <div className="text-sm font-black">
                        {title}
                      </div>
                    )}

                    {subtitle && (
                      <div className="mt-1 text-[10px] text-zinc-300">
                        {subtitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE */}

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Mobile
                </span>

                <Smartphone className="h-3.5 w-3.5 text-zinc-700" />
              </div>

              <div className="mx-auto aspect-[9/14] max-w-[180px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                {hasMobileImage ? (
                  <img
                    src={
                      mobileImageUrl
                    }
                    alt={
                      title ||
                      "Mobile banner preview"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : hasDesktopImage ? (
                  <img
                    src={imageUrl}
                    alt={
                      title ||
                      "Mobile banner preview"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-5 text-center">
                    <div>
                      <Smartphone className="mx-auto h-7 w-7 text-zinc-800" />

                      <p className="mt-2 text-[10px] text-zinc-700">
                        Мобільне зображення
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* META */}

            <div className="mt-6 space-y-2 border-t border-white/[0.06] pt-5">

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">
                  Позиція
                </span>

                <span className="font-bold text-zinc-300">
                  {
                    selectedPosition?.label
                  }
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">
                  Статус
                </span>

                <span
                  className={
                    isActive
                      ? "font-bold text-emerald-400"
                      : "font-bold text-zinc-600"
                  }
                >
                  {isActive
                    ? "Активний"
                    : "Вимкнений"}
                </span>
              </div>

              {title && (
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="shrink-0 text-zinc-600">
                    Заголовок
                  </span>

                  <span className="truncate font-bold text-zinc-300">
                    {title}
                  </span>
                </div>
              )}

              {selectedShop && (
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-zinc-600">
                    Магазин
                  </span>

                  <span className="truncate font-bold text-zinc-300">
                    {
                      selectedShop.name
                    }
                  </span>
                </div>
              )}

              {selectedCategory && (
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-zinc-600">
                    Категорія
                  </span>

                  <span className="truncate font-bold text-zinc-300">
                    {
                      selectedCategory.name
                    }
                  </span>
                </div>
              )}

              {linkUrl && (
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="shrink-0 text-zinc-600">
                    Посилання
                  </span>

                  <span className="truncate font-bold text-zinc-300">
                    {linkUrl}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </form>
  </div>
</main>

);
}
