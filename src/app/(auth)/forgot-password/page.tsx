
"use client";

import {
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Введіть адресу електронної пошти."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Не вдалося обробити запит."
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося обробити запит."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
                U
              </div>

              <span className="text-2xl font-black tracking-tight">
                Ukr
                <span className="text-amber-400">
                  Trade
                </span>
                Hub
              </span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="p-7 sm:p-9">
              {!success ? (
                <>
                  <div className="mb-7">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10">
                      <ShieldCheck className="h-6 w-6 text-amber-400" />
                    </div>

                    <h1 className="text-2xl font-black">
                      Відновлення пароля
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Введіть email, який
                      використовували під час
                      реєстрації. Ми надішлемо
                      посилання для створення
                      нового пароля.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-white/70">
                        Email
                      </label>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                        <input
                          type="email"
                          value={email}
                          onChange={(event) =>
                            setEmail(
                              event.target.value
                            )
                          }
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={loading}
                          className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-white/25 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Надсилаємо...
                        </>
                      ) : (
                        <>
                          <Mail className="h-5 w-5" />
                          Надіслати посилання
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>

                  <h1 className="text-2xl font-black">
                    Перевірте email
                  </h1>

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    Якщо акаунт з цією адресою
                    існує, ми надіслали
                    інструкції для відновлення
                    пароля.
                  </p>

                  <p className="mt-4 text-xs leading-5 text-white/30">
                    Якщо лист не прийшов,
                    перевірте папку «Спам» або
                    зачекайте кілька хвилин.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-7 py-5 sm:px-9">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-white/60 transition hover:text-amber-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Повернутися до входу
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/25">
            © {new Date().getFullYear()} UkrTradeHub
          </p>
        </div>
      </div>
    </main>
  );
}