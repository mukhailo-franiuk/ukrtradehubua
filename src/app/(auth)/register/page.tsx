
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 30;

type ApiResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
};

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);

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

    if (!name.trim()) {
      setError("Введіть ваше ім'я.");
      return;
    }

    if (!email.trim()) {
      setError("Введіть email.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Пароль повинен містити щонайменше 8 символів."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролі не співпадають.");
      return;
    }

    if (!acceptTerms) {
      setError(
        "Потрібно погодитися з умовами використання та політикою конфіденційності."
      );
      return;
    }

    try {
      setIsLoading(true);

      const normalizedEmail =
        email.trim().toLowerCase();

      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim() || undefined,
            password,
          }),
        }
      );

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
              "Акаунт вже існує, але email ще не підтверджено."
          );

          return;
        }

        setError(
          getApiMessage(
            data,
            "Не вдалося створити акаунт."
          )
        );

        return;
      }

      setEmail(normalizedEmail);
      setError("");
      setResendMessage("");
      setShowVerificationPanel(true);
    } catch {
      setError(
        "Сталася помилка під час реєстрації. Перевірте підключення до інтернету."
      );
    } finally {
      setIsLoading(false);
    }
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
                    Створіть акаунт
                    <span className="block text-zinc-500">
                      і відкрийте більше можливостей.
                    </span>
                  </h1>

                  <p className="mt-5 text-sm leading-7 text-zinc-500">
                    Купуйте товари, зберігайте улюблені
                    пропозиції, відстежуйте замовлення та
                    керуйте покупками в одному місці.
                  </p>
                </div>

                <div className="mt-10 space-y-4">
                  {[
                    "Швидке оформлення замовлень",
                    "Історія покупок в одному місці",
                    "Збережені товари та магазини",
                    "Безпечний особистий кабінет",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-zinc-300"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </div>

                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <div className="max-w-xl">
                {!showVerificationPanel ? (
                  <>
                    <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                      Реєстрація
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-zinc-500">
                      Створіть свій акаунт на UkrTradeHub.
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
                          htmlFor="name"
                          className="mb-2 block text-sm font-bold"
                        >
                          Ім'я
                        </label>

                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                          <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(event) =>
                              setName(event.target.value)
                            }
                            placeholder="Ваше ім'я"
                            disabled={isLoading}
                            className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                          />
                        </div>
                      </div>

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
                        <label
                          htmlFor="phone"
                          className="mb-2 block text-sm font-bold"
                        >
                          Телефон
                          <span className="ml-2 font-normal text-zinc-600">
                            необов'язково
                          </span>
                        </label>

                        <input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value)
                          }
                          placeholder="+380"
                          disabled={isLoading}
                          className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-bold"
                          >
                            Пароль
                          </label>

                          <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                            <input
                              id="password"
                              type={
                                showPassword
                                  ? "text"
                                  : "password"
                              }
                              autoComplete="new-password"
                              value={password}
                              onChange={(event) =>
                                setPassword(event.target.value)
                              }
                              placeholder="Мін. 8 символів"
                              disabled={isLoading}
                              className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-11 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowPassword((current) => !current)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="confirmPassword"
                            className="mb-2 block text-sm font-bold"
                          >
                            Повторіть пароль
                          </label>

                          <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                            <input
                              id="confirmPassword"
                              type={
                                showConfirmPassword
                                  ? "text"
                                  : "password"
                              }
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(event) =>
                                setConfirmPassword(
                                  event.target.value
                                )
                              }
                              placeholder="Повторіть пароль"
                              disabled={isLoading}
                              className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-11 text-sm outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(
                                  (current) => !current
                                )
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(event) =>
                            setAcceptTerms(
                              event.target.checked
                            )
                          }
                          disabled={isLoading}
                          className="mt-1 h-4 w-4 accent-amber-400"
                        />

                        <span className="text-xs leading-5 text-zinc-500">
                          Я погоджуюся з{" "}
                          <Link
                            href="/terms"
                            className="font-semibold text-zinc-300 hover:text-amber-400"
                          >
                            умовами використання
                          </Link>{" "}
                          та{" "}
                          <Link
                            href="/privacy"
                            className="font-semibold text-zinc-300 hover:text-amber-400"
                          >
                            політикою конфіденційності
                          </Link>
                          .
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Створюємо акаунт...
                          </>
                        ) : (
                          <>
                            <UserRound className="h-4 w-4" />
                            Створити акаунт
                          </>
                        )}
                      </button>
                    </form>

                    <p className="mt-7 text-center text-sm text-zinc-500">
                      Вже маєте акаунт?{" "}
                      <Link
                        href="/login"
                        className="font-bold text-amber-400 hover:text-amber-300"
                      >
                        Увійти
                      </Link>
                    </p>
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
                      Ми надіслали лист підтвердження на вашу
                      електронну адресу.
                    </p>

                    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                      <div className="flex items-start gap-4">
                        <Mail className="mt-1 h-5 w-5 shrink-0 text-amber-400" />

                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                            Лист надіслано на
                          </div>

                          <div className="mt-1 break-all text-sm font-bold">
                            {email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3 text-sm leading-6 text-zinc-500">
                      <div className="flex gap-3">
                        <span className="font-black text-amber-400">
                          01
                        </span>
                        <span>
                          Відкрийте вашу електронну пошту.
                        </span>
                      </div>

                      <div className="flex gap-3">
                        <span className="font-black text-amber-400">
                          02
                        </span>
                        <span>
                          Знайдіть лист від UkrTradeHub.
                        </span>
                      </div>

                      <div className="flex gap-3">
                        <span className="font-black text-amber-400">
                          03
                        </span>
                        <span>
                          Натисніть посилання підтвердження
                          email.
                        </span>
                      </div>
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

                    <Link
                      href="/login"
                      className="mt-4 flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-zinc-500 hover:text-white"
                    >
                      Повернутися до входу
                    </Link>

                    <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-zinc-600">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />

                      <span>
                        Якщо листа немає у вхідних, перевірте
                        папку «Спам» або «Небажана пошта».
                      </span>
                    </div>
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