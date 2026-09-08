
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [token, setToken] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setToken(
      params.get("token")?.trim() || ""
    );
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "Посилання для відновлення пароля недійсне або неповне."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Пароль повинен містити щонайменше 8 символів."
      );
      return;
    }

    if (password.length > 128) {
      setError(
        "Пароль не може містити більше 128 символів."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Паролі не збігаються."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Не вдалося змінити пароль."
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося змінити пароль."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
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

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl sm:p-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>

              <h1 className="text-2xl font-black">
                Пароль змінено
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/50">
                Ваш пароль успішно оновлено.
                Усі попередні сесії завершено.
                Тепер увійдіть із новим паролем.
              </p>

              <Link
                href="/login"
                className="mt-7 flex w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-amber-300"
              >
                Увійти в акаунт
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
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
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10">
                  <KeyRound className="h-6 w-6 text-amber-400" />
                </div>

                <h1 className="text-2xl font-black">
                  Новий пароль
                </h1>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  Створіть новий надійний пароль
                  для вашого акаунта.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/70">
                    Новий пароль
                  </label>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Мінімум 8 символів"
                      autoComplete="new-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-12 text-sm outline-none transition placeholder:text-white/25 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/30 transition hover:text-white"
                      aria-label={
                        showPassword
                          ? "Приховати пароль"
                          : "Показати пароль"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/70">
                    Повторіть пароль
                  </label>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Повторіть новий пароль"
                      autoComplete="new-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-12 text-sm outline-none transition placeholder:text-white/25 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/30 transition hover:text-white"
                      aria-label={
                        showConfirmPassword
                          ? "Приховати пароль"
                          : "Показати пароль"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                  <p className="text-xs leading-5 text-white/40">
                    Після зміни пароля всі попередні
                    сесії на інших пристроях будуть
                    завершені.
                  </p>
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
                      Змінюємо пароль...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-5 w-5" />
                      Змінити пароль
                    </>
                  )}
                </button>
              </form>
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
        </div>
      </div>
    </main>
  );
}