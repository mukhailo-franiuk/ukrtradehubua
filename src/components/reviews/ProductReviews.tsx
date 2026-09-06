
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  Star,
  User,
  X,
} from "lucide-react";

type ReviewUser = {
  id: string;
  name: string | null;
};

type ProductReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: ReviewUser;
};

type ReviewSummary = {
  average: number;
  total: number;
  distribution: Record<number, number>;
};

type ProductReviewsResponse = {
  product: {
    id: string;
    title: string;
    rating: number;
    reviewsCount: number;
  };
  summary: ReviewSummary;
  reviews: ProductReviewItem[];
};

type EligibleOrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productTitle: string;
  sku: string | null;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
  };
  shop: {
    id: string;
    name: string;
    slug: string;
  };
  variant: {
    id: string;
    name: string | null;
    sku: string | null;
  } | null;
};

type EligibleResponse = {
  product: {
    id: string;
    title: string;
  };
  orderItems: EligibleOrderItem[];
};

type Props = {
  productId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function StarRating({
  value,
  size = 18,
  interactive = false,
  onChange,
}: {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const rating = index + 1;
        const active = rating <= value;

        if (interactive) {
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange?.(rating)}
              className="rounded-md p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              aria-label={`Оцінити ${rating} з 5`}
            >
              <Star
                size={size}
                className={
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-600"
                }
              />
            </button>
          );
        }

        return (
          <Star
            key={rating}
            size={size}
            className={
              active
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-700"
            }
          />
        );
      })}
    </div>
  );
}

