"use client";

import {
ChangeEvent,
DragEvent,
FormEvent,
useEffect,
useRef,
useState,
} from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
ArrowLeft,
Check,
ChevronDown,
Image as ImageIcon,
Loader2,
Save,
Trash2,
Upload,
X,
} from "lucide-react";

type Category = {
id: string;
parentId: string | null;
name: string;
slug: string;
description: string | null;
imageUrl: string | null;
icon: string | null;
isActive: boolean;
sortOrder: number;
};

type ApiResponse = {
success: boolean;
message?: string;
error?: string;
category?: Category & {
seo?: {
title: string | null;
description: string | null;
keywords: string | null;
canonical: string | null;
} | null;
};
categories?: Category[];
imageUrl?: string;
};

export default function EditCategoryPage() {
const router = useRouter();
const params = useParams();

const id =
typeof params.id === "string"
? params.id
: "";

const fileInputRef =
useRef<HTMLInputElement>(null);

const [loading, setLoading] =
useState(true);

const [saving, setSaving] =
useState(false);

const [uploading, setUploading] =
useState(false);

const [loadingCategories, setLoadingCategories] =
useState(true);

const [categories, setCategories] =
useState<Category[]>([]);

const [name, setName] =
useState("");

const [slug, setSlug] =
useState("");

const [description, setDescription] =
useState("");

const [parentId, setParentId] =
useState("");

const [icon, setIcon] =
useState("");

const [isActive, setIsActive] =
useState(true);

const [sortOrder, setSortOrder] =
useState("0");

const [imageUrl, setImageUrl] =
useState<string | null>(null);

const [file, setFile] =
useState<File | null>(null);

const [previewUrl, setPreviewUrl] =
useState<string | null>(null);

const [dragActive, setDragActive] =
useState(false);

const [error, setError] =
useState("");

const [success, setSuccess] =
useState(false);

// =====================================================
// LOAD CATEGORY
// =====================================================

useEffect(() => {
if (!id) return;


async function loadCategory() {
  try {
    setLoading(true);
    setError("");

    const response = await fetch(
      `/api/admin/categories/${id}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const data: ApiResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          "Не вдалося завантажити категорію"
      );
    }

    if (!data.category) {
      throw new Error(
        "Категорію не знайдено"
      );
    }

    const category = data.category;

    setName(category.name);
    setSlug(category.slug);
    setDescription(
      category.description || ""
    );
    setParentId(
      category.parentId || ""
    );
    setIcon(category.icon || "");
    setIsActive(category.isActive);
    setSortOrder(
      String(category.sortOrder)
    );
    setImageUrl(
      category.imageUrl || null
    );
  } catch (err) {
    console.error(
      "LOAD CATEGORY ERROR:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Не вдалося завантажити категорію"
    );
  } finally {
    setLoading(false);
  }
}

loadCategory();


}, [id]);

// =====================================================
// LOAD CATEGORIES
// =====================================================

useEffect(() => {
async function loadCategories() {
try {
setLoadingCategories(true);


    const response = await fetch(
      "/api/admin/categories",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const data: ApiResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          "Не вдалося завантажити категорії"
      );
    }

    setCategories(
      (data.categories || []).filter(
        (category) =>
          category.id !== id
      )
    );
  } catch (err) {
    console.error(
      "LOAD CATEGORIES ERROR:",
      err
    );
  } finally {
    setLoadingCategories(false);
  }
}

loadCategories();


}, [id]);

// =====================================================
// CLEAN PREVIEW
// =====================================================

useEffect(() => {
return () => {
if (previewUrl) {
URL.revokeObjectURL(previewUrl);
}
};
}, [previewUrl]);

// =====================================================
// FILE VALIDATION
// =====================================================

function validateFile(file: File) {
const allowedTypes = [
"image/jpeg",
"image/png",
"image/webp",
"image/avif",
];


if (!allowedTypes.includes(file.type)) {
  throw new Error(
    "Дозволені формати: JPG, PNG, WEBP та AVIF"
  );
}

if (file.size > 5 * 1024 * 1024) {
  throw new Error(
    "Максимальний розмір зображення — 5 MB"
  );
}


}

// =====================================================
// FILE SELECT
// =====================================================

function handleFileSelect(
selectedFile: File
) {
try {
setError("");


  validateFile(selectedFile);

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  const localUrl =
    URL.createObjectURL(
      selectedFile
    );

  setFile(selectedFile);
  setPreviewUrl(localUrl);
} catch (err) {
  setFile(null);
  setPreviewUrl(null);

  setError(
    err instanceof Error
      ? err.message
      : "Некоректний файл"
  );
}


}

function handleInputChange(
event: ChangeEvent<HTMLInputElement>
) {
const selectedFile =
event.target.files?.[0];


if (selectedFile) {
  handleFileSelect(selectedFile);
}


}

// =====================================================
// DRAG & DROP
// =====================================================

function handleDragOver(
event: DragEvent<HTMLDivElement>
) {
event.preventDefault();
setDragActive(true);
}

function handleDragLeave(
event: DragEvent<HTMLDivElement>
) {
event.preventDefault();
setDragActive(false);
}

function handleDrop(
event: DragEvent<HTMLDivElement>
) {
event.preventDefault();
setDragActive(false);


const droppedFile =
  event.dataTransfer.files?.[0];

if (droppedFile) {
  handleFileSelect(droppedFile);
}


}

// =====================================================
// REMOVE IMAGE
// =====================================================

function removeImage() {
if (previewUrl) {
URL.revokeObjectURL(previewUrl);
}


setFile(null);
setPreviewUrl(null);
setImageUrl(null);

if (fileInputRef.current) {
  fileInputRef.current.value = "";
}


}

// =====================================================
// UPLOAD IMAGE
// =====================================================

async function uploadImage() {
if (!file) {
return imageUrl;
}


setUploading(true);
setError("");

try {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    "/api/admin/categories/upload",
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  const data: ApiResponse =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Не вдалося завантажити зображення"
    );
  }

  if (!data.imageUrl) {
    throw new Error(
      "API не повернув URL зображення"
    );
  }

  setImageUrl(data.imageUrl);

  return data.imageUrl;
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

  throw err;
} finally {
  setUploading(false);
}

}

// =====================================================
// SUBMIT
// =====================================================

async function handleSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();


setError("");
setSuccess(false);

if (!name.trim()) {
  setError(
    "Введіть назву категорії"
  );
  return;
}

if (!slug.trim()) {
  setError(
    "Введіть slug категорії"
  );
  return;
}

if (!id) {
  setError(
    "Не визначено ID категорії"
  );
  return;
}

setSaving(true);

try {
  let uploadedImageUrl =
    imageUrl;

  if (file) {
    uploadedImageUrl =
      await uploadImage();
  }

  const response = await fetch(
    `/api/admin/categories/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug
          .trim()
          .toLowerCase(),
        description:
          description.trim() || null,
        parentId:
          parentId || null,
        imageUrl:
          uploadedImageUrl || null,
        icon:
          icon.trim() || null,
        isActive,
        sortOrder:
          Number(sortOrder) || 0,
      }),
    }
  );

  const data: ApiResponse =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Не вдалося оновити категорію"
    );
  }

  setSuccess(true);

  setTimeout(() => {
    router.push(
      "/admin/categories"
    );
    router.refresh();
  }, 700);
} catch (err) {
  console.error(
    "UPDATE CATEGORY ERROR:",
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : "Не вдалося оновити категорію"
  );
} finally {
  setSaving(false);
}


}

// =====================================================
// SLUG
// =====================================================

function generateSlug() {
const generated = name
.toLowerCase()
.trim()
.replace(
/[а-яіїєґ]/g,
(char) => {
const map: Record<
string,
string
> = {
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
};


      return map[char] ?? char;
    }
  )
  .replace(
    /[^a-z0-9]+/g,
    "-"
  )
  .replace(
    /^-+|-+$/g,
    "");

setSlug(generated);


}

// =====================================================
// LOADING
// =====================================================

if (loading) {
return ( <main className="min-h-screen bg-[#070a10] text-white"> <div className="flex min-h-[70vh] items-center justify-center"> <div className="flex flex-col items-center gap-4"> <Loader2 className="h-8 w-8 animate-spin text-amber-400" />

```
        <p className="text-sm text-zinc-500">
          Завантаження категорії...
        </p>
      </div>
    </div>
  </main>
);


}

// =====================================================
// RENDER
// =====================================================

return ( <main className="min-h-screen bg-[#070a10] text-white"> <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

```
    {/* HEADER */}

    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link
          href="/admin/categories"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до категорій
        </Link>

        <h1 className="text-3xl font-black tracking-tight">
          Редагування категорії
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Змініть дані категорії
          UkrTradeHub
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        Редагування
      </div>
    </div>

    {/* ERROR */}

    {error && (
      <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        <span>{error}</span>

        <button
          type="button"
          onClick={() =>
            setError("")
          }
          className="text-red-400/70 hover:text-red-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )}

    {/* SUCCESS */}

    {success && (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
        <Check className="h-5 w-5" />
        Категорію успішно оновлено.
      </div>
    )}

    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_380px]"
    >

      {/* LEFT */}

      <div className="space-y-6">

        {/* BASIC */}

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-black">
              Основна інформація
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Основні дані категорії
            </p>
          </div>

          <div className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Назва
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-zinc-300">
                  Slug
                </label>

                <button
                  type="button"
                  onClick={generateSlug}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  Згенерувати
                </button>
              </div>

              <input
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        "-"
                      )
                  )
                }
                className="h-12 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 font-mono text-sm text-white outline-none transition focus:border-amber-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Опис
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                rows={6}
                className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/40"
              />
            </div>

          </div>
        </section>

        {/* IMAGE */}

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-black">
              Зображення категорії
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              JPG, PNG, WEBP або AVIF до 5 MB
            </p>
          </div>

          {!previewUrl && !imageUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                fileInputRef.current?.click()
              }
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                dragActive
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-white/10 bg-white/[0.02] hover:border-amber-400/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={
                  handleInputChange
                }
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                <Upload className="h-7 w-7" />
              </div>

              <div className="text-sm font-bold text-zinc-300">
                Перетягніть зображення сюди
              </div>

              <div className="mt-2 text-xs text-zinc-600">
                або натисніть, щоб обрати файл
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
              <div className="relative aspect-[16/9] bg-black/20">

                <img
                  src={
                    previewUrl ||
                    imageUrl ||
                    ""
                  }
                  alt={name}
                  className="h-full w-full object-cover"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/70 text-white transition hover:bg-red-500"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>

              <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  {file ? (
                    <>
                      <ImageIcon className="h-4 w-4" />
                      {file.name}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      Поточне зображення
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  Змінити
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={
                    handleInputChange
                  }
                  className="hidden"
                />

              </div>
            </div>
          )}

          {uploading && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Завантаження зображення...
            </div>
          )}
        </section>

        {/* EXTRA */}

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-black">
              Додатково
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Іконка
              </label>

              <input
                value={icon}
                onChange={(event) =>
                  setIcon(
                    event.target.value
                  )
                }
                placeholder="Наприклад: smartphone"
                className="h-12 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-sm text-white outline-none focus:border-amber-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Порядок сортування
              </label>

              <input
                type="number"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-sm text-white outline-none focus:border-amber-400/40"
              />
            </div>

          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">

            <div>
              <div className="text-sm font-bold text-zinc-300">
                Категорія активна
              </div>

              <div className="mt-1 text-xs text-zinc-600">
                Активні категорії доступні покупцям
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsActive(
                  (value) => !value
                )
              }
              className={`relative h-7 w-12 rounded-full transition ${
                isActive
                  ? "bg-emerald-500"
                  : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  isActive
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>

          </div>
        </section>
      </div>

      {/* RIGHT */}

      <aside className="space-y-6">

        {/* STRUCTURE */}

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black">
              Структура
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Батьківська категорія
            </p>
          </div>

          <div className="relative">
            <select
              value={parentId}
              onChange={(event) =>
                setParentId(
                  event.target.value
                )
              }
              disabled={
                loadingCategories
              }
              className="h-12 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 pr-10 text-sm text-white outline-none focus:border-amber-400/40 disabled:opacity-50"
            >
              <option
                value=""
                className="bg-[#0b0f16]"
              >
                Без батьківської категорії
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                    className="bg-[#0b0f16]"
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          </div>
        </section>

        {/* PREVIEW */}

        <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-6">
          <h2 className="mb-5 text-lg font-black">
            Попередній перегляд
          </h2>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="aspect-[16/9] bg-white/[0.02]">

              {previewUrl ||
              imageUrl ? (
                <img
                  src={
                    previewUrl ||
                    imageUrl ||
                    ""
                  }
                  alt={
                    name ||
                    "Категорія"
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-zinc-700">
                  <ImageIcon className="h-9 w-9" />

                  <span className="mt-3 text-xs">
                    Немає зображення
                  </span>
                </div>
              )}

            </div>

            <div className="p-4">
              <div className="font-black text-white">
                {name ||
                  "Назва категорії"}
              </div>

              <div className="mt-1 font-mono text-xs text-zinc-600">
                /
                {slug ||
                  "category-slug"}
              </div>
            </div>
          </div>
        </section>

        {/* SAVE */}

        <div className="sticky top-6 rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4">

          <button
            type="submit"
            disabled={
              saving ||
              uploading ||
              success
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
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

          <Link
            href="/admin/categories"
            className="mt-3 flex h-11 items-center justify-center rounded-xl border border-white/[0.07] text-sm font-bold text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
          >
            Скасувати
          </Link>

        </div>
      </aside>
    </form>
  </div>
</main>

);
}
