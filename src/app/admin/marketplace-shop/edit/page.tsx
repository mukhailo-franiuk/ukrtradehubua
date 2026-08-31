
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  Store,
  XCircle,
} from "lucide-react";

type MarketplaceShop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sellerStatus: string;
  isActive: boolean;
  rating?: string | number;
  productsCount?: number;
  salesCount?: number;
  ordersCount?: number;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success: boolean;
  exists?: boolean;
  message?: string;
  shop?: MarketplaceShop;
};

export default function MarketplaceShopEditPage() {
  const [shop, setShop] = useState<MarketplaceShop | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadShop();
  }, []);

  async function loadShop() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/admin/marketplace-shop",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не вдалося отримати магазин"
        );
      }

      if (!data.exists || !data.shop) {
        setShop(null);
        return;
      }

      setShop(data.shop);

      setName(data.shop.name);
      setSlug(data.shop.slug);
      setDescription(data.shop.description || "");
      setIsActive(data.shop.isActive);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити магазин"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const normalizedName = name.trim();
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedName) {
      setError("Назва магазину є обов'язковою");
      return;
    }

    if (!normalizedSlug) {
      setError("Slug магазину є обов'язковим");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/admin/marketplace-shop",
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: normalizedName,
            slug: normalizedSlug,
            description:
              description.trim() || null,
            isActive,
          }),
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не вдалося зберегти зміни"
        );
      }

      if (data.shop) {
        setShop(data.shop);
        setName(data.shop.name);
        setSlug(data.shop.slug);
        setDescription(
          data.shop.description || ""
        );
        setIsActive(data.shop.isActive);
      }

      setSuccess(
        data.message ||
          "Магазин успішно оновлено"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося зберегти зміни"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-full bg-[#070a10] text-white">
        <div className="mx-auto flex min-h-[500px] max-w-[1200px] items-center justify-center px-4">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            Завантаження магазину...
          </div>
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="min-h-full bg-[#070a10] text-white">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              href="/admin/marketplace-shop"
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад до магазину
            </Link>

            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-amber-400" />

              <h1 className="text-3xl font-black">
                Редагування магазину
              </h1>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-400/10 bg-[#0b0f16] px-6 py-16 text-center">
            <Store className="mx-auto mb-5 h-10 w-10 text-zinc-700" />

            <h2 className="text-xl font-black text-zinc-300">
              Магазин ще не створений
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              Спочатку створіть системний магазин
              UkrTradeHub.
            </p>

            <Link
              href="/admin/marketplace-shop"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Перейти до магазину
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8">
          <Link
            href="/admin/marketplace-shop"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до магазину
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <Store className="h-6 w-6" />
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
                Marketplace
              </div>

              <h1 className="mt-1 text-3xl font-black tracking-tight">
                Редагування магазину
              </h1>
            </div>
          </div>

          <p className="mt-3 text-sm text-zinc-500">
            Налаштування системного магазину UkrTradeHub.
          </p>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

            <div>
              <div className="text-sm font-bold text-red-300">
                Помилка
              </div>

              <div className="mt-1 text-sm text-red-400/80">
                {error}
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

            <div>
              <div className="text-sm font-bold text-emerald-300">
                Збережено
              </div>

              <div className="mt-1 text-sm text-emerald-400/80">
                {success}
              </div>
            </div>
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

            {/* MAIN */}

            <section className="rounded-3xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-6 py-5">
                <h2 className="text-sm font-black">
                  Основна інформація
                </h2>

                <p className="mt-1 text-xs text-zinc-700">
                  Основні дані системного магазину
                </p>
              </div>

              <div className="space-y-6 p-6">

                {/* NAME */}

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500"
                  >
                    Назва магазину
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    disabled={saving}
                    className="h-12 w-full rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm font-medium text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30 disabled:opacity-60"
                    placeholder="UkrTradeHub"
                  />
                </div>

                {/* SLUG */}

                <div>
                  <label
                    htmlFor="slug"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500"
                  >
                    Slug
                  </label>

                  <div className="flex h-12 overflow-hidden rounded-xl border border-white/[0.07] bg-[#070a10] focus-within:border-amber-400/30">
                    <span className="flex items-center border-r border-white/[0.05] px-4 text-sm text-zinc-700">
                      /
                    </span>

                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      value={slug}
                      onChange={(event) =>
                        setSlug(
                          event.target.value
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                        )
                      }
                      disabled={saving}
                      className="min-w-0 flex-1 bg-transparent px-4 text-sm font-mono text-white outline-none disabled:opacity-60"
                      placeholder="ukrtradehub"
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-zinc-700">
                    Унікальний URL магазину.
                  </p>
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-zinc-500"
                  >
                    Опис
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    rows={7}
                    className="w-full resize-y rounded-xl border border-white/[0.07] bg-[#070a10] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30 disabled:opacity-60"
                    placeholder="Опис магазину UkrTradeHub..."
                  />
                </div>

              </div>
            </section>

            {/* SIDEBAR */}

            <div className="space-y-6">

              {/* STATUS */}

              <section className="rounded-3xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Статус
                  </h2>
                </div>

                <div className="p-5">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#070a10] p-4">
                    <div>
                      <div className="text-sm font-bold text-zinc-200">
                        Магазин активний
                      </div>

                      <div className="mt-1 text-xs leading-5 text-zinc-700">
                        Магазин доступний у системі
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) =>
                        setIsActive(
                          event.target.checked
                        )
                      }
                      disabled={saving}
                      className="h-5 w-5 accent-amber-400"
                    />
                  </label>
                </div>
              </section>

              {/* SYSTEM INFO */}

              <section className="rounded-3xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <h2 className="text-sm font-black">
                    Системна інформація
                  </h2>
                </div>

                <div className="divide-y divide-white/[0.05]">
                  <InfoRow
                    label="ID"
                    value={shop.id}
                    mono
                  />

                  <InfoRow
                    label="Seller status"
                    value={shop.sellerStatus}
                    mono
                  />

                  <InfoRow
                    label="Товарів"
                    value={String(
                      shop.productsCount ?? 0
                    )}
                  />

                  <InfoRow
                    label="Продажів"
                    value={String(
                      shop.salesCount ?? 0
                    )}
                  />

                  <InfoRow
                    label="Замовлень"
                    value={String(
                      shop.ordersCount ?? 0
                    )}
                  />
                </div>
              </section>

              {/* SAVE */}

              <button
                type="submit"
                disabled={saving}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </form>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-700">
        {label}
      </div>

      <div
        className={
          mono
            ? "break-all font-mono text-xs text-zinc-500"
            : "text-sm font-bold text-zinc-300"
        }
      >
        {value}
      </div>
    </div>
  );
}

