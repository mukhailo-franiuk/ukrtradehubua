"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Store,
  Package,
  XCircle,
} from "lucide-react";

type ReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type ReviewType =
  | "PRODUCT"
  | "SHOP";

type ReviewUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  rating: unknown;
  reviewsCount: number;
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  rating: unknown;
  reviewsCount: number;
};

type Review = {
  id: string;
  type: ReviewType;

  targetId: string;
  targetName: string;

  rating: number;
  title: string | null;
  comment: string | null;

  status: ReviewStatus;

  createdAt: string;
  updatedAt: string;

  orderItemId: string | null;

  user: ReviewUser;

  product: Product | null;
  shop: Shop | null;
};

type ApiResponse = {
  reviews: Review[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  counts: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
};

type StatusFilter =
  | "ALL"
  | ReviewStatus;

const STATUS_FILTERS: {
  value: StatusFilter;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "Всі",
  },
  {
    value: "PENDING",
    label: "Очікують",
  },
  {
    value: "APPROVED",
    label: "Схвалені",
  },
  {
    value: "REJECTED",
    label: "Відхилені",
  },
];

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function statusLabel(
  status: ReviewStatus,
) {
  switch (status) {
    case "PENDING":
      return "Очікує";

    case "APPROVED":
      return "Схвалено";

    case "REJECTED":
      return "Відхилено";
  }
}

function StatusBadge({
  status,
}: {
  status: ReviewStatus;
}) {
  const config = {
    PENDING: {
      icon: Clock3,
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-300",
    },

    APPROVED: {
      icon: CheckCircle2,
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    },

    REJECTED: {
      icon: XCircle,
      className:
        "border-red-500/20 bg-red-500/10 text-red-300",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
}

function Stars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [counts, setCounts] =
    useState<ApiResponse["counts"]>({
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    });

  const [filter, setFilter] =
    useState<StatusFilter>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const loadReviews =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(page),
        );

        params.set(
          "limit",
          "50",
        );

        params.set(
          "status",
          filter,
        );

        const response =
          await fetch(
            `/api/reviews?${params.toString()}`,
            {
              credentials: "include",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as
            | ApiResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in data &&
            data.error
              ? data.error
              : "Не вдалося завантажити відгуки",
          );
        }

        const result =
          data as ApiResponse;

        setReviews(
          result.reviews,
        );

        setCounts(
          result.counts,
        );

        setTotalPages(
          result.pagination.totalPages,
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося завантажити відгуки",
        );
      } finally {
        setLoading(false);
      }
    }, [filter, page]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const changeFilter = (
    next: StatusFilter,
  ) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-[1600px] p-6">
        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <MessageSquare className="h-4 w-4" />
              Модерація
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Відгуки
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Перегляд та модерація відгуків
              покупців.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadReviews()
            }
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Оновити
          </button>
        </div>

        {/* COUNTS */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() =>
              changeFilter("ALL")
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Всього
              </span>

              <MessageSquare className="h-5 w-5 text-zinc-500" />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {counts.total}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              changeFilter("PENDING")
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-amber-500/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Очікують
              </span>

              <Clock3 className="h-5 w-5 text-amber-400" />
            </div>

            <div className="mt-3 text-3xl font-bold text-amber-300">
              {counts.pending}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              changeFilter("APPROVED")
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-emerald-500/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Схвалені
              </span>

              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

            <div className="mt-3 text-3xl font-bold text-emerald-300">
              {counts.approved}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              changeFilter("REJECTED")
            }
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-red-500/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Відхилені
              </span>

              <XCircle className="h-5 w-5 text-red-400" />
            </div>

            <div className="mt-3 text-3xl font-bold text-red-300">
              {counts.rejected}
            </div>
          </button>
        </div>

        {/* FILTER */}

        <div className="mb-5 flex flex-wrap gap-2">
          {STATUS_FILTERS.map(
            (item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  changeFilter(
                    item.value,
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  filter ===
                  item.value
                    ? "bg-amber-400 text-black"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ),
          )}
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          reviews.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-center">
              <MessageSquare className="mb-4 h-10 w-10 text-zinc-700" />

              <h2 className="text-lg font-semibold">
                Відгуків немає
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                За вибраним фільтром
                відгуки не знайдені.
              </p>
            </div>
          )}

        {/* REVIEWS */}

        {!loading &&
          reviews.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
              <div className="divide-y divide-zinc-800">
                {reviews.map(
                  (review) => (
                    <Link
                      key={`${review.type}-${review.id}`}
                      href={`/admin/reviews/${review.id}?type=${review.type}`}
                      className="group block p-5 transition hover:bg-zinc-800/40"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                            {review.type ===
                            "PRODUCT" ? (
                              <Package className="h-5 w-5 text-zinc-400" />
                            ) : (
                              <Store className="h-5 w-5 text-zinc-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                {review.type ===
                                "PRODUCT"
                                  ? "Товар"
                                  : "Магазин"}
                              </span>

                              <StatusBadge
                                status={
                                  review.status
                                }
                              />
                            </div>

                            <h3 className="truncate font-semibold text-white">
                              {review.targetName}
                            </h3>

                            {review.title && (
                              <p className="mt-1 font-medium text-zinc-300">
                                {review.title}
                              </p>
                            )}

                            {review.comment && (
                              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                                {review.comment}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                              <span>
                                {review.user
                                  .name ??
                                  "Користувач"}
                              </span>

                              <span>
                                {review.user
                                  .email ??
                                  "—"}
                              </span>

                              <span>
                                {formatDate(
                                  review.createdAt,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-6 xl:justify-end">
                          <div>
                            <Stars
                              rating={
                                review.rating
                              }
                            />

                            <div className="mt-1 text-xs text-zinc-500">
                              {review.rating}/5
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-zinc-300" />
                        </div>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            </div>
          )}

        {/* PAGINATION */}

        {!loading &&
          totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <span className="text-sm text-zinc-500">
                Сторінка{" "}
                <span className="text-white">
                  {page}
                </span>{" "}
                з{" "}
                <span className="text-white">
                  {totalPages}
                </span>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (value) =>
                        Math.max(
                          1,
                          value - 1,
                        ),
                    )
                  }
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-sm disabled:opacity-30"
                >
                  Назад
                </button>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage(
                      (value) =>
                        Math.min(
                          totalPages,
                          value + 1,
                        ),
                    )
                  }
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-sm disabled:opacity-30"
                >
                  Далі
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}