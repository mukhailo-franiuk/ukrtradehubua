"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  Package,
  Star,
  Store,
  XCircle,
} from "lucide-react";

type ReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type ReviewType =
  | "PRODUCT"
  | "SHOP";

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

  user: {
    id: string;
    name: string | null;
    email: string | null;
  };

  product: {
    id: string;
    title: string;
    slug: string;
    rating: unknown;
    reviewsCount: number;
  } | null;

  shop: {
    id: string;
    name: string;
    slug: string;
    rating: unknown;
    reviewsCount: number;
  } | null;
};

type ApiResponse = {
  reviews: Review[];
};

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function statusLabel(
  status: ReviewStatus,
) {
  switch (status) {
    case "PENDING":
      return "Очікує модерації";

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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${config.className}`}
    >
      <Icon className="h-4 w-4" />
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
    <div className="flex gap-1">
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <Star
          key={index}
          className={`h-6 w-6 ${
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminReviewDetailsPage() {
  const params = useParams();
  const searchParams =
    useSearchParams();

  const id =
    typeof params.id === "string"
      ? params.id
      : "";

  const type =
    searchParams.get("type");

  const [review, setReview] =
    useState<Review | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/reviews?page=1&limit=100&status=ALL",
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
              : "Не вдалося завантажити відгук",
          );
        }

        const result =
          data as ApiResponse;

        const found =
          result.reviews.find(
            (item) =>
              item.id === id &&
              (!type ||
                item.type === type),
          ) ?? null;

        if (!found) {
          throw new Error(
            "Відгук не знайдено",
          );
        }

        if (!cancelled) {
          setReview(found);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося завантажити відгук",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [id, type]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="flex min-h-[500px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-4xl p-6">
          <Link
            href="/admin/reviews"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до відгуків
          </Link>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex items-center gap-3 text-red-300">
              <AlertCircle className="h-5 w-5" />
              <span>
                {error ??
                  "Відгук не знайдено"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isProduct =
    review.type === "PRODUCT";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl p-6">
        {/* BACK */}

        <Link
          href="/admin/reviews"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до відгуків
        </Link>

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
              {isProduct ? (
                <Package className="h-4 w-4" />
              ) : (
                <Store className="h-4 w-4" />
              )}

              {isProduct
                ? "Відгук на товар"
                : "Відгук на магазин"}
            </div>

            <h1 className="text-3xl font-bold">
              {review.targetName}
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              ID відгуку: {review.id}
            </p>
          </div>

          <StatusBadge
            status={review.status}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* REVIEW */}

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Відгук
                </h2>

                <Stars
                  rating={review.rating}
                />
              </div>

              {review.title && (
                <h3 className="mb-3 text-xl font-semibold">
                  {review.title}
                </h3>
              )}

              {review.comment ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm leading-7 text-zinc-300">
                  {review.comment}
                </div>
              ) : (
                <div className="text-sm text-zinc-600">
                  Коментар відсутній.
                </div>
              )}

              <div className="mt-6 border-t border-zinc-800 pt-5 text-sm text-zinc-500">
                Створено:{" "}
                <span className="text-zinc-300">
                  {formatDate(
                    review.createdAt,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* USER */}

          <div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
                  <MessageSquare className="h-5 w-5 text-zinc-400" />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Автор
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Покупець
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-zinc-500">
                    Ім'я
                  </div>

                  <div className="mt-1 text-zinc-200">
                    {review.user.name ??
                      "Не вказано"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500">
                    Email
                  </div>

                  <div className="mt-1 break-all text-zinc-200">
                    {review.user.email ??
                      "Не вказано"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500">
                    User ID
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-zinc-500">
                    {review.user.id}
                  </div>
                </div>
              </div>
            </div>

            {/* TARGET */}

            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 font-semibold">
                Об'єкт відгуку
              </h2>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
                  {isProduct ? (
                    <Package className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <Store className="h-5 w-5 text-zinc-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {review.targetName}
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">
                    {isProduct
                      ? "Товар"
                      : "Магазин"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODERATION NOTICE */}

        {review.status ===
          "PENDING" && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <div className="font-semibold">
                Відгук очікує модерації
              </div>

              <div className="mt-1 text-amber-200/70">
                Для зміни статусу потрібен
                окремий admin moderation API.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}