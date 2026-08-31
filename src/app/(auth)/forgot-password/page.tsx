
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Введіть email.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data: unknown = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Не вдалося надіслати запит. Спробуйте ще раз.";

        setError(message);
        return;
      }

      setSuccess(
        "Якщо акаунт із таким email існує, ми надішлемо інструкції для відновлення пароля."
      );
    } catch {
      setError(
        "Не вдалося надіслати запит. Перевірте підключення до інтернету."
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
            Ukr<span className="text-amber-400">Trade</span>Hub
          </Link>
        </div>

        {/* CONTENT */}

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0f17]/80 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[0.85fr_1.15fr]">
            {/* LEFT SIDE */}

            <div className="relative hidden overflow-hidden border-r border-white/[0.06] bg-white/[0.02] p-10 lg:block">
              <div className="absolute left-[-100px] top-[-100px] h-64 w-64 rounded-full bg-amber-400/[0.08] blur-3xl" />

              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-400/10">
                  <KeyRound className="h-7 w-7" />
                </div>

                <div className="mt-8">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    Відновлення доступу
                  </div>

                  <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
                    Забули пароль?
                    <span className="block text-zinc-500">
                      Це можна виправити.
                    </span>
                  </h1>

                  <p className="mt-5 text-sm leading-7 text-zinc-500">
                    Вкажіть email, який використовується для вашого
                    акаунта UkrTradeHub. Ми надішлемо інструкції
                    для відновлення доступу.
                  </p>
                </div>

                <div className="mt-10 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                      <Mail className="h-4 w-4" />
                    </div>

                    <span>
                      Введіть email акаунта
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                      <Send className="h-4 w-4" />
                    </div>

                    <span>
                      Отримайте посилання для відновлення
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>

                    <span>
                      Встановіть новий пароль
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM */}

            <div className="p-6 sm:p-10">
              <div className="max-w-xl">
                <div className="lg:hidden">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    Відновлення доступу
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 lg:hidden">
                  <KeyRound className="h-6 w-6" />
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                  Відновити пароль
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Введіть email вашого акаунта. Якщо він зареєстрований
                  у системі, ми надішлемо інструкції для відновлення пароля.
                </p>

                {/* ERROR */}

                {error && (
                  <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {/* SUCCESS */}

                {success && (
                  <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-5">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                      <div>
                        <p className="text-sm font-bold text-emerald-300">
                          Запит на відновлення прийнято
                        </p>

                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {success}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM */}

                {!success && (
                  <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-6"
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
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) =>
                            setEmail(event.target.value)
                          }
                          placeholder="you@example.com"
                          disabled={isLoading}
                          className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Надсилаємо...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Надіслати інструкції
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* BACK TO LOGIN */}

                <div className="mt-8 border-t border-white/[0.06] pt-7 text-center">
                  <p className="text-sm text-zinc-500">
                    Згадали пароль?
                  </p>

                  <Link
                    href="/login"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-400 transition hover:text-amber-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Повернутися до входу
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="pt-4 text-center text-xs text-zinc-700">
          © {new Date().getFullYear()} UkrTradeHub. Український маркетплейс.
        </div>
      </div>
    </main>
  );
}