
import Link from "next/link";
import { db } from "@/lib/prisma";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Edit3,
  ImageIcon,
  Plus,
  Power,
  Store,
  Tag,
  Trash2,
} from "lucide-react";

/* ============================================================
   HELPERS
============================================================ */

function formatDate(date: Date | null) {
  if (!date) return "Без обмеження";

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function isBannerCurrentlyActive(
  isActive: boolean,
  startsAt: Date | null,
  endsAt: Date | null
) {
  if (!isActive) return false;

  const now = new Date();

  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt < now) {
    return false;
  }

  return true;
}

function positionLabel(position: string) {
  const labels: Record<string, string> = {
    HERO: "Головний банер",
    HOME: "Головна сторінка",
    CATEGORY: "Категорія",
    SHOP: "Магазин",
    PRODUCTS: "Товари",
    DEALS: "Акції",
  };

  return labels[position] ?? position;
}

/* ============================================================
   PAGE
============================================================ */

export default async function AdminBannersPage() {
  const banners = await db.banner.findMany({
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      shop: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const activeCount = banners.filter((banner) =>
    isBannerCurrentlyActive(
      banner.isActive,
      banner.startsAt,
      banner.endsAt
    )
  ).length;

  const inactiveCount =
    banners.length - activeCount;

  return (
    <main className="min-h-screen bg-[#080b11] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              <ImageIcon className="h-4 w-4" />
              Контент
            </div>

            <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">
              Банери
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Керуйте рекламними та інформаційними банерами
              UkrTradeHub.
            </p>
          </div>

          <Link
            href="/admin/banners/new"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />
            Створити банер
          </Link>
        </div>

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="mb-6 grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Усього банерів
              </div>

              <ImageIcon className="h-4 w-4 text-zinc-600" />
            </div>

            <div className="mt-3 text-3xl font-black">
              {banners.length}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Активні
              </div>

              <Activity className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="mt-3 text-3xl font-black text-emerald-400">
              {activeCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Неактивні
              </div>

              <Power className="h-4 w-4 text-zinc-600" />
            </div>

            <div className="mt-3 text-3xl font-black text-zinc-400">
              {inactiveCount}
            </div>
          </div>

        </div>

        {/* ==================================================
            EMPTY STATE
        ================================================== */}

        {banners.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <ImageIcon className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-xl font-black">
              Банерів ще немає
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Створіть перший банер для головної сторінки,
              категорій або інших розділів UkrTradeHub.
            </p>

            <Link
              href="/admin/banners/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              <Plus className="h-4 w-4" />
              Створити перший банер
            </Link>

          </div>
        ) : (

          /* ==================================================
             BANNERS
          ================================================== */

          <div className="space-y-3">

            {banners.map((banner) => {
              const currentlyActive =
                isBannerCurrentlyActive(
                  banner.isActive,
                  banner.startsAt,
                  banner.endsAt
                );

              return (
                <div
                  key={banner.id}
                  className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition hover:border-white/[0.12]"
                >

                  <div className="flex flex-col xl:flex-row">

                    {/* ========================================
                        IMAGE
                    ======================================== */}

                    <div className="relative h-48 shrink-0 overflow-hidden bg-[#05070b] sm:h-56 xl:h-40 xl:w-[300px]">

                      <img
                        src={banner.imageUrl}
                        alt={banner.title ?? "Банер"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* STATUS */}

                      <div className="absolute left-3 top-3">
                        {currentlyActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-black/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Активний
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500 backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                            Неактивний
                          </span>
                        )}
                      </div>

                      {/* SORT ORDER */}

                      <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[10px] font-black text-white backdrop-blur-md">
                        #{banner.sortOrder}
                      </div>

                    </div>

                    {/* ========================================
                        CONTENT
                    ======================================== */}

                    <div className="min-w-0 flex-1 p-5">

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0 flex-1">

                          {/* TITLE */}

                          <div className="flex items-center gap-3">

                            <h2 className="truncate text-lg font-black">
                              {banner.title ||
                                "Без назви"}
                            </h2>

                            <span className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-zinc-500">
                              {positionLabel(
                                String(
                                  banner.position
                                )
                              )}
                            </span>

                          </div>

                          {/* SUBTITLE */}

                          {banner.subtitle && (
                            <p className="mt-1 truncate text-sm text-zinc-500">
                              {banner.subtitle}
                            </p>
                          )}

                          {/* META */}

                          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs text-zinc-600">

                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5" />

                              <span>
                                {formatDate(
                                  banner.startsAt
                                )}
                                {" → "}
                                {formatDate(
                                  banner.endsAt
                                )}
                              </span>
                            </div>

                            {banner.shop && (
                              <div className="flex items-center gap-2">
                                <Store className="h-3.5 w-3.5" />

                                <span className="max-w-[180px] truncate">
                                  {banner.shop.name}
                                </span>
                              </div>
                            )}

                            {banner.category && (
                              <div className="flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5" />

                                <span className="max-w-[180px] truncate">
                                  {banner.category.name}
                                </span>
                              </div>
                            )}

                          </div>

                        </div>

                        {/* ====================================
                            ACTIONS
                        ==================================== */}

                        <div className="flex shrink-0 items-center gap-2">

                          <Link
                            href={`/admin/banners/${banner.id}/edit`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-300"
                            aria-label="Редагувати банер"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                              banner.isActive
                                ? "border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-400 hover:bg-emerald-400/10"
                                : "border-white/10 bg-white/[0.03] text-zinc-500 hover:bg-white/[0.07] hover:text-white"
                            }`}
                            aria-label={
                              banner.isActive
                                ? "Вимкнути банер"
                                : "Увімкнути банер"
                            }
                          >
                            <Power className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/[0.03] text-red-400 transition hover:bg-red-500/10"
                            aria-label="Видалити банер"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <Link
                            href={`/admin/banners/${banner.id}/edit`}
                            className="hidden h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white sm:flex"
                          >
                            Деталі
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>

                        </div>

                      </div>

                      {/* LINK */}

                      {banner.linkUrl && (
                        <div className="mt-4 truncate border-t border-white/[0.05] pt-4 text-xs text-zinc-600">
                          Посилання:{" "}
                          <span className="text-zinc-500">
                            {banner.linkUrl}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        )}

      </div>
    </main>
  );
}