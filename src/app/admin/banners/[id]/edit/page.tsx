"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Link2,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";

type Banner = {
  id: string;
  createdById: string;
  shopId: string | null;
  categoryId: string | null;

  title: string | null;
  subtitle: string | null;

  imageUrl: string;
  mobileImageUrl: string | null;

  linkUrl: string | null;

  position: string;
  sortOrder: number;

  startsAt: string | null;
  endsAt: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;

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
};

type FormState = {
  title: string;
  subtitle: string;

  imageUrl: string;
  mobileImageUrl: string;

  linkUrl: string;

  position: string;
  sortOrder: string;

  startsAt: string;
  endsAt: string;

  isActive: boolean;

  shopId: string;
  categoryId: string;
};

const POSITION_OPTIONS = [
  {
    value: "HOME_HERO",
    label: "Головний банер",
  },
  {
    value: "HOME_TOP",
    label: "Головна — верх",
  },
  {
    value: "HOME_MIDDLE",
    label: "Головна — середина",
  },
  {
    value: "CATEGORY",
    label: "Категорія",
  },
  {
    value: "SHOP",
    label: "Магазин",
  },
];

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    typeof params.id === "string"
      ? params.id
      : "";

  const [banner, setBanner] = useState<Banner | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<FormState>({
    title: "",
    subtitle: "",

    imageUrl: "",
    mobileImageUrl: "",

    linkUrl: "",

    position: "",
    sortOrder: "0",

    startsAt: "",
    endsAt: "",

    isActive: true,

    shopId: "",
    categoryId: "",
  });

  /* ============================================================
     LOAD BANNER
  ============================================================ */

  useEffect(() => {
    if (!id) return;

    async function loadBanner() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/banners/${id}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Не вдалося завантажити банер"
          );
        }

        const item: Banner = data.banner;

        setBanner(item);

        setForm({
          title: item.title ?? "",
          subtitle: item.subtitle ?? "",

          imageUrl: item.imageUrl ?? "",
          mobileImageUrl:
            item.mobileImageUrl ?? "",

          linkUrl: item.linkUrl ?? "",

          position: item.position ?? "",
          sortOrder: String(
            item.sortOrder ?? 0
          ),

          startsAt: item.startsAt
            ? formatDateForInput(item.startsAt)
            : "",

          endsAt: item.endsAt
            ? formatDateForInput(item.endsAt)
            : "",

          isActive: item.isActive,

          shopId: item.shopId ?? "",
          categoryId:
            item.categoryId ?? "",
        });
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Сталася помилка"
        );
      } finally {
        setLoading(false);
      }
    }

    loadBanner();
  }, [id]);

  /* ============================================================
     DATE FORMAT
  ============================================================ */

  function formatDateForInput(
    value: string
  ) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset =
      date.getTimezoneOffset();

    const localDate = new Date(
      date.getTime() - offset * 60 * 1000
    );

    return localDate
      .toISOString()
      .slice(0, 16);
  }

  /* ============================================================
     FORM CHANGE
  ============================================================ */

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  /* ============================================================
     SUBMIT
  ============================================================ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.imageUrl.trim()) {
      setError(
        "Вкажіть URL основного зображення"
      );
      return;
    }

    if (!form.position.trim()) {
      setError(
        "Оберіть позицію банера"
      );
      return;
    }

    const sortOrder = Number(
      form.sortOrder
    );

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError(
        "Порядок має бути цілим числом не менше 0"
      );
      return;
    }

    if (
      form.startsAt &&
      form.endsAt
    ) {
      const start = new Date(
        form.startsAt
      );

      const end = new Date(
        form.endsAt
      );

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        setError(
          "Некоректна дата"
        );
        return;
      }

      if (end <= start) {
        setError(
          "Дата завершення має бути пізніше дати початку"
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/banners/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title:
              form.title.trim() || null,

            subtitle:
              form.subtitle.trim() || null,

            imageUrl:
              form.imageUrl.trim(),

            mobileImageUrl:
              form.mobileImageUrl.trim() ||
              null,

            linkUrl:
              form.linkUrl.trim() || null,

            position:
              form.position.trim(),

            sortOrder,

            startsAt:
              form.startsAt || null,

            endsAt:
              form.endsAt || null,

            isActive:
              form.isActive,

            shopId:
              form.shopId.trim() || null,

            categoryId:
              form.categoryId.trim() ||
              null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Не вдалося оновити банер"
        );
      }

      setBanner(data.banner);

      setSuccess(
        "Банер успішно оновлено"
      );

      setTimeout(() => {
        router.push(
          `/admin/banners/${id}`
        );
        router.refresh();
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося оновити банер"
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     DELETE
  ============================================================ */

  async function handleDelete() {
    const confirmed = window.confirm(
      "Ви дійсно хочете видалити цей банер?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(
        `/api/admin/banners/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Не вдалося видалити банер"
        );
      }

      router.push("/admin/banners");
      router.refresh();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося видалити банер"
      );
    } finally {
      setDeleting(false);
    }
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b11] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Завантаження банера...
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     ERROR
  ============================================================ */

  if (!banner) {
    return (
      <main className="min-h-screen bg-[#080b11] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Link
            href="/admin/banners"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до банерів
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-red-300">
            {error ||
              "Банер не знайдено"}
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <main className="min-h-screen bg-[#080b11] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <Link
              href={`/admin/banners/${id}`}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад до банера
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <ImageIcon className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Редагування банера
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Змініть параметри банера та
                  збережіть зміни.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}

            Видалити
          </button>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300">
            <X className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm font-medium text-emerald-300">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_360px]"
        >

          {/* LEFT */}

          <div className="space-y-6">

            {/* BASIC */}

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="mb-6">
                <h2 className="text-lg font-black">
                  Основна інформація
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Текст та основне зображення банера.
                </p>
              </div>

              <div className="space-y-5">

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Заголовок
                  </label>

                  <input
                    value={form.title}
                    onChange={(e) =>
                      updateField(
                        "title",
                        e.target.value
                      )
                    }
                    placeholder="Наприклад: Великий літній розпродаж"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Підзаголовок
                  </label>

                  <textarea
                    value={form.subtitle}
                    onChange={(e) =>
                      updateField(
                        "subtitle",
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Короткий опис банера..."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Основне зображення
                    <span className="ml-1 text-red-400">
                      *
                    </span>
                  </label>

                  <input
                    value={form.imageUrl}
                    onChange={(e) =>
                      updateField(
                        "imageUrl",
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Мобільне зображення
                  </label>

                  <input
                    value={
                      form.mobileImageUrl
                    }
                    onChange={(e) =>
                      updateField(
                        "mobileImageUrl",
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
                  />

                  <p className="mt-2 text-xs text-zinc-600">
                    Необов'язково. Можна використовувати
                    окреме зображення для мобільних пристроїв.
                  </p>
                </div>

              </div>
            </section>

            {/* LINK */}

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                  <Link2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black">
                    Посилання
                  </h2>

                  <p className="text-sm text-zinc-500">
                    Куди переходити після натискання банера.
                  </p>
                </div>
              </div>

              <input
                value={form.linkUrl}
                onChange={(e) =>
                  updateField(
                    "linkUrl",
                    e.target.value
                  )
                }
                placeholder="/catalog або https://..."
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-sky-400/40"
              />
            </section>

            {/* RELATIONS */}

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="mb-6">
                <h2 className="text-lg font-black">
                  Прив'язка
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Необов'язкові зв'язки банера.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    ID магазину
                  </label>

                  <input
                    value={form.shopId}
                    onChange={(e) =>
                      updateField(
                        "shopId",
                        e.target.value
                      )
                    }
                    placeholder="ID магазину"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
                  />

                  {banner.shop && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Поточний магазин:{" "}
                      <span className="text-zinc-400">
                        {banner.shop.name}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    ID категорії
                  </label>

                  <input
                    value={form.categoryId}
                    onChange={(e) =>
                      updateField(
                        "categoryId",
                        e.target.value
                      )
                    }
                    placeholder="ID категорії"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
                  />

                  {banner.category && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Поточна категорія:{" "}
                      <span className="text-zinc-400">
                        {banner.category.name}
                      </span>
                    </p>
                  )}
                </div>

              </div>
            </section>

          </div>

          {/* RIGHT */}

          <div className="space-y-6">

            {/* PREVIEW */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">

              <div className="border-b border-white/[0.06] p-5">
                <h2 className="font-black">
                  Попередній перегляд
                </h2>
              </div>

              <div className="p-4">

                {form.imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
                    <img
                      src={form.imageUrl}
                      alt={
                        form.title ||
                        "Banner preview"
                      }
                      className="aspect-video w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-black/20 text-zinc-700">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-8 w-8" />
                      <p className="mt-2 text-xs">
                        Зображення не вказано
                      </p>
                    </div>
                  </div>
                )}

                {form.title && (
                  <div className="mt-4">
                    <h3 className="font-black">
                      {form.title}
                    </h3>

                    {form.subtitle && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {form.subtitle}
                      </p>
                    )}
                  </div>
                )}

              </div>
            </section>

            {/* SETTINGS */}

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="mb-6">
                <h2 className="text-lg font-black">
                  Налаштування
                </h2>
              </div>

              <div className="space-y-5">

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Позиція
                    <span className="ml-1 text-red-400">
                      *
                    </span>
                  </label>

                  <select
                    value={form.position}
                    onChange={(e) =>
                      updateField(
                        "position",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0b0f17] px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                  >
                    <option value="">
                      Оберіть позицію
                    </option>

                    {POSITION_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </select>

                  <p className="mt-2 text-xs text-zinc-600">
                    Значення повинно відповідати
                    твоєму Prisma enum BannerPosition.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Порядок сортування
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.sortOrder}
                    onChange={(e) =>
                      updateField(
                        "sortOrder",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                  />

                  <p className="mt-2 text-xs text-zinc-600">
                    Менше значення — вище банер.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <div>
                    <div className="text-sm font-bold">
                      Активний банер
                    </div>

                    <div className="mt-1 text-xs text-zinc-600">
                      Банер може відображатися на сайті.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      updateField(
                        "isActive",
                        e.target.checked
                      )
                    }
                    className="h-5 w-5 accent-amber-400"
                  />
                </label>

              </div>
            </section>

            {/* SCHEDULE */}

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="mb-6">
                <h2 className="text-lg font-black">
                  Період показу
                </h2>

                <p className="mt-1 text-xs text-zinc-600">
                  Залиште порожнім, якщо обмеження за датами
                  не потрібні.
                </p>
              </div>

              <div className="space-y-5">

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Початок
                  </label>

                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) =>
                      updateField(
                        "startsAt",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Завершення
                  </label>

                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) =>
                      updateField(
                        "endsAt",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40"
                  />
                </div>

              </div>
            </section>

            {/* SAVE */}

            <button
              type="submit"
              disabled={saving || deleting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Збереження...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Зберегти зміни
                </>
              )}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}