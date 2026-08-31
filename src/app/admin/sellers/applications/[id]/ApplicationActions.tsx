"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

type ApplicationActionsProps = {
  applicationId: string;
  status: string;
};

type ModalType = "approve" | "reject" | null;

export default function ApplicationActions({
  applicationId,
  status,
}: ApplicationActionsProps) {
  const router = useRouter();

  const [modal, setModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(
    type: "success" | "error",
    message: string
  ) {
    setToast({
      type,
      message,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  function closeModal() {
    if (loading) return;

    setModal(null);
    setRejectReason("");
  }

  async function approveApplication() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/sellers/applications/${applicationId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Не вдалося схвалити заявку"
        );
      }

      setModal(null);

      showToast(
        "success",
        "Заявку успішно схвалено. Продавця активовано."
      );

      window.setTimeout(() => {
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(
        "APPROVE APPLICATION ERROR:",
        error
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Сталася помилка під час схвалення заявки"
      );
    } finally {
      setLoading(false);
    }
  }

  async function rejectApplication() {
    if (loading) return;

    const reason = rejectReason.trim();

    if (!reason) {
      showToast(
        "error",
        "Вкажіть причину відхилення заявки"
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/sellers/applications/${applicationId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            adminNote: reason,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Не вдалося відхилити заявку"
        );
      }

      setModal(null);
      setRejectReason("");

      showToast(
        "success",
        "Заявку відхилено."
      );

      window.setTimeout(() => {
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(
        "REJECT APPLICATION ERROR:",
        error
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Сталася помилка під час відхилення заявки"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Для вже завершених заявок кнопки
   * не показуємо.
   */
  if (
    status === "APPROVED" ||
    status === "REJECTED"
  ) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Дія адміністратора
        </div>

        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-4 ${
            status === "APPROVED"
              ? "border-emerald-400/10 bg-emerald-400/[0.04]"
              : "border-red-400/10 bg-red-400/[0.04]"
          }`}
        >
          {status === "APPROVED" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-red-400" />
          )}

          <div>
            <div className="text-sm font-bold text-white">
              {status === "APPROVED"
                ? "Заявку вже схвалено"
                : "Заявку вже відхилено"}
            </div>

            <div className="mt-1 text-xs text-zinc-600">
              Повторна зміна статусу недоступна.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ACTION CARD */}

      <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
        <div className="mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            Дії адміністратора
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Після схвалення користувач отримає статус
            продавця та зможе працювати з магазином.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setModal("approve")}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Схвалити
          </button>

          <button
            type="button"
            onClick={() => setModal("reject")}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 text-sm font-black text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Відхилити
          </button>
        </div>
      </section>

      {/* TOAST */}

      {toast && (
        <div className="fixed right-4 top-4 z-[100] w-[min(420px,calc(100vw-2rem))]">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-400/20 bg-[#0b1712]/95"
                : "border-red-400/20 bg-[#170b0b]/95"
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                toast.type === "success"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-black ${
                  toast.type === "success"
                    ? "text-emerald-300"
                    : "text-red-300"
                }`}
              >
                {toast.type === "success"
                  ? "Готово"
                  : "Помилка"}
              </div>

              <div className="mt-1 text-xs leading-5 text-zinc-400">
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-zinc-600 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* BACKDROP */}

      {modal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loading
            ) {
              closeModal();
            }
          }}
        >
          {/* MODAL */}

          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0b0f16] shadow-2xl shadow-black/50">
            {modal === "approve" ? (
              <>
                <div className="border-b border-white/[0.07] px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white">
                        Схвалити заявку?
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        Після підтвердження заявка буде
                        схвалена, а продавця буде активовано.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-4 py-3">
                    <div className="text-xs font-bold text-emerald-300">
                      Що станеться:
                    </div>

                    <ul className="mt-2 space-y-1.5 text-xs text-zinc-500">
                      <li>
                        • статус заявки → Схвалена
                      </li>

                      <li>
                        • продавець отримає доступ до
                        функцій продавця
                      </li>

                      <li>
                        • статус магазину буде оновлено
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-white/[0.07] px-6 py-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="h-11 flex-1 rounded-xl border border-white/[0.07] bg-white/[0.02] text-sm font-bold text-zinc-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                  >
                    Скасувати
                  </button>

                  <button
                    type="button"
                    onClick={approveApplication}
                    disabled={loading}
                    className="h-11 flex-1 rounded-xl bg-emerald-400 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Обробка...
                      </span>
                    ) : (
                      "Так, схвалити"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-white/[0.07] px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-400">
                      <XCircle className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white">
                        Відхилити заявку?
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        Вкажіть причину, яка буде збережена
                        в адміністративній примітці.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <label className="mb-2 block text-xs font-bold text-zinc-400">
                    Причина відхилення
                  </label>

                  <textarea
                    value={rejectReason}
                    onChange={(event) =>
                      setRejectReason(event.target.value)
                    }
                    disabled={loading}
                    rows={4}
                    maxLength={1000}
                    placeholder="Наприклад: недостатньо інформації про бізнес..."
                    className="w-full resize-none rounded-xl border border-white/[0.07] bg-[#070a10] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-red-400/30 disabled:opacity-50"
                  />

                  <div className="mt-2 text-right text-[10px] text-zinc-700">
                    {rejectReason.length}/1000
                  </div>
                </div>

                <div className="flex gap-2 border-t border-white/[0.07] px-6 py-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="h-11 flex-1 rounded-xl border border-white/[0.07] bg-white/[0.02] text-sm font-bold text-zinc-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                  >
                    Скасувати
                  </button>

                  <button
                    type="button"
                    onClick={rejectApplication}
                    disabled={loading}
                    className="h-11 flex-1 rounded-xl bg-red-400 text-sm font-black text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Обробка...
                      </span>
                    ) : (
                      "Відхилити заявку"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}