export default function ProductReviews({ productId }: Props) {
  const [data, setData] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [eligibleItems, setEligibleItems] = useState<EligibleOrderItem[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState("");

  const [selectedOrderItemId, setSelectedOrderItemId] = useState("");

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/reviews/products/${productId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Не вдалося завантажити відгуки"
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося завантажити відгуки"
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const loadEligibleItems = async () => {
    try {
      setEligibleLoading(true);
      setEligibleError("");

      const response = await fetch(
        `/api/reviews/products/${productId}/eligible-order-items`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result: EligibleResponse & { error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Не вдалося перевірити покупки"
        );
      }

      setEligibleItems(result.orderItems || []);

      if (!result.orderItems?.length) {
        setEligibleError(
          "У вас немає покупок цього товару, для яких ще можна залишити відгук."
        );
      }
    } catch (err) {
      setEligibleError(
        err instanceof Error
          ? err.message
          : "Не вдалося перевірити покупки"
      );
    } finally {
      setEligibleLoading(false);
    }
  };

  const openReviewModal = async () => {
    setShowModal(true);
    setSubmitError("");
    setSubmitSuccess(false);

    await loadEligibleItems();
  };

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    setSelectedOrderItemId("");
    setRating(0);
    setTitle("");
    setComment("");
    setSubmitError("");
    setEligibleError("");
    setSubmitSuccess(false);
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError("");

    if (!selectedOrderItemId) {
      setSubmitError("Оберіть покупку.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setSubmitError("Оберіть оцінку від 1 до 5 зірок.");
      return;
    }

    if (title.length > 200) {
      setSubmitError("Заголовок не може перевищувати 200 символів.");
      return;
    }

    if (comment.length > 5000) {
      setSubmitError("Коментар не може перевищувати 5000 символів.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/reviews/products/${productId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderItemId: selectedOrderItemId,
            rating,
            title: title.trim() || undefined,
            comment: comment.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Не вдалося відправити відгук"
        );
      }

      setSubmitSuccess(true);

      setTimeout(() => {
        closeModal();
        loadReviews();
      }, 1400);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Не вдалося відправити відгук"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const distribution = useMemo(() => {
    const result = data?.summary?.distribution || {};

    return [5, 4, 3, 2, 1].map((ratingValue) => ({
      rating: ratingValue,
      count: Number(result[ratingValue] || 0),
    }));
  }, [data]);

  if (loading) {
    return (
      <section className="mt-10 rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <Loader2 className="mr-3 animate-spin" size={22} />
          Завантаження відгуків...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 text-red-300">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Спробувати ще раз
        </button>
      </section>
    );
  }

  if (!data) return null;

  const average = Number(data.summary.average || 0);
  const total = Number(data.summary.total || 0);

  return (
    <>
      <section className="mt-10 rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/20 sm:p-7">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <MessageSquare
                size={22}
                className="text-amber-400"
              />

              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Відгуки покупців
              </h2>
            </div>

            <p className="text-sm text-zinc-500">
              Реальні відгуки покупців цього товару
            </p>
          </div>

          <button
            type="button"
            onClick={openReviewModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 active:scale-[0.98]"
          >
            <MessageSquare size={17} />
            Залишити відгук
          </button>
        </div>

        {/* Summary */}
        <div className="grid gap-8 border-b border-white/10 py-7 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="text-5xl font-black tracking-tight text-white">
              {average.toFixed(1)}
            </div>

            <div className="mt-3">
              <StarRating value={Math.round(average)} size={21} />
            </div>

            <div className="mt-3 text-sm text-zinc-500">
              {total}{" "}
              {total === 1
                ? "відгук"
                : total >= 2 && total <= 4
                  ? "відгуки"
                  : "відгуків"}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3">
            {distribution.map((item) => {
              const percentage =
                total > 0
                  ? Math.round((item.count / total) * 100)
                  : 0;

              return (
                <div
                  key={item.rating}
                  className="flex items-center gap-3"
                >
                  <div className="flex w-12 shrink-0 items-center gap-1 text-sm text-zinc-400">
                    <span>{item.rating}</span>
                    <Star
                      size={13}
                      className="fill-amber-400 text-amber-400"
                    />
                  </div>

                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <div className="w-12 text-right text-xs text-zinc-500">
                    {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews */}
        {data.reviews.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-500">
              <MessageSquare size={25} />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">
              Поки що немає відгуків
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Будьте першим, хто поділиться своєю думкою.
            </p>

            <button
              type="button"
              onClick={openReviewModal}
              className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/15"
            >
              Написати перший відгук
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {data.reviews.map((review) => (
              <article
                key={review.id}
                className="py-6 first:pt-7 last:pb-2"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400">
                    <User size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-white">
                          {review.user.name || "Покупець"}
                        </div>

                        <div className="mt-1">
                          <StarRating
                            value={review.rating}
                            size={15}
                          />
                        </div>
                      </div>

                      <time className="text-xs text-zinc-600">
                        {formatDate(review.createdAt)}
                      </time>
                    </div>

                    {review.title && (
                      <h3 className="mt-4 font-semibold text-zinc-100">
                        {review.title}
                      </h3>
                    )}

                    {review.comment && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Review modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Залишити відгук
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  Поділіться своїм досвідом покупки
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                aria-label="Закрити"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {eligibleLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2
                    size={28}
                    className="animate-spin text-amber-400"
                  />

                  <p className="mt-4 text-sm text-zinc-400">
                    Перевіряємо ваші покупки...
                  </p>
                </div>
              ) : eligibleError ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />

                    <div>
                      <h3 className="font-semibold text-white">
                        Відгук недоступний
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        {eligibleError}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-5 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Закрити
                  </button>
                </div>
              ) : submitSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
                    <CheckCircle2
                      size={34}
                      className="text-emerald-400"
                    />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-white">
                    Дякуємо за відгук!
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    Відгук відправлено на модерацію. Після схвалення
                    адміністрацією він з'явиться на сторінці товару.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={submitReview}
                  className="space-y-6"
                >
                  {/* Purchase */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white">
                      Ваша покупка
                    </label>

                    <select
                      value={selectedOrderItemId}
                      onChange={(event) =>
                        setSelectedOrderItemId(event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
                      required
                    >
                      <option value="" className="bg-zinc-900">
                        Оберіть покупку
                      </option>

                      {eligibleItems.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          className="bg-zinc-900"
                        >
                          Замовлення #{item.order.orderNumber}
                          {" • "}
                          {formatDate(item.order.createdAt)}
                          {" • "}
                          {item.quantity} шт.
                        </option>
                      ))}
                    </select>

                    {selectedOrderItemId && (
                      <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 text-xs text-zinc-500">
                        {eligibleItems.find(
                          (item) =>
                            item.id === selectedOrderItemId
                        )?.productTitle ||
                          data.product.title}

                        {eligibleItems.find(
                          (item) =>
                            item.id === selectedOrderItemId
                        )?.variant?.name && (
                          <>
                            {" • "}
                            {
                              eligibleItems.find(
                                (item) =>
                                  item.id ===
                                  selectedOrderItemId
                              )?.variant?.name
                            }
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-white">
                      Ваша оцінка
                    </label>

                    <div className="flex items-center gap-2">
                      <StarRating
                        value={rating}
                        size={29}
                        interactive
                        onChange={setRating}
                      />

                      <span className="ml-2 min-w-[70px] text-sm text-zinc-500">
                        {rating === 0
                          ? "Оберіть"
                          : `${rating} з 5`}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="review-title"
                        className="text-sm font-semibold text-white"
                      >
                        Заголовок
                      </label>

                      <span className="text-xs text-zinc-600">
                        {title.length}/200
                      </span>
                    </div>

                    <input
                      id="review-title"
                      type="text"
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value)
                      }
                      maxLength={200}
                      placeholder="Коротко про ваш досвід"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="review-comment"
                        className="text-sm font-semibold text-white"
                      >
                        Ваш відгук
                      </label>

                      <span className="text-xs text-zinc-600">
                        {comment.length}/5000
                      </span>
                    </div>

                    <textarea
                      id="review-comment"
                      value={comment}
                      onChange={(event) =>
                        setComment(event.target.value)
                      }
                      maxLength={5000}
                      rows={6}
                      placeholder="Розкажіть про якість товару, доставку та ваші враження..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white placeholder:text-zinc-600 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
                    />
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                      />

                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      Скасувати
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || rating === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                          Відправлення...
                        </>
                      ) : (
                        <>
                          <Send size={17} />
                          Відправити відгук
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-xs leading-5 text-zinc-600">
                    Відгуки проходять модерацію перед публікацією.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}