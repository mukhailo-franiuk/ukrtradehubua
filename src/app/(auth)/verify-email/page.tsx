
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Mail,
} from "lucide-react";

type VerificationState =
  | "loading"
  | "success"
  | "already"
  | "expired"
  | "used"
  | "invalid"
  | "error";

export default function VerifyEmailPage() {
  const [state, setState] =
    useState<VerificationState>("loading");

  const [message, setMessage] = useState(
    "Перевіряємо ваше посилання..."
  );

  useEffect(() => {
    let mounted = true;

    async function verify() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const token = params.get("token")?.trim();

        if (!token) {
          if (!mounted) return;

          setState("invalid");
          setMessage(
            "Посилання підтвердження не містить токена."
          );

          return;
        }

        const response = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(
            token
          )}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!mounted) return;

        if (response.ok && data?.success) {
          if (
            data.code ===
            "EMAIL_ALREADY_VERIFIED"
          ) {
            setState("already");
            setMessage(
              "Ваш email вже був підтверджений."
            );
          } else {
            setState("success");
            setMessage(
              "Ваш email успішно підтверджено."
            );
          }

          return;
        }

        switch (data?.code) {
          case "EMAIL_VERIFICATION_EXPIRED":
            setState("expired");
            setMessage(
              "Термін дії посилання минув."
            );
            break;

          case "EMAIL_VERIFICATION_USED":
            setState("used");
            setMessage(
              "Це посилання вже було використано."
            );
            break;

          case "EMAIL_VERIFICATION_INVALID":
          case "TOKEN_REQUIRED":
            setState("invalid");
            setMessage(
              "Посилання підтвердження недійсне."
            );
            break;

          default:
            setState("error");
            setMessage(
              data?.message ||
                "Не вдалося підтвердити email."
            );
        }
      } catch (error) {
        console.error(
          "Verify email page error:",
          error
        );

        if (!mounted) return;

        setState("error");
        setMessage(
          "Не вдалося звʼязатися із сервером."
        );
      }
    }

    verify();

    return () => {
      mounted = false;
    };
  }, []);

  const isSuccess =
    state === "success" ||
    state === "already";

  const isLoading =
    state === "loading";

  return (
    <main className="min-h-screen bg-[#070a10] text-white">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* LOGO */}

          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-block text-3xl font-black tracking-tight"
            >
              <span className="text-white">
                Ukr
              </span>

              <span className="text-amber-400">
                Trade
              </span>

              <span className="text-white">
                Hub
              </span>
            </Link>

            <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-600">
              Marketplace Ukraine
            </p>
          </div>

          {/* CARD */}

          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d1119] shadow-2xl shadow-black/30">
            {/* TOP */}

            <div className="border-b border-white/[0.06] bg-gradient-to-b from-[#151c29] to-[#0d1119] px-6 py-10 text-center sm:px-10">
              {/* LOADING */}

              {isLoading && (
                <>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10">
                    <Loader2 className="h-9 w-9 animate-spin text-amber-400" />
                  </div>

                  <h1 className="mt-6 text-2xl font-black sm:text-3xl">
                    Підтверджуємо email
                  </h1>

                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    Зачекайте кілька секунд...
                  </p>
                </>
              )}

              {/* SUCCESS */}

              {isSuccess && (
                <>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/10">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  </div>

                  <h1 className="mt-6 text-2xl font-black sm:text-3xl">
                    {state === "already"
                      ? "Email вже підтверджено"
                      : "Email підтверджено!"}
                  </h1>

                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    {message}
                  </p>
                </>
              )}

              {/* ERROR */}

              {!isLoading &&
                !isSuccess && (
                  <>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-400/10">
                      <XCircle className="h-10 w-10 text-red-400" />
                    </div>

                    <h1 className="mt-6 text-2xl font-black sm:text-3xl">
                      Не вдалося підтвердити email
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-zinc-500">
                      {message}
                    </p>
                  </>
                )}
            </div>

            {/* CONTENT */}

            <div className="px-6 py-8 sm:px-10">
              {/* LOADING */}

              {isLoading && (
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5 text-center">
                  <Mail className="mx-auto h-6 w-6 text-zinc-500" />

                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    Перевіряємо токен підтвердження
                    та активуємо ваш акаунт.
                  </p>
                </div>
              )}

              {/* SUCCESS */}

              {state === "success" && (
                <>
                  <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-5">
                    <p className="text-sm leading-7 text-zinc-300">
                      Ваш акаунт тепер активний.
                      Вас автоматично авторизовано.
                    </p>
                  </div>

                  <Link
                    href="/account"
                    className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
                  >
                    Перейти до мого акаунта

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}

              {/* ALREADY VERIFIED */}

              {state === "already" && (
                <>
                  <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] p-5">
                    <p className="text-sm leading-7 text-zinc-300">
                      Email цього акаунта вже
                      підтверджено. Ви можете
                      перейти до свого акаунта.
                    </p>
                  </div>

                  <Link
                    href="/account"
                    className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
                  >
                    Перейти до мого акаунта

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}

              {/* EXPIRED */}

              {state === "expired" && (
                <>
                  <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.04] p-5">
                    <p className="text-sm leading-7 text-zinc-300">
                      Посилання дійсне обмежений
                      час. Запросіть новий лист
                      підтвердження.
                    </p>
                  </div>

                  <Link
                    href="/login"
                    className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.1]"
                  >
                    Перейти до входу

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}

              {/* USED */}

              {state === "used" && (
                <>
                  <div className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] p-5">
                    <p className="text-sm leading-7 text-zinc-300">
                      Це посилання вже було
                      використано. Якщо email вже
                      підтверджений, просто увійдіть
                      до свого акаунта.
                    </p>
                  </div>

                  <Link
                    href="/login"
                    className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
                  >
                    Увійти в акаунт

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}

              {/* INVALID / ERROR */}

              {(state === "invalid" ||
                state === "error") && (
                <>
                  <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.04] p-5">
                    <p className="text-sm leading-7 text-zinc-300">
                      Спробуйте запросити новий
                      лист підтвердження або
                      повернутися до сторінки входу.
                    </p>
                  </div>

                  <Link
                    href="/login"
                    className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
                  >
                    Перейти до входу

                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}

              {/* HOME */}

              {!isLoading && (
                <Link
                  href="/"
                  className="mt-4 flex h-11 items-center justify-center rounded-xl text-sm font-bold text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                >
                  На головну
                </Link>
              )}
            </div>

            {/* FOOTER */}

            <div className="border-t border-white/[0.06] px-6 py-5 text-center">
              <p className="text-xs text-zinc-600">
                UkrTradeHub — український
                маркетплейс
              </p>

              <p className="mt-1 text-[11px] text-zinc-700">
                support@ukrtradehub.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}