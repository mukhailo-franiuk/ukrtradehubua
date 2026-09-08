
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  MailCheck,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 30;

type ApiResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showVerificationPanel, setShowVerificationPanel] =
    useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function getApiMessage(
    data: unknown,
    fallback: string
  ): string {
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      return data.error;
    }

    return fallback;
  }

  async function handleResendVerification() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setResendMessage("Введіть email.");
      return;
    }

    if (resendLoading || resendCooldown > 0) return;

    setResendLoading(true);
    setResendMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/auth/resend-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let data: unknown = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        setResendMessage(
          getApiMessage(
            data,
            "Не вдалося повторно надіслати лист."
          )
        );
        return;
      }

      setResendMessage(
        getApiMessage(
          data,
          "Новий лист підтвердження надіслано на вашу електронну адресу."
        )
      );

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setResendMessage(
        "Не вдалося надіслати лист. Перевірте підключення до інтернету."
      );
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setResendMessage("");

    if (!email.trim()) {
      setError("Введіть email.");
      return;
    }

    if (!password) {
      setError("Введіть пароль.");
      return;
    }

    try {
      setIsLoading(true);

      const normalizedEmail =
        email.trim().toLowerCase();

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data: ApiResponse | null = null;

      if (contentType.includes("application/json")) {
        data = (await response.json()) as ApiResponse;
      }

      if (!response.ok) {
        if (data?.code === "EMAIL_NOT_VERIFIED") {
          setEmail(normalizedEmail);
          setShowVerificationPanel(true);
          setError("");

          setResendMessage(
            data.message ||
              "Спочатку підтвердьте вашу електронну адресу."
          );

          return;
        }

        setError(
          getApiMessage(
            data,
            "Невірний email або пароль."
          )
        );

        return;
      }

      window.location.href = "/";
    } catch {
      setError(
        "Не вдалося виконати вхід. Перевірте підключення до інтернету."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function backToLogin() {
    setShowVerificationPanel(false);
    setError("");
    setResendMessage("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b11] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-400/[0.10] blur-[140px]" />
        <div className="absolute bottom-[-180px] left-[-150px] h-[400px] w-[400px] rounded-full bg-orange-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-150px] h-[420px] w-[420px] rounded-full bg-amber-400/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            На головну
          </Link>

          <Link
            href="/"
            className="text-lg font-black tracking-tight"
          >
            Ukr<span className="text-amber-400">Trade</span>Hub
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0f17]/80 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative hidden overflow-hidden border-r border-white/[0.06] bg-white/[0.02] p-10 lg:block">
              <div className="absolute left-[-100px] top-[-100px] h-64 w-64 rounded-full bg-amber-400/[0.08] blur-3xl" />

              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <div className="mt-8">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    UkrTradeHub
                  </div>

                  <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
                    Ласкаво просимо
                    <span className="block text-zinc-500">
                      назад.
                    </span>
                  </h1>

                  <p className="mt-5 text-sm leading-7 text-zinc-500">
                    Увійдіть у свій акаунт, щоб керувати
                    замовленнями, улюбленими товарами та
                    всіма можливостями UkrTradeHub.
                  </p>
                </div>

                <div className="mt-10 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    Керуйте своїми замовленнями
                  </div>

                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                      <Store className="h-4 w-4" />
                    </div>
                    Купуйте у перевірених продавців
                  </div>

                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    Захищені покупки
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <div className="max-w-xl">
                {!showVerificationPanel ? (
                  <>
                    <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                      Вхід
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-zinc-500">
                      Введіть свої дані для входу в акаунт.
                    </p>

                    {error && (
                      <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm leading-6 text-red-300">
                        {error}
                      </div>
                    )}

                    <form
                      onSubmit={handleSubmit}
                      className="mt-8 space-y-5"
                    >
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-2 block text-sm font-bold"
                        >
                          Email
                        </label>

                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                          <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) =>
                              setEmail(event.target.value)
                            }
                            placeholder="you@example.com"
                            disabled={isLoading}
                            className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label
                            htmlFor="password"
                            className="text-sm font-bold"
                          >
                            Пароль
                          </label>

                          <Link
                            href="/forgot-password"
                            className="text-xs font-bold text-amber-400 hover:text-amber-300"
                          >
                            Забули пароль?
                          </Link>
                        </div>

                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                          <input
                            id="password"
                            type={
                              showPassword
                                ? "text"
                                : "password"
                            }
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                            placeholder="Введіть пароль"
                            disabled={isLoading}
                            className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-11 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((current) => !current)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                            aria-label={
                              showPassword
                                ? "Сховати пароль"
                                : "Показати пароль"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Виконуємо вхід...
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4" />
                            Увійти в акаунт
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-8 border-t border-white/[0.06] pt-7 text-center">
                      <p className="text-sm text-zinc-500">
                        Ще не маєте акаунта?
                      </p>

                      <Link
                        href="/register"
                        className="mt-3 inline-flex text-sm font-bold text-amber-400 hover:text-amber-300"
                      >
                        Створити акаунт
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[520px] flex-col justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-black">
                      <MailCheck className="h-8 w-8" />
                    </div>

                    <h2 className="mt-7 text-3xl font-black tracking-tight sm:text-4xl">
                      Підтвердьте email
                    </h2>

                    <p className="mt-4 text-sm leading-7 text-zinc-500">
                      Для входу в акаунт потрібно підтвердити
                      вашу електронну адресу.
                    </p>

                    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                      <div className="flex items-start gap-4">
                        <Mail className="mt-1 h-5 w-5 shrink-0 text-amber-400" />

                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                            Email
                          </div>

                          <div className="mt-1 break-all text-sm font-bold">
                            {email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-amber-400/10 bg-amber-400/[0.04] px-4 py-4">
                      <p className="text-sm leading-6 text-zinc-400">
                        Відкрийте лист від UkrTradeHub та
                        натисніть посилання для підтвердження
                        email.
                      </p>
                    </div>

                    {resendMessage && (
                      <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm leading-6 text-emerald-300">
                        {resendMessage}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={
                        resendLoading || resendCooldown > 0
                      }
                      className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-6 py-3.5 text-sm font-black text-amber-400 transition hover:bg-amber-400/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resendLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Надсилаємо лист...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <Mail className="h-4 w-4" />
                          Повторно через {resendCooldown} с
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Надіслати лист повторно
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={backToLogin}
                      className="mt-4 text-sm font-bold text-zinc-500 hover:text-white"
                    >
                      Повернутися до входу
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 text-center text-xs text-zinc-700">
          © {new Date().getFullYear()} UkrTradeHub. Український маркетплейс.
        </div>
      </div>
    </main>
  );
}