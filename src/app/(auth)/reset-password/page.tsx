
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
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const urlToken =
      params.get("token") || "";

    setToken(urlToken);
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "Посилання для відновлення пароля недійсне."
      );

      return;
    }

    if (password.length < 6) {
      setError(
        "Пароль повинен містити щонайменше 6 символів."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Паролі не співпадають."
      );

      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        "/api/auth/reset-password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data: unknown = null;

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data = await response.json();
      }

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Не вдалося змінити пароль.";

        setError(message);

        return;
      }

      const message =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
          ? data.message
          : "Пароль успішно змінено.";

      setSuccess(message);

      setTimeout(() => {
        window.location.href =
          "/login";
      }, 2000);
    } catch {
      setError(
        "Не вдалося змінити пароль. Перевірте підключення до інтернету."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b11] text-white">
      {/* BACKGROUND */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-400/[0.10] blur-[140px]" />

        <div className="absolute bottom-[-180px] left-[-150px] h-[400px] w-[400px] rounded-full bg-orange-500/[0.05] blur-[120px]" />

        <div className="absolute bottom-[-200px] right-[-150px] h-[420px] w-[420px] rounded-full bg-amber-400/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">

        {/* TOP */}

        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />

            Назад до входу
          </Link>

          <Link
            href="/"
            className="text-lg font-black tracking-tight"
          >
            Ukr
            <span className="text-amber-400">
              Trade
            </span>
            Hub
          </Link>
        </div>

        {/* CONTENT */}

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0f17]/80 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[0.85fr_1.15fr]">

            {/* LEFT */}

            <div className="relative hidden overflow-hidden border-r border-white/[0.06] bg-white/[0.02] p-10 lg:block">
              <div className="absolute left-[-100px] top-[-100px] h-64 w-64 rounded-full bg-amber-400/[0.08] blur-3xl" />

              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <KeyRound className="h-7 w-7" />
                </div>

                <div className="mt-8">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    Безпека акаунта
                  </div>

                  <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
                    Створіть новий
                    <span className="block text-zinc-500">
                      пароль.
                    </span>
                  </h1>

                  <p className="mt-5 text-sm leading-7 text-zinc-500">
                    Встановіть новий пароль для свого
                    акаунта UkrTradeHub.
                  </p>
                </div>

                <div className="mt-10 flex items-center gap-3 text-sm text-zinc-300">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  Ваші активні сесії буде завершено
                </div>
              </div>
            </div>

            {/* FORM */}

            <div className="p-6 sm:p-10">
              <div className="max-w-xl">

                <div className="lg:hidden">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    Безпека акаунта
                  </div>
                </div>

                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Новий пароль
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Створіть новий надійний пароль для вашого акаунта.
                </p>

                {!token && (
                  <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
                    Посилання для відновлення пароля недійсне.
                    Створіть новий запит на відновлення.
                  </div>
                )}

                {error && (
                  <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-5">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                      <div>
                        <p className="text-sm font-bold text-emerald-300">
                          Пароль змінено
                        </p>

                        <p className="mt-2 text-sm text-zinc-400">
                          {success}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!success && token && (
                  <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-5"
                  >

                    {/* PASSWORD */}

                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-bold"
                      >
                        Новий пароль
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
                            setPassword(
                              event.target.value
                            )
                          }
                          placeholder="Мінімум 6 символів"
                          disabled={isLoading}
                          className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (current) => !current
                            )
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

                    {/* CONFIRM PASSWORD */}

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
                          className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
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

                    {/* SUBMIT */}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Змінюємо пароль...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          Змінити пароль
                        </>
                      )}
                    </button>
                  </form>
                )}

                <div className="mt-8 border-t border-white/[0.06] pt-7 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300"
                  >
                    <ArrowLeft className="h-4 w-4" />

                    Повернутися до входу
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 text-center text-xs text-zinc-700">
          © {new Date().getFullYear()} UkrTradeHub
        </div>
      </div>
    </main>
  );
}

