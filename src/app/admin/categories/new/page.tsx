
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
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";

type Category = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  categories?: Category[];
  category?: T;
  imageUrl?: string;
};

export default function NewCategoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [parentId, setParentId] = useState("");
  const [icon, setIcon] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        setError("");

        const response = await fetch("/api/categories", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              data.error ||
              "Не вдалося завантажити категорії"
          );
        }

        setCategories(data.categories || []);
      } catch (err) {
        console.error("LOAD CATEGORIES ERROR:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Помилка завантаження категорій"
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  // =====================================================
  // CLEAN PREVIEW URL
  // =====================================================

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // =====================================================
  // VALIDATE FILE
  // =====================================================

  function validateFile(selectedFile: File) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      throw new Error(
        "Дозволені формати: JPG, PNG, WEBP та AVIF"
      );
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      throw new Error(
        "Максимальний розмір зображення — 5 MB"
      );
    }
  }

  // =====================================================
  // SELECT FILE
  // =====================================================

  function handleFileSelect(selectedFile: File) {
    try {
      setError("");

      validateFile(selectedFile);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const localPreview = URL.createObjectURL(selectedFile);

      setFile(selectedFile);
      setPreviewUrl(localPreview);

      // Якщо вибрали новий файл — старий URL більше не актуальний
      setImageUrl(null);
    } catch (err) {
      setFile(null);
      setPreviewUrl(null);
      setImageUrl(null);

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
    const selectedFile = event.target.files?.[0];

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

    const droppedFile = event.dataTransfer.files?.[0];

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
      return null;
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

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            "Не вдалося завантажити зображення"
        );
      }

      if (!data.imageUrl) {
        throw new Error(
          "API завантаження не повернув imageUrl"
        );
      }

      setImageUrl(data.imageUrl);

      return data.imageUrl;
    } catch (err) {
      console.error("UPLOAD IMAGE ERROR:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Помилка завантаження зображення";

      setError(message);

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
      setError("Введіть назву категорії");
      return;
    }

    if (!slug.trim()) {
      setError("Введіть slug категорії");
      return;
    }

    setSaving(true);

    try {
      // -------------------------------------------------
      // 1. UPLOAD IMAGE
      // -------------------------------------------------

      let uploadedImageUrl = imageUrl;

      if (file && !uploadedImageUrl) {
        uploadedImageUrl = await uploadImage();
      }

      // -------------------------------------------------
      // 2. CREATE CATEGORY
      // -------------------------------------------------

      const response = await fetch("/api/categories", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || null,
          imageUrl: uploadedImageUrl || null,
          icon: icon.trim() || null,
          parentId: parentId || null,
          isActive,
          sortOrder: Number(sortOrder) || 0,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            data.error ||
            "Не вдалося створити категорію"
        );
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/admin/categories");
        router.refresh();
      }, 700);
    } catch (err) {
      console.error("CREATE CATEGORY ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося створити категорію"
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // SLUG
  // =====================================================

  function generateSlug() {
    const map: Record<string, string> = {
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

    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[а-яіїєґ]/g, (char) => map[char] ?? char)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setSlug(generated);
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/categories"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Назад до категорій
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Створення категорії
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Додайте нову категорію маркетплейсу
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Адмін-панель
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400/70 transition hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <Check size={18} />
            Категорію успішно створено.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_380px]"
        >

          {/* LEFT */}

          <div className="space-y-6">

            {/* BASIC */}

            <section className="rounded-2xl border border-white/10 bg-[#0e131d] p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">
                  Основна інформація
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Дані категорії
                </p>
              </div>

              <div className="space-y-5">

                {/* NAME */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Назва
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    onBlur={() => {
                      if (!slug) {
                        generateSlug();
                      }
                    }}
                    placeholder="Наприклад: Електроніка"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-white/[0.05]"
                  />
                </div>

                {/* SLUG */}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Slug
                    </label>

                    <button
                      type="button"
                      onClick={generateSlug}
                      className="text-xs text-blue-400 transition hover:text-blue-300"
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
                          .replace(/\s+/g, "-")
                      )
                    }
                    placeholder="elektronika"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-white/[0.05]"
                  />

                  <p className="mt-2 text-xs text-gray-600">
                    Унікальний URL категорії
                  </p>
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Опис
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    rows={5}
                    placeholder="Короткий опис категорії..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-white/[0.05]"
                  />
                </div>

              </div>
            </section>

            {/* IMAGE */}

            <section className="rounded-2xl border border-white/10 bg-[#0e131d] p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">
                  Зображення категорії
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  JPG, PNG, WEBP або AVIF до 5 MB
                </p>
              </div>

              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-blue-500/40 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleInputChange}
                    className="hidden"
                  />

                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                    <Upload size={28} />
                  </div>

                  <div className="text-sm font-medium text-gray-200">
                    Перетягніть зображення сюди
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    або натисніть, щоб обрати файл
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-gray-400">
                    <ImageIcon size={15} />
                    Обрати файл
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">

                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="truncate text-sm font-medium text-white">
                        {file?.name}
                      </div>

                      {file && (
                        <div className="mt-1 text-xs text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-gray-300 backdrop-blur transition hover:bg-red-500/80 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {imageUrl ? (
                        <>
                          <Check
                            size={15}
                            className="text-emerald-400"
                          />
                          Завантажено
                        </>
                      ) : (
                        <>
                          <ImageIcon size={15} />
                          Готово до завантаження
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="text-xs font-medium text-blue-400 transition hover:text-blue-300"
                    >
                      Змінити
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleInputChange}
                      className="hidden"
                    />

                  </div>
                </div>
              )}

              {uploading && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Завантаження зображення...
                </div>
              )}
            </section>

            {/* EXTRA */}

            <section className="rounded-2xl border border-white/10 bg-[#0e131d] p-6">

              <div className="mb-6">
                <h2 className="text-lg font-semibold">
                  Додатково
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Налаштування відображення
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">

                {/* ICON */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Іконка
                  </label>

                  <input
                    value={icon}
                    onChange={(event) =>
                      setIcon(event.target.value)
                    }
                    placeholder="Наприклад: smartphone"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50"
                  />
                </div>

                {/* SORT */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Порядок сортування
                  </label>

                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-blue-500/50"
                  />
                </div>

              </div>

              {/* ACTIVE */}

              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">

                <div>
                  <div className="text-sm font-medium text-gray-200">
                    Категорія активна
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
                    Активні категорії доступні покупцям
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsActive((value) => !value)
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    isActive
                      ? "bg-emerald-500"
                      : "bg-gray-700"
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

            {/* PARENT */}

            <section className="rounded-2xl border border-white/10 bg-[#0e131d] p-6">

              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Структура
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Виберіть батьківську категорію
                </p>
              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Батьківська категорія
                </label>

                <div className="relative">

                  <select
                    value={parentId}
                    onChange={(event) =>
                      setParentId(event.target.value)
                    }
                    disabled={loadingCategories}
                    className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-4 pr-10 text-sm text-white outline-none transition focus:border-blue-500/50 disabled:opacity-50"
                  >
                    <option
                      value=""
                      className="bg-[#0e131d]"
                    >
                      Без батьківської категорії
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                        className="bg-[#0e131d]"
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  />

                </div>

                {loadingCategories && (
                  <div className="mt-2 text-xs text-gray-600">
                    Завантаження категорій...
                  </div>
                )}

              </div>
            </section>

            {/* PREVIEW */}

            <section className="rounded-2xl border border-white/10 bg-[#0e131d] p-6">

              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Попередній перегляд
                </h2>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">

                <div className="aspect-[16/9] bg-white/[0.03]">

                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={name || "Категорія"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-gray-700">
                      <ImageIcon size={36} />

                      <span className="mt-3 text-xs">
                        Немає зображення
                      </span>
                    </div>
                  )}

                </div>

                <div className="p-4">

                  <div className="text-base font-semibold text-white">
                    {name || "Назва категорії"}
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
                    {slug || "category-slug"}
                  </div>

                </div>
              </div>
            </section>

            {/* SAVE */}

            <div className="sticky top-6 rounded-2xl border border-white/10 bg-[#0e131d] p-4">

              <button
                type="submit"
                disabled={
                  saving ||
                  uploading ||
                  success
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Збереження...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Створити категорію
                  </>
                )}
              </button>

              <Link
                href="/admin/categories"
                className="mt-3 flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-sm font-medium text-gray-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                Скасувати
              </Link>

            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}