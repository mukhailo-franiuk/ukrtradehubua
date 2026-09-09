
"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Heart,
  Menu,
  Search,
  ShoppingCart,
  Store,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

/* ============================================================
   TYPES
============================================================ */

type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
};

type CategoryChild = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  children: CategoryChild[];
};

/* ============================================================
   NAVIGATION
============================================================ */

const navigation = [
  {
    label: "Гарячі товари",
    href: "/deals",
    icon: Zap,
  },
  {
    label: "Новинки",
    href: "/products?sort=newest",
  },
  {
    label: "Акції",
    href: "/deals",
  },
  {
    label: "Магазини",
    href: "/shops",
    icon: Store,
  },
];

/* ============================================================
   HEADER CLIENT
============================================================ */

export default function HeaderClient({
  categories,
}: {
  categories: Category[];
}) {
  /* ==========================================================
     STATE
  ========================================================== */

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [catalogOpen, setCatalogOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);

  const [accountOpen, setAccountOpen] =
    useState(false);

  const [query, setQuery] =
    useState("");

  const [activeCategory, setActiveCategory] =
    useState<Category | null>(
      categories[0] ?? null
    );

  const accountRef =
    useRef<HTMLDivElement>(null);

  /* ==========================================================
     USER
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await fetch(
          "/api/auth/me",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (mounted) {
            setUser(null);
          }

          return;
        }

        const data =
          await response.json();

        if (mounted) {
          setUser(
            data?.user ?? null
          );
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     ACTIVE CATEGORY
  ========================================================== */

  useEffect(() => {
    if (categories.length === 0) {
      setActiveCategory(null);
      return;
    }

    const currentExists =
      categories.some(
        (category) =>
          category.id ===
          activeCategory?.id
      );

    if (!currentExists) {
      setActiveCategory(
        categories[0]
      );
    }
  }, [
    categories,
    activeCategory?.id,
  ]);

  /* ==========================================================
     OUTSIDE ACCOUNT CLICK
  ========================================================== */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        accountRef.current &&
        !accountRef.current.contains(
          event.target as Node
        )
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* ==========================================================
     ESC
  ========================================================== */

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      setAccountOpen(false);
      setCatalogOpen(false);
      setMobileOpen(false);
      setMobileSearchOpen(false);
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* ==========================================================
     BODY SCROLL LOCK
  ========================================================== */

  useEffect(() => {
    const shouldLock =
      catalogOpen ||
      mobileOpen;

    document.body.style.overflow =
      shouldLock
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    catalogOpen,
    mobileOpen,
  ]);

  /* ==========================================================
     CLOSE MENUS
  ========================================================== */

  function closeMenus() {
    setCatalogOpen(false);
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setAccountOpen(false);
  }

  /* ==========================================================
     SEARCH
  ========================================================== */

  function submitSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const value =
      query.trim();

    if (!value) {
      return;
    }

    closeMenus();

    window.location.href =
      `/search?q=${encodeURIComponent(
        value
      )}`;
  }

  /* ==========================================================
     LOGOUT
  ========================================================== */

  async function logout() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        }
      );
    } catch {
      // Стан очищаємо навіть якщо запит завершився помилкою.
    } finally {
      setUser(null);
      setAccountOpen(false);
      setCatalogOpen(false);
      setMobileOpen(false);
      setMobileSearchOpen(false);

      window.location.href = "/";
    }
  }

  /* ==========================================================
     CATEGORY
  ========================================================== */

  function openCategory(
    category: Category
  ) {
    setActiveCategory(category);
  }

  /* ==========================================================
     ROLES
  ========================================================== */

  const isAdmin =
    user?.role === "ADMIN";

  const isSeller =
    user?.role === "SELLER";

  const isAuthenticated =
    Boolean(user);

  /*
   * CUSTOMER FEATURES
   *
   * Обране та Сповіщення:
   * тільки авторизованим користувачам.
   *
   * Кошик:
   * доступний усім, включно з гостями.
   */

  const showCustomerFeatures =
    isAuthenticated &&
    !isAdmin;

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-[100] w-full border-b border-white/[0.07] bg-[#080b11]/95 text-white shadow-2xl shadow-black/10 backdrop-blur-2xl">

        {/* ====================================================
            TOP BAR
        ==================================================== */}

        <div className="hidden border-b border-white/[0.06] bg-[#05070b] lg:block">
          <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-between px-6 text-[12px]">

            <div className="flex items-center gap-6">

              <Link
                href="/seller/register"
                className="font-medium text-zinc-400 transition hover:text-amber-400"
              >
                Продавайте на UkrTradeHub
              </Link>

              <Link
                href="/help"
                className="text-zinc-500 transition hover:text-white"
              >
                Допомога
              </Link>

              <Link
                href="/buyer-protection"
                className="text-zinc-500 transition hover:text-white"
              >
                Захист покупця
              </Link>

              <Link
                href="/delivery"
                className="text-zinc-500 transition hover:text-white"
              >
                Доставка та оплата
              </Link>

            </div>

            <div className="flex items-center gap-5 text-zinc-500">

              <Link
                href="/about"
                className="transition hover:text-white"
              >
                Про UkrTradeHub
              </Link>

              <button
                type="button"
                className="flex items-center gap-1 transition hover:text-white"
              >
                🇺🇦 Українська

                <ChevronDown className="h-3 w-3" />
              </button>

              <button
                type="button"
                className="flex items-center gap-1 transition hover:text-white"
              >
                UAH

                <ChevronDown className="h-3 w-3" />
              </button>

            </div>
          </div>
        </div>

        {/* ====================================================
            MAIN HEADER
        ==================================================== */}

        <div className="mx-auto max-w-[1600px] px-3 sm:px-5 lg:px-6">

          <div className="flex min-h-[76px] min-w-0 items-center gap-2 lg:gap-3">

            {/* =================================================
                MOBILE MENU
            ================================================= */}

            <button
              type="button"
              aria-label="Відкрити меню"
              aria-expanded={mobileOpen}
              onClick={() => {
                setMobileOpen(true);
                setCatalogOpen(false);
                setAccountOpen(false);
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* =================================================
                LOGO
            ================================================= */}

            <Link
              href="/"
              onClick={closeMenus}
              aria-label="UkrTradeHub"
              className="flex shrink-0 items-center"
            >
              <div className="flex items-center gap-2.5">

                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-400 shadow-lg shadow-amber-400/10">

                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />

                  <span className="relative text-xl font-black tracking-tight text-black">
                    U
                  </span>

                </div>

                <div className="hidden xl:block">

                  <div className="whitespace-nowrap text-[19px] font-black tracking-[-0.04em]">
                    Ukr
                    <span className="text-amber-400">
                      Trade
                    </span>
                    Hub
                  </div>

                  <div className="mt-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-600">
                    Marketplace Ukraine
                  </div>

                </div>
              </div>
            </Link>

            {/* =================================================
                CATALOG
            ================================================= */}

            <button
              type="button"
              aria-label="Каталог товарів"
              aria-expanded={catalogOpen}
              onClick={() => {
                setCatalogOpen(
                  (value) => !value
                );

                setAccountOpen(false);
                setMobileOpen(false);
              }}
              className={`hidden h-12 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition xl:flex ${
                catalogOpen
                  ? "border-amber-400/30 bg-amber-400 text-black"
                  : "border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              <Menu className="h-[18px] w-[18px]" />

              <span>
                Каталог товарів
              </span>

              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  catalogOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {/* =================================================
                SEARCH
            ================================================= */}

            <form
              onSubmit={submitSearch}
              className="hidden min-w-0 flex-1 lg:block"
            >
              <div className="group relative">

                <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500 transition group-focus-within:text-amber-400" />

                <input
                  type="search"
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Пошук товарів, брендів та магазинів..."
                  autoComplete="off"
                  className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.045] pl-11 pr-24 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-amber-400/40 focus:bg-white/[0.06] focus:ring-4 focus:ring-amber-400/[0.06]"
                />

                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 h-8 rounded-lg bg-amber-400 px-4 text-xs font-black text-black transition hover:bg-amber-300"
                >
                  Знайти
                </button>

              </div>
            </form>

            {/* =================================================
                RIGHT SIDE
            ================================================= */}

            <div className="ml-auto flex shrink-0 items-center">

              {/* =================================================
                  CUSTOMER ACTIONS

                  ГІСТЬ:
                  🛒 Кошик

                  CUSTOMER / SELLER:
                  ❤️ Обране
                  🔔 Сповіщення
                  🛒 Кошик

                  ADMIN:
                  🛒 Кошик

                  КОШИК ЗАВЖДИ ДОСТУПНИЙ.
              ================================================= */}

              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">

                {/* =================================================
                    FAVORITES
                    Тільки авторизованому CUSTOMER / SELLER
                ================================================= */}

                {showCustomerFeatures && (
                  <HeaderAction
                    href="/account/favorites"
                    label="Обране"
                    badge="0"
                  >
                    <Heart className="h-[19px] w-[19px]" />
                  </HeaderAction>
                )}

                {/* =================================================
                    NOTIFICATIONS
                    Тільки авторизованому CUSTOMER / SELLER
                ================================================= */}

                {showCustomerFeatures && (
                  <HeaderAction
                    href="/account/notifications"
                    label="Сповіщення"
                    dot
                  >
                    <Bell className="h-[19px] w-[19px]" />
                  </HeaderAction>
                )}

                {/* =================================================
                    CART

                    НІКОЛИ НЕ ЗАЛЕЖИТЬ ВІД USER.
                    Працює для гостя.
                ================================================= */}

                <HeaderAction
                  href="/cart"
                  label="Кошик"
                  badge="0"
                >
                  <ShoppingCart className="h-[19px] w-[19px]" />
                </HeaderAction>

              </div>

              {/* =================================================
                  SEPARATOR
              ================================================= */}

              <div className="mx-1 h-7 w-px bg-white/10 sm:mx-2" />

              {/* =================================================
                  ACCOUNT
              ================================================= */}

              <div
                ref={accountRef}
                className="relative shrink-0"
              >

                {/* =================================================
                    LOADING
                ================================================= */}

                {loadingUser ? (
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-white/[0.05] sm:w-12" />
                ) : user ? (

                  /* =================================================
                     AUTHENTICATED
                  ================================================= */

                  <>
                    <button
                      type="button"
                      aria-label="Відкрити меню акаунта"
                      aria-expanded={accountOpen}
                      onClick={() => {
                        setAccountOpen(
                          (value) =>
                            !value
                        );

                        setCatalogOpen(false);
                        setMobileOpen(false);
                      }}
                      className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 transition hover:border-white/20 hover:bg-white/[0.08] sm:px-2 2xl:px-2.5"
                    >

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-black">
                        {(
                          user.name ||
                          user.email
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="hidden min-w-0 2xl:block 2xl:max-w-[120px]">

                        <div className="truncate text-xs font-bold text-white">
                          {user.name ||
                            "Мій акаунт"}
                        </div>

                        <div className="truncate text-[10px] text-zinc-600">
                          {isAdmin
                            ? "Адміністратор"
                            : isSeller
                            ? "Продавець"
                            : "Особистий кабінет"}
                        </div>

                      </div>

                      <ChevronDown
                        className={`hidden h-4 w-4 shrink-0 text-zinc-500 transition 2xl:block ${
                          accountOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />

                    </button>

                    {/* =================================================
                        ACCOUNT DROPDOWN
                    ================================================= */}

                    <AnimatePresence>
                      {accountOpen && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 8,
                            scale: 0.97,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                          }}
                          exit={{
                            opacity: 0,
                            y: 8,
                            scale: 0.97,
                          }}
                          transition={{
                            duration: 0.16,
                            ease: "easeOut",
                          }}
                          className="absolute right-0 top-[calc(100%+10px)] z-[9999] w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f16] shadow-2xl shadow-black/70"
                        >

                          {/* USER HEADER */}

                          <div className="border-b border-white/10 p-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
                                {(
                                  user.name ||
                                  user.email
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">

                                <div className="truncate text-sm font-bold text-white">
                                  {user.name ||
                                    "Користувач"}
                                </div>

                                <div className="truncate text-xs text-zinc-500">
                                  {user.email}
                                </div>

                              </div>

                            </div>
                          </div>

                          {/* ACCOUNT MENU */}

                          <div className="p-2">

                            <AccountLink
                              href="/account"
                              icon={
                                <User className="h-4 w-4" />
                              }
                              label="Мій кабінет"
                              onClick={() =>
                                setAccountOpen(
                                  false
                                )
                              }
                            />

                            {/* =================================================
                                CUSTOMER / SELLER ACCOUNT FEATURES

                                ADMIN НЕ БАЧИТЬ ПОКУПЕЦЬКИХ ПУНКТІВ.
                            ================================================= */}

                            {!isAdmin && (
                              <>
                                <AccountLink
                                  href="/account/orders"
                                  icon={
                                    <ShoppingCart className="h-4 w-4" />
                                  }
                                  label="Мої замовлення"
                                  onClick={() =>
                                    setAccountOpen(
                                      false
                                    )
                                  }
                                />

                                <AccountLink
                                  href="/account/favorites"
                                  icon={
                                    <Heart className="h-4 w-4" />
                                  }
                                  label="Обране"
                                  onClick={() =>
                                    setAccountOpen(
                                      false
                                    )
                                  }
                                />

                                <AccountLink
                                  href="/account/notifications"
                                  icon={
                                    <Bell className="h-4 w-4" />
                                  }
                                  label="Сповіщення"
                                  onClick={() =>
                                    setAccountOpen(
                                      false
                                    )
                                  }
                                />

                                <AccountLink
                                  href="/cart"
                                  icon={
                                    <ShoppingCart className="h-4 w-4" />
                                  }
                                  label="Кошик"
                                  onClick={() =>
                                    setAccountOpen(
                                      false
                                    )
                                  }
                                />
                              </>
                            )}

                            {/* =================================================
                                SELLER
                            ================================================= */}

                            {isSeller && (
                              <AccountLink
                                href="/seller"
                                icon={
                                  <Store className="h-4 w-4" />
                                }
                                label="Кабінет продавця"
                                onClick={() =>
                                  setAccountOpen(
                                    false
                                  )
                                }
                              />
                            )}

                            {/* =================================================
                                ADMIN
                            ================================================= */}

                            {isAdmin && (
                              <AccountLink
                                href="/admin"
                                icon={
                                  <Store className="h-4 w-4" />
                                }
                                label="Адмін-панель"
                                accent
                                onClick={() =>
                                  setAccountOpen(
                                    false
                                  )
                                }
                              />
                            )}

                            <div className="my-2 border-t border-white/10" />

                            {/* LOGOUT */}

                            <button
                              type="button"
                              onClick={logout}
                              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                            >
                              Вийти з акаунта
                            </button>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>

                ) : (

                  /* =================================================
                     GUEST
                  ================================================= */

                  <Link
                    href="/login"
                    onClick={closeMenus}
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-sm font-black text-black transition hover:bg-amber-300 sm:px-4"
                  >
                    <User className="h-4 w-4 shrink-0" />

                    <span>
                      Увійти
                    </span>
                  </Link>
                )}

              </div>
            </div>
          </div>

          {/* ====================================================
              MOBILE SEARCH
          ==================================================== */}

          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                initial={{
                  height: 0,
                  opacity: 0,
                }}
                animate={{
                  height: "auto",
                  opacity: 1,
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                }}
                className="overflow-hidden lg:hidden"
              >
                <form
                  onSubmit={submitSearch}
                  className="pb-3 pt-1"
                >
                  <div className="relative">

                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />

                    <input
                      type="search"
                      autoFocus
                      value={query}
                      onChange={(event) =>
                        setQuery(
                          event.target.value
                        )
                      }
                      placeholder="Пошук товарів..."
                      autoComplete="off"
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-12 pr-20 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/40"
                    />

                    <button
                      type="submit"
                      className="absolute right-1 top-1 h-10 rounded-lg bg-amber-400 px-4 text-xs font-black text-black"
                    >
                      Знайти
                    </button>

                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====================================================
            DESKTOP NAV
        ==================================================== */}

        <div className="hidden border-t border-white/[0.05] lg:block">

          <div className="mx-auto flex h-11 max-w-[1600px] items-center px-6">

            <nav className="flex h-full items-center gap-1">

              {navigation.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className="flex h-full items-center gap-2 border-b-2 border-transparent px-4 text-[13px] font-semibold text-zinc-500 transition hover:border-amber-400 hover:text-white"
                    >
                      {Icon && (
                        <Icon className="h-3.5 w-3.5" />
                      )}

                      {item.label}
                    </Link>
                  );
                }
              )}

              <Link
                href="/categories"
                className="flex h-full items-center gap-2 border-b-2 border-transparent px-4 text-[13px] font-semibold text-zinc-500 transition hover:border-amber-400 hover:text-white"
              >
                Категорії

                <ChevronDown className="h-3.5 w-3.5" />
              </Link>

            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-zinc-600">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              Український маркетплейс

            </div>

          </div>
        </div>
      </header>

      {/* ======================================================
          DESKTOP MEGA MENU
      ====================================================== */}

      <AnimatePresence>
        {catalogOpen && (
          <>
            {/* OVERLAY */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setCatalogOpen(false)
              }
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px]"
            />

            {/* MENU */}

            <motion.div
              initial={{
                opacity: 0,
                y: -12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -12,
              }}
              transition={{
                duration: 0.18,
              }}
              className="fixed left-0 right-0 top-[156px] z-[90] hidden border-b border-white/10 bg-[#090d14] shadow-2xl shadow-black/50 lg:block"
            >
              <div className="mx-auto grid max-h-[calc(100vh-156px)] max-w-[1600px] grid-cols-[300px_1fr] overflow-y-auto px-6 py-7">

                {/* =================================================
                    LEFT
                ================================================= */}

                <div className="border-r border-white/10 pr-5">

                  <div className="mb-4 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                    Каталог
                  </div>

                  {categories.length === 0 ? (

                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm text-zinc-600">
                      Категорії поки що відсутні.
                    </div>

                  ) : (

                    <div className="space-y-1">

                      {categories.map(
                        (category) => {

                          const active =
                            activeCategory?.id ===
                            category.id;

                          return (
                            <button
                              key={
                                category.id
                              }
                              type="button"
                              onMouseEnter={() =>
                                openCategory(
                                  category
                                )
                              }
                              onFocus={() =>
                                openCategory(
                                  category
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                                active
                                  ? "bg-amber-400/10 text-white"
                                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >

                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-lg">
                                {category.icon ||
                                  "📦"}
                              </span>

                              <span className="flex-1 text-sm font-semibold">
                                {
                                  category.name
                                }
                              </span>

                              <ChevronRight
                                className={`h-4 w-4 ${
                                  active
                                    ? "text-amber-400"
                                    : "text-zinc-700"
                                }`}
                              />

                            </button>
                          );
                        }
                      )}

                    </div>
                  )}
                </div>

                {/* =================================================
                    RIGHT
                ================================================= */}

                {activeCategory && (
                  <div className="px-9">

                    <div className="flex items-start justify-between gap-6">

                      <div>

                        <div className="flex items-center gap-3">

                          <span className="text-3xl">
                            {activeCategory.icon ||
                              "📦"}
                          </span>

                          <div>

                            <h3 className="text-xl font-black text-white">
                              {
                                activeCategory.name
                              }
                            </h3>

                            <p className="mt-1 text-xs text-zinc-600">
                              Підкатегорії та товари
                            </p>

                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/categories/${activeCategory.slug}`}
                        onClick={() =>
                          setCatalogOpen(
                            false
                          )
                        }
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-300"
                      >
                        Переглянути все

                        <ChevronRight className="h-4 w-4" />
                      </Link>

                    </div>

                    {activeCategory.children.length > 0 ? (

                      <div className="mt-7 grid grid-cols-3 gap-3">

                        {activeCategory.children.map(
                          (child) => (

                            <Link
                              key={
                                child.id
                              }
                              href={`/categories/${child.slug}`}
                              onClick={() =>
                                setCatalogOpen(
                                  false
                                )
                              }
                              className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05]"
                            >

                              <span className="flex min-w-0 items-center gap-3">

                                {child.icon && (
                                  <span className="text-base">
                                    {
                                      child.icon
                                    }
                                  </span>
                                )}

                                <span className="truncate text-sm font-medium text-zinc-400 transition group-hover:text-amber-300">
                                  {
                                    child.name
                                  }
                                </span>

                              </span>

                              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-amber-400" />

                            </Link>
                          )
                        )}

                      </div>

                    ) : (

                      <div className="mt-7 rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 text-sm text-zinc-600">
                        У цій категорії поки немає підкатегорій.
                      </div>

                    )}

                    {/* HOT DEALS */}

                    <div className="mt-7 overflow-hidden rounded-2xl border border-amber-400/10 bg-gradient-to-r from-amber-400/[0.09] to-transparent p-5">

                      <div className="flex items-center justify-between gap-5">

                        <div>

                          <div className="flex items-center gap-2 text-sm font-black text-amber-300">

                            <Zap className="h-4 w-4" />

                            Гарячі пропозиції

                          </div>

                          <p className="mt-1 text-xs text-zinc-600">
                            Найкращі ціни на UkrTradeHub
                          </p>

                        </div>

                        <Link
                          href="/deals"
                          onClick={() =>
                            setCatalogOpen(
                              false
                            )
                          }
                          className="shrink-0 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-amber-300"
                        >
                          Дивитися акції
                        </Link>

                      </div>
                    </div>

                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ======================================================
          MOBILE DRAWER
      ====================================================== */}

      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* OVERLAY */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setMobileOpen(false)
              }
              className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm lg:hidden"
            />

            {/* DRAWER */}

            <motion.aside
              initial={{
                x: "-100%",
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: "-100%",
              }}
              transition={{
                type: "spring",
                stiffness: 360,
                damping: 34,
              }}
              className="fixed bottom-0 left-0 top-0 z-[210] w-[88%] max-w-[390px] overflow-y-auto border-r border-white/10 bg-[#080b11] lg:hidden"
            >

              {/* =================================================
                  DRAWER HEADER
              ================================================= */}

              <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4">

                <Link
                  href="/"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="text-lg font-black"
                >
                  Ukr
                  <span className="text-amber-400">
                    Trade
                  </span>
                  Hub
                </Link>

                <button
                  type="button"
                  aria-label="Закрити меню"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              {/* =================================================
                  ACCOUNT
              ================================================= */}

              <div className="border-b border-white/10 p-4">

                {loadingUser ? (

                  <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />

                ) : user ? (

                  <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
                      {(
                        user.name ||
                        user.email
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">

                      <div className="truncate text-sm font-bold text-white">
                        {user.name ||
                          "Мій акаунт"}
                      </div>

                      <div className="truncate text-xs text-zinc-600">
                        {user.email}
                      </div>

                    </div>

                  </div>

                ) : (

                  <Link
                    href="/login"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                    className="flex h-12 items-center justify-center rounded-xl bg-amber-400 font-black text-black"
                  >
                    Увійти в акаунт
                  </Link>
                )}

              </div>

              {/* =================================================
                  NAVIGATION
              ================================================= */}

              <nav className="p-4">

                <div className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                  Навігація
                </div>

                <div className="space-y-1">

                  <MobileLink
                    href="/"
                    label="Головна"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  <MobileLink
                    href="/products"
                    label="Усі товари"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  <MobileLink
                    href="/deals"
                    label="Акції та знижки"
                    accent
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  <MobileLink
                    href="/shops"
                    label="Магазини"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  {/* =================================================
                      CUSTOMER FEATURES

                      Тільки авторизованому CUSTOMER / SELLER
                  ================================================= */}

                  {showCustomerFeatures && (
                    <>
                      <MobileLink
                        href="/account/favorites"
                        label="Обране"
                        onClick={() =>
                          setMobileOpen(false)
                        }
                      />

                      <MobileLink
                        href="/account/notifications"
                        label="Сповіщення"
                        onClick={() =>
                          setMobileOpen(false)
                        }
                      />

                      <MobileLink
                        href="/account/orders"
                        label="Мої замовлення"
                        onClick={() =>
                          setMobileOpen(false)
                        }
                      />
                    </>
                  )}

                  {/* =================================================
                      CART

                      ЗАВЖДИ доступний.
                  ================================================= */}

                  <MobileLink
                    href="/cart"
                    label="Кошик"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  {/* =================================================
                      SELLER
                  ================================================= */}

                  {isSeller && (
                    <MobileLink
                      href="/seller"
                      label="Кабінет продавця"
                      accent
                      onClick={() =>
                        setMobileOpen(false)
                      }
                    />
                  )}

                  {/* =================================================
                      ADMIN
                  ================================================= */}

                  {isAdmin && (
                    <MobileLink
                      href="/admin"
                      label="Адмін-панель"
                      accent
                      onClick={() =>
                        setMobileOpen(false)
                      }
                    />
                  )}

                </div>

                <div className="my-6 border-t border-white/10" />

                {/* =================================================
                    CATEGORIES
                ================================================= */}

                <div className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                  Категорії
                </div>

                <div className="space-y-1">

                  {categories.length > 0 ? (

                    categories.map(
                      (category) => (

                        <Link
                          key={
                            category.id
                          }
                          href={`/categories/${category.slug}`}
                          onClick={() =>
                            setMobileOpen(
                              false
                            )
                          }
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                        >

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-base">
                            {category.icon ||
                              "📦"}
                          </span>

                          <span className="min-w-0 flex-1 truncate">
                            {
                              category.name
                            }
                          </span>

                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700" />

                        </Link>
                      )
                    )

                  ) : (

                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm text-zinc-600">
                      Категорії поки що відсутні.
                    </div>
                  )}

                </div>

                <div className="my-6 border-t border-white/10" />

                {/* =================================================
                    HELP
                ================================================= */}

                <div className="space-y-1">

                  <MobileLink
                    href="/help"
                    label="Допомога"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  <MobileLink
                    href="/delivery"
                    label="Доставка та оплата"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  <MobileLink
                    href="/buyer-protection"
                    label="Захист покупця"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                  <MobileLink
                    href="/seller/register"
                    label="Стати продавцем"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  />

                </div>

                {/* =================================================
                    LOGOUT
                ================================================= */}

                {user && (
                  <button
                    type="button"
                    onClick={logout}
                    className="mt-6 w-full rounded-xl border border-red-500/10 px-3 py-3 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    Вийти з акаунта
                  </button>
                )}

              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================================================
   HEADER ACTION
============================================================ */

function HeaderAction({
  href,
  label,
  children,
  badge,
  dot,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  badge?: string;
  dot?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
    >
      {children}

      {badge !== undefined && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black leading-none text-black">
          {badge}
        </span>
      )}

      {dot && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
      )}
    </Link>
  );
}

/* ============================================================
   ACCOUNT LINK
============================================================ */

function AccountLink({
  href,
  icon,
  label,
  onClick,
  accent = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        accent
          ? "text-amber-300 hover:bg-amber-400/10"
          : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {icon}

      <span>
        {label}
      </span>
    </Link>
  );
}

/* ============================================================
   MOBILE LINK
============================================================ */

function MobileLink({
  href,
  label,
  onClick,
  accent = false,
}: {
  href: string;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition ${
        accent
          ? "text-amber-400 hover:bg-amber-400/10"
          : "text-zinc-300 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <span>
        {label}
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700" />
    </Link>
  );
}
