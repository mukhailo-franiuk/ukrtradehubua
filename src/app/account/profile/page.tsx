"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Mail,
  Phone,
  Save,
  Trash2,
  User,
  X,
  AlertCircle,
} from "lucide-react";

type UserData = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  status: string;
  isBlocked: boolean;
  emailVerifiedAt: string | null;
  createdAt?: string;
};

type AvatarData = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

type MeResponse = {
  authenticated?: boolean;
  success?: boolean;
  user?: UserData;
  message?: string;
};

type AvatarResponse = {
  success?: boolean;
  avatar?: AvatarData | null;
  message?: string;
};

export default function ProfilePage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [avatar, setAvatar] =
    useState<AvatarData | null>(null);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [originalName, setOriginalName] =
    useState("");

  const [originalPhone, setOriginalPhone] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [deletingAvatar, setDeletingAvatar] =
    useState(false);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadProfile();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const [meResponse, avatarResponse] =
        await Promise.all([
          fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),

          fetch(
            "/api/auth/profile/avatar",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          ),
        ]);

      const meData: MeResponse =
        await meResponse.json();

      if (
        meResponse.status === 401 ||
        !meResponse.ok ||
        !meData.user
      ) {
        window.location.href = "/login";
        return;
      }

      const currentUser =
        meData.user;

      setUser(currentUser);

      const currentName =
        currentUser.name ?? "";

      const currentPhone =
        currentUser.phone ?? "";

      setName(currentName);
      setPhone(currentPhone);

      setOriginalName(currentName);
      setOriginalPhone(currentPhone);

      if (avatarResponse.ok) {
        const avatarData: AvatarResponse =
          await avatarResponse.json();

        setAvatar(
          avatarData.avatar ?? null
        );
      }
    } catch (err) {
      console.error(
        "PROFILE LOAD ERROR:",
        err
      );

      setError(
        "Не вдалося завантажити профіль."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Дозволені формати: JPG, PNG та WebP."
      );

      event.target.value = "";
      return;
    }

    if (file.size <= 0) {
      setError("Файл порожній.");

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Максимальний розмір фото — 5 МБ."
      );

      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(newPreviewUrl);
  }

  function cancelSelectedImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadAvatar() {
    if (!selectedFile) {
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      setError("");

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await fetch(
          "/api/auth/profile/avatar",
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

      const data: AvatarResponse =
        await response.json();

      if (!response.ok || !data.avatar) {
        throw new Error(
          data.message ||
            "Не вдалося завантажити фото."
        );
      }

      setAvatar(data.avatar);

      cancelSelectedImage();

      setMessage(
        "Фото профілю успішно оновлено."
      );
    } catch (err) {
      console.error(
        "AVATAR UPLOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити фото."
      );
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    if (!avatar) {
      return;
    }

    const confirmed =
      window.confirm(
        "Ви дійсно хочете видалити фото профілю?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAvatar(true);
      setMessage("");
      setError("");

      const response =
        await fetch(
          "/api/auth/profile/avatar",
          {
            method: "DELETE",
            credentials: "include",
          }
        );

      const data: AvatarResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Не вдалося видалити фото."
        );
      }

      setAvatar(null);

      setMessage(
        "Фото профілю видалено."
      );
    } catch (err) {
      console.error(
        "AVATAR DELETE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося видалити фото."
      );
    } finally {
      setDeletingAvatar(false);
    }
  }

  async function saveProfile() {
    const trimmedName =
      name.trim();

    const trimmedPhone =
      phone.trim();

    if (
      trimmedName === originalName &&
      trimmedPhone === originalPhone
    ) {
      setMessage("");
      setError(
        "Немає змін для збереження."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response =
        await fetch(
          "/api/auth/me",
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name:
                trimmedName || null,
              phone:
                trimmedPhone || null,
            }),
          }
        );

      const data: MeResponse =
        await response.json();

      if (
        !response.ok ||
        !data.user
      ) {
        throw new Error(
          data.message ||
            "Не вдалося оновити профіль."
        );
      }

      const updatedUser =
        data.user;

      setUser(updatedUser);

      const updatedName =
        updatedUser.name ?? "";

      const updatedPhone =
        updatedUser.phone ?? "";

      setName(updatedName);
      setPhone(updatedPhone);

      setOriginalName(updatedName);
      setOriginalPhone(updatedPhone);

      setMessage(
        "Профіль успішно оновлено."
      );
    } catch (err) {
      console.error(
        "PROFILE SAVE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося оновити профіль."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setName(originalName);
    setPhone(originalPhone);

    setMessage("");
    setError("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-white/50">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            Завантаження профілю...
          </div>
        </div>
      </main>
    );
  }

  if (!user || error && !user) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />

            <h1 className="text-xl font-black">
              Не вдалося відкрити профіль
            </h1>

            <p className="mt-3 text-sm text-white/50">
              {error ||
                "Потрібно увійти в акаунт."}
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Увійти
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    user.name?.trim() ||
    "Користувач";

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") ||
    user.email
      .charAt(0)
      .toUpperCase();

  const currentImage =
    previewUrl ||
    avatar?.url ||
    null;

  const hasProfileChanges =
    name.trim() !== originalName ||
    phone.trim() !== originalPhone;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до акаунта
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
              U
            </div>

            <span className="hidden text-lg font-black tracking-tight sm:block">
              Ukr
              <span className="text-amber-400">
                Trade
              </span>
              Hub
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Page title */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-amber-400">
            Особистий кабінет
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Мій профіль
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Керуйте особистими даними та
            фотографією профілю.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Avatar */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black">
                Фото профілю
              </h2>

              <p className="mt-1 text-sm text-white/35">
                JPG, PNG або WebP до 5 МБ.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-amber-400 text-4xl font-black text-black shadow-2xl shadow-black/30">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={
                        avatar?.alt ||
                        `Фото профілю ${displayName}`
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                {previewUrl && (
                  <div className="absolute -right-2 -top-2 rounded-full border border-amber-400/30 bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-black">
                    Preview
                  </div>
                )}
              </div>

              <div className="mt-6 flex w-full flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    uploading ||
                    deletingAvatar
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  {avatar
                    ? "Змінити фото"
                    : "Додати фото"}
                </button>

                {selectedFile && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <ImageIcon className="h-5 w-5 text-white/40" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/80">
                          {selectedFile.name}
                        </p>

                        <p className="mt-0.5 text-xs text-white/30">
                          {(
                            selectedFile.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          МБ
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          cancelSelectedImage
                        }
                        className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
                        title="Скасувати"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={uploadAvatar}
                      disabled={uploading}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Завантаження...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Зберегти нове фото
                        </>
                      )}
                    </button>
                  </div>
                )}

                {avatar && !selectedFile && (
                  <button
                    type="button"
                    onClick={deleteAvatar}
                    disabled={deletingAvatar}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    {deletingAvatar
                      ? "Видалення..."
                      : "Видалити фото"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Personal information */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-lg font-black">
                Особисті дані
              </h2>

              <p className="mt-1 text-sm text-white/35">
                Змініть ім'я та контактний
                номер телефону.
              </p>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Ім'я
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/25" />

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Ваше ім'я"
                    maxLength={100}
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40 focus:bg-black/40"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Телефон
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/25" />

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="+380..."
                    maxLength={30}
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40 focus:bg-black/40"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-bold text-white/70">
                  Email
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/20" />

                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] py-3.5 pl-12 pr-4 text-sm text-white/40 outline-none"
                  />
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  {user.emailVerifiedAt ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400">
                        Email підтверджено
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-400">
                        Email не підтверджено
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
              {hasProfileChanges && (
                <button
                  type="button"
                  onClick={resetChanges}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Скасувати
                </button>
              )}

              <button
                type="button"
                onClick={saveProfile}
                disabled={
                  saving ||
                  !hasProfileChanges
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
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
          </section>
        </div>

        {/* Account information */}
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-white/50">
            Інформація про акаунт
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-white/25">
                Тип акаунта
              </p>

              <p className="mt-1 text-sm font-semibold text-white/70">
                {user.role === "ADMIN"
                  ? "Адміністратор"
                  : user.role === "SELLER"
                    ? "Продавець"
                    : "Покупець"}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/25">
                Статус
              </p>

              <p className="mt-1 text-sm font-semibold text-white/70">
                {user.status}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/25">
                ID користувача
              </p>

              <p className="mt-1 truncate text-sm font-mono text-white/40">
                {user.id}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}