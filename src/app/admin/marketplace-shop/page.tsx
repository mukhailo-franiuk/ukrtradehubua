"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  Store,
  XCircle,
} from "lucide-react";

type MarketplaceShop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sellerStatus: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success: boolean;
  exists?: boolean;
  message?: string;
  shop?: MarketplaceShop;
};

export default function MarketplaceShopPage() {
  const [shop, setShop] =
    useState<MarketplaceShop | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

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

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не вдалося отримати інформацію про магазин"
        );
      }

      if (data.exists && data.shop) {
        setShop(data.shop);
      } else {
        setShop(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Сталася помилка"
      );
    } finally {
      setLoading(false);
    }
  }

  async function createShop() {
    try {
      setCreating(true);
      setError(null);
      setMessage(null);

      const response = await fetch(
        "/api/admin/marketplace-shop",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не вдалося створити магазин"
        );
      }

      if (data.shop) {
        setShop(data.shop);
      }

      setMessage(
        data.message ||
          "Магазин маркетплейсу успішно створено"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося створити магазин"
      );
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadShop();
  }, []);

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-amber-400">
            <Store className="h-5 w-5" />

            <span className="text-xs font-black uppercase tracking-[0.2em]">
              Marketplace
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Магазин маркетплейсу
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Системний магазин UkrTradeHub для товарів,
            які належать самому маркетплейсу.
          </p>
        </div>

        {/* ERROR */}

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

        {/* SUCCESS */}

        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

            <div>
              <div className="text-sm font-bold text-emerald-300">
                Готово
              </div>

              <div className="mt-1 text-sm text-emerald-400/80">
                {message}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              Завантаження...
            </div>
          </div>
        ) : shop ? (
          <ShopCreated shop={shop} />
        ) : (
          <ShopNotCreated
            creating={creating}
            onCreate={createShop}
          />
        )}
      </div>
    </main>
  );
}

/* ============================================================
   SHOP NOT CREATED
============================================================ */

function ShopNotCreated({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0f16]">
      <div className="flex flex-col items-center px-6 py-16 text-center sm:px-10">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-400/10 bg-amber-400/10 text-amber-400">
          <Store className="h-9 w-9" />
        </div>

        <h2 className="text-2xl font-black text-white">
          Магазин ще не створений
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
          Створіть системний магазин UkrTradeHub.
          Він буде використовуватися маркетплейсом
          як власний магазин.
        </p>

        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Створення...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Створити магазин
            </>
          )}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   SHOP CREATED
============================================================ */

function ShopCreated({
  shop,
}: {
  shop: MarketplaceShop;
}) {
  return (
    <div className="space-y-6">

      {/* STATUS */}

      <section className="overflow-hidden rounded-3xl border border-emerald-400/10 bg-[#0b0f16]">
        <div className="border-b border-white/[0.07] px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Store className="h-6 w-6" />
              </div>

              <div>
                <div className="text-lg font-black text-white">
                  {shop.name}
                </div>

                <div className="mt-1 text-xs text-zinc-600">
                  /{shop.slug}
                </div>
              </div>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Створений
            </span>
          </div>
        </div>

        {/* DETAILS */}

        <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="ID магазину"
            value={shop.id}
            mono
          />

          <InfoItem
            label="Назва"
            value={shop.name}
          />

          <InfoItem
            label="Slug"
            value={`/${shop.slug}`}
            mono
          />

          <InfoItem
            label="Статус магазину"
            value={shop.isActive ? "Активний" : "Неактивний"}
          />

          <InfoItem
            label="Seller status"
            value={shop.sellerStatus}
            mono
          />

          <InfoItem
            label="Створено"
            value={formatDate(shop.createdAt)}
          />
        </div>
      </section>

      {/* DESCRIPTION */}

      <section className="rounded-3xl border border-white/[0.07] bg-[#0b0f16] p-6">
        <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
          Опис
        </div>

        <p className="text-sm leading-7 text-zinc-400">
          {shop.description || "Опис не заданий"}
        </p>
      </section>

    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-[#0b0f16] p-5">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-700">
        {label}
      </div>

      <div
        className={
          mono
            ? "break-all font-mono text-xs text-zinc-400"
            : "text-sm font-bold text-zinc-200"
        }
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   DATE
============================================================ */

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}