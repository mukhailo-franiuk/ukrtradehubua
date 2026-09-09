"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Package,
  Heart,
  ShoppingCart,
  Store,
  Settings,
  ShieldCheck,
  LogOut,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Camera,
  MapPin,
  Bell,
  RotateCcw,
  HelpCircle,
} from "lucide-react";

type UserData = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  status: string;
  isBlocked: boolean;
  emailVerifiedAt: string | null;
};

type AvatarData = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

type MeResponse = {
  success?: boolean;
  user?: UserData;
  message?: string;
  error?: string;
};

type AvatarResponse = {
  success?: boolean;
  avatar?: AvatarData | null;
  message?: string;
};

export default function AccountPage() {
  const [user, setUser] =
    useState<UserData | null>(null);

  const [avatar, setAvatar] =
    useState<AvatarData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      setLoading(true);
      setError("");

      const [userResponse, avatarResponse] =
        await Promise.all([
          fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),

          fetch(
            "/api/auth/profile/avatar",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          ),
        ]);

      const data: MeResponse =
        await userResponse.json();

      if (
        userResponse.status === 401 ||
        !userResponse.ok ||
        !data.user
      ) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);

      if (avatarResponse.ok) {
        const avatarData: AvatarResponse =
          await avatarResponse.json();

        setAvatar(
          avatarData.avatar ?? null
        );
      }
    } catch (err) {
      console.error(
        "ACCOUNT LOAD ERROR:",
        err
      );

      setError(
        "Не вдалося завантажити дані акаунта."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (err) {
      console.error(
        "LOGOUT ERROR:",
        err
      );
    } finally {
      window.location.href = "/login";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-white/50">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            Завантаження акаунта...
          </div>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />

            <h1 className="text-xl font-black">
              Не вдалося відкрити акаунт
            </h1>

            <p className="mt-3 text-sm text-white/50">
              {error ||
                "Потрібно увійти в акаунт."}
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Увійти
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    user.name?.trim() || "Користувач";

  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") ||
    user.email
      .charAt(0)
      .toUpperCase();

  const roleLabel =
    user.role === "ADMIN"
      ? "Адміністратор"
      : user.role === "SELLER"
        ? "Продавець"
        : "Покупець";

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
              U
            </div>

            <span className="text-xl font-black tracking-tight">
              Ukr
              <span className="text-amber-400">
                Trade
              </span>
              Hub
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <ShoppingCart className="h-4 w-4" />
              Кошик
            </Link>

            <Link
              href="/"
              className="text-sm font-semibold text-white/50 transition hover:text-white"
            >
              На головну
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =====================================================
            WELCOME
        ===================================================== */}

        <div className="mb-8">
          <p className="text-sm font-semibold text-amber-400">
            Особистий кабінет
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Вітаємо, {displayName}
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Керуйте своїм акаунтом, покупками,
            адресами та налаштуваннями UkrTradeHub.
          </p>
        </div>

        {/* =====================================================
            PROFILE
        ===================================================== */}

        <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/account/profile"
                  className="group relative shrink-0"
                  title="Змінити фото профілю"
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-amber-400 text-xl font-black text-black">
                    {avatar?.url ? (
                      <img
                        src={avatar.url}
                        alt={
                          avatar.alt ||
                          `Фото профілю ${displayName}`
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 opacity-0 transition group-hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </Link>

                <div>
                  <h2 className="text-xl font-black">
                    {displayName}
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    {user.email}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Email підтверджено
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Email не підтверджено
                      </span>
                    )}

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/50">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href="/account/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4" />
                Налаштування
              </Link>
            </div>

            <div className="mt-7 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                  <Mail className="h-5 w-5 text-white/40" />
                </div>

                <div>
                  <p className="text-xs text-white/30">
                    Email
                  </p>

                  <p className="text-sm font-semibold text-white/80">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                  <Phone className="h-5 w-5 text-white/40" />
                </div>

                <div>
                  <p className="text-xs text-white/30">
                    Телефон
                  </p>

                  <p className="text-sm font-semibold text-white/80">
                    {user.phone ||
                      "Не вказано"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PURCHASES
        ===================================================== */}

        <section className="mb-8">
          <SectionTitle
            title="Покупки"
            description="Керуйте своїми покупками та збереженими товарами."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AccountCard
              href="/account/orders"
              icon={Package}
              title="Мої замовлення"
              description="Перегляд та відстеження покупок"
            />

            <AccountCard
              href="/account/favorites"
              icon={Heart}
              title="Обране"
              description="Збережені товари та магазини"
            />

            <AccountCard
              href="/cart"
              icon={ShoppingCart}
              title="Кошик"
              description="Товари, які ви плануєте придбати"
              highlight
            />
          </div>
        </section>

        {/* =====================================================
            DELIVERY
        ===================================================== */}

        <section className="mb-8">
          <SectionTitle
            title="Доставка"
            description="Ваші адреси та інформація, пов'язана з доставкою."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AccountCard
              href="/account/addresses"
              icon={MapPin}
              title="Мої адреси"
              description="Адреси доставки та отримувачі"
            />

            <AccountCard
              href="/account/returns"
              icon={RotateCcw}
              title="Повернення"
              description="Повернення товарів та заявки"
            />

            <AccountCard
              href="/delivery"
              icon={Package}
              title="Доставка"
              description="Умови та способи доставки"
            />
          </div>
        </section>

        {/* =====================================================
            ACCOUNT
        ===================================================== */}

        <section className="mb-8">
          <SectionTitle
            title="Мій акаунт"
            description="Особисті дані, безпека та налаштування."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AccountCard
              href="/account/profile"
              icon={User}
              title="Мій профіль"
              description="Особисті дані та контактна інформація"
            />

            <AccountCard
              href="/account/security"
              icon={ShieldCheck}
              title="Безпека"
              description="Пароль та активні сесії"
            />

            <AccountCard
              href="/account/notifications"
              icon={Bell}
              title="Сповіщення"
              description="Керування повідомленнями акаунта"
            />

            <AccountCard
              href="/account/settings"
              icon={Settings}
              title="Налаштування"
              description="Налаштування вашого акаунта"
            />
          </div>
        </section>

        {/* =====================================================
            SUPPORT
        ===================================================== */}

        <section className="mb-8">
          <SectionTitle
            title="Допомога"
            description="Корисна інформація та підтримка."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AccountCard
              href="/help"
              icon={HelpCircle}
              title="Центр допомоги"
              description="Відповіді на популярні запитання"
            />

            <AccountCard
              href="/help/contact"
              icon={Mail}
              title="Зв'язатися з нами"
              description="Звернення до служби підтримки"
            />

            <AccountCard
              href="/buyer-protection"
              icon={ShieldCheck}
              title="Захист покупця"
              description="Безпечні покупки на UkrTradeHub"
            />
          </div>
        </section>

        {/* =====================================================
            SELLER
        ===================================================== */}

        {user.role === "CUSTOMER" && (
          <section className="mb-8">
            <SectionTitle
              title="Для продавців"
              description="Хочете продавати на UkrTradeHub?"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <AccountCard
                href="/seller/apply"
                icon={Store}
                title="Стати продавцем"
                description="Почніть продавати свої товари на UkrTradeHub"
                highlight
              />

              <AccountCard
                href="/seller/register"
                icon={Store}
                title="Продавати на UkrTradeHub"
                description="Дізнайтеся про можливості для продавців"
              />
            </div>
          </section>
        )}

        {user.role === "SELLER" && (
          <section className="mb-8">
            <SectionTitle
              title="Магазин"
              description="Керування вашою діяльністю продавця."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <AccountCard
                href="/seller"
                icon={Store}
                title="Кабінет продавця"
                description="Керування магазином та товарами"
                highlight
              />

              <AccountCard
                href="/seller/products"
                icon={Package}
                title="Мої товари"
                description="Керування товарами магазину"
              />
            </div>
          </section>
        )}

        {/* =====================================================
            LOGOUT
        ===================================================== */}

        <section className="mt-8 rounded-3xl border border-red-500/10 bg-red-500/[0.03] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold">
                Вийти з акаунта
              </h3>

              <p className="mt-1 text-sm text-white/35">
                Завершити поточну сесію на цьому
                пристрої.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}

              {loggingOut
                ? "Вихід..."
                : "Вийти"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

// =====================================================
// SECTION TITLE
// =====================================================

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-black tracking-tight">
        {title}
      </h2>

      <p className="mt-1 text-sm text-white/35">
        {description}
      </p>
    </div>
  );
}

// =====================================================
// ACCOUNT CARD
// =====================================================

function AccountCard({
  href,
  icon: Icon,
  title,
  description,
  highlight = false,
}: {
  href: string;
  icon: typeof User;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border p-5 transition ${
        highlight
          ? "border-amber-400/20 bg-amber-400/[0.06] hover:border-amber-400/40 hover:bg-amber-400/[0.1]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            highlight
              ? "bg-amber-400/10 text-amber-400"
              : "bg-white/5 text-white/50"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <ChevronRight className="h-5 w-5 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/50" />
      </div>

      <h3 className="mt-5 font-bold">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-white/35">
        {description}
      </p>
    </Link>
  );
}