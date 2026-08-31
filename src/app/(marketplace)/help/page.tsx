
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CreditCard,
  Headphones,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Центр допомоги",

  description:
    "Центр допомоги UkrTradeHub. Відповіді на питання про покупки, замовлення, доставку, оплату, повернення, продавців та особистий кабінет.",

  keywords: [
    "UkrTradeHub допомога",
    "UkrTradeHub підтримка",
    "центр допомоги",
    "допомога покупцям",
    "допомога продавцям",
    "замовлення UkrTradeHub",
    "доставка UkrTradeHub",
    "оплата UkrTradeHub",
    "повернення товару",
    "маркетплейс Україна",
  ],

  alternates: {
    canonical: "/help",
  },

  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "https://ukrtradehub.com/help",
    siteName: "UkrTradeHub",

    title: "Центр допомоги | UkrTradeHub",

    description:
      "Знайдіть відповіді на питання про покупки, замовлення, доставку, оплату та роботу з UkrTradeHub.",

    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Центр допомоги — UkrTradeHub",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Центр допомоги | UkrTradeHub",
    description:
      "Допомога покупцям і продавцям UkrTradeHub.",
    images: ["/twitter-image"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

const categories = [
  {
    icon: ShoppingBag,
    title: "Покупки",
    description:
      "Пошук товарів, кошик, оформлення та керування покупками.",
    href: "/help/buyers",
  },
  {
    icon: Package,
    title: "Замовлення",
    description:
      "Статус замовлення, скасування, отримання та проблеми.",
    href: "/help/orders",
  },
  {
    icon: Truck,
    title: "Доставка",
    description:
      "Способи доставки, терміни, відстеження та отримання.",
    href: "/delivery",
  },
  {
    icon: CreditCard,
    title: "Оплата",
    description:
      "Оплата замовлень, платіжні питання та повернення коштів.",
    href: "/help/payments",
  },
  {
    icon: ShieldCheck,
    title: "Захист покупця",
    description:
      "Що робити, якщо виникла проблема з товаром або продавцем.",
    href: "/buyer-protection",
  },
  {
    icon: Store,
    title: "Для продавців",
    description:
      "Створення магазину, товари, замовлення та продажі.",
    href: "/help/sellers",
  },
  {
    icon: UserRound,
    title: "Акаунт",
    description:
      "Профіль, пароль, адреси, налаштування та безпека.",
    href: "/help/account",
  },
  {
    icon: Headphones,
    title: "Підтримка",
    description:
      "Звернення до команди UkrTradeHub з будь-якого питання.",
    href: "/help/contact",
  },
];

const popularQuestions = [
  {
    question: "Як оформити замовлення?",
    answer:
      "Знайдіть потрібний товар, додайте його до кошика, перевірте товари та перейдіть до оформлення. Вкажіть контактні дані, адресу доставки та оберіть доступний спосіб оплати.",
  },
  {
    question: "Як відстежити моє замовлення?",
    answer:
      "Відкрийте розділ замовлень у своєму особистому кабінеті. Якщо продавець передав замовлення перевізнику, там може бути доступна інформація для відстеження.",
  },
  {
    question: "Що робити, якщо товар пошкоджений?",
    answer:
      "Зафіксуйте пошкодження товару та упаковки, збережіть підтвердження покупки та зверніться до продавця. Якщо питання не вирішується, зверніться до підтримки UkrTradeHub.",
  },
  {
    question: "Як повернути товар?",
    answer:
      "Умови повернення залежать від товару, продавця та вимог законодавства України. Спочатку ознайомтеся з умовами продавця та зверніться до нього щодо повернення.",
  },
  {
    question: "Як стати продавцем?",
    answer:
      "Для початку роботи продавцем потрібно подати заявку на підключення до UkrTradeHub. Після перевірки та схвалення заявки ви зможете налаштувати магазин і додавати товари.",
  },
  {
    question: "Як змінити дані профілю?",
    answer:
      "Увійдіть до особистого кабінету та відкрийте налаштування профілю. Доступні для зміни дані залежать від типу інформації.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#080b11] text-white">

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/[0.06]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(251,191,36,0.14),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">

          <div className="mx-auto max-w-3xl text-center">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-xs font-bold text-amber-300">
              <Headphones className="h-4 w-4" />
              Центр допомоги
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Чим можемо
              <span className="block text-amber-400">
                вам допомогти?
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg">
              Знайдіть відповіді на популярні питання про покупки,
              замовлення, доставку, оплату та роботу на UkrTradeHub.
            </p>

            {/* SEARCH */}

            <div className="mx-auto mt-8 flex max-w-2xl items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-2xl shadow-black/20">

              <Search className="ml-3 h-5 w-5 shrink-0 text-zinc-600" />

              <input
                type="search"
                placeholder="Пошук у центрі допомоги..."
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-zinc-600"
              />

              <button
                type="button"
                className="hidden h-12 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300 sm:block"
              >
                Пошук
              </button>

            </div>

          </div>
        </div>
      </section>

      {/* CATEGORIES */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="mb-10">

          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
            Розділи
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Знайдіть потрібну інформацію
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Оберіть категорію, яка відповідає вашому питанню.
          </p>

        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.title}
                href={category.href}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-amber-400/20 hover:bg-white/[0.04]"
              >

                <div className="flex items-center justify-between">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 transition group-hover:bg-amber-400 group-hover:text-black">
                    <Icon className="h-5 w-5" />
                  </div>

                  <ArrowRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-amber-400" />

                </div>

                <h3 className="mt-5 font-black">
                  {category.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {category.description}
                </p>

              </Link>
            );
          })}

        </div>
      </section>

      {/* POPULAR */}

      <section className="border-y border-white/[0.06] bg-[#0b0f17]">

        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">

          <div className="mb-10 text-center">

            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              <BookOpen className="h-4 w-4" />
              Популярні питання
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Відповіді на найчастіші питання
            </h2>

          </div>

          <div className="space-y-3">

            {popularQuestions.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025]"
              >

                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold">

                  <span>
                    {item.question}
                  </span>

                  <ChevronDown className="h-5 w-5 shrink-0 text-zinc-600 transition group-open:rotate-180 group-open:text-amber-400" />

                </summary>

                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-sm leading-7 text-zinc-500">
                  {item.answer}
                </div>

              </details>
            ))}

          </div>

        </div>
      </section>

      {/* QUICK LINKS */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="grid gap-4 md:grid-cols-2">

          <Link
            href="/delivery"
            className="group rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 transition hover:border-amber-400/20 hover:bg-white/[0.04]"
          >

            <div className="flex items-center justify-between">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Truck className="h-6 w-6" />
              </div>

              <ArrowRight className="h-5 w-5 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-amber-400" />

            </div>

            <h3 className="mt-6 text-xl font-black">
              Доставка та оплата
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Дізнайтеся про способи доставки, оплату,
              терміни та умови отримання замовлень.
            </p>

          </Link>

          <Link
            href="/buyer-protection"
            className="group rounded-3xl border border-white/[0.07] bg-white/[0.025] p-7 transition hover:border-emerald-400/20 hover:bg-white/[0.04]"
          >

            <div className="flex items-center justify-between">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <ArrowRight className="h-5 w-5 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-emerald-400" />

            </div>

            <h3 className="mt-6 text-xl font-black">
              Захист покупця
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Дізнайтеся, що робити у випадку проблем
              із товаром, замовленням або продавцем.
            </p>

          </Link>

        </div>
      </section>

      {/* CONTACT SUPPORT */}

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">

        <div className="relative overflow-hidden rounded-3xl border border-amber-400/10 bg-gradient-to-br from-amber-400/[0.11] via-white/[0.025] to-transparent p-8 sm:p-12">

          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/[0.05] blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

            <div className="max-w-2xl">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-black">
                <Headphones className="h-6 w-6" />
              </div>

              <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
                Не знайшли відповіді?
              </h2>

              <p className="mt-4 text-sm leading-7 text-zinc-500">
                Наша команда підтримки допоможе розібратися
                з питанням щодо покупки, замовлення або роботи
                на UkrTradeHub.
              </p>

            </div>

            <Link
              href="/help/contact"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Зв'язатися з підтримкою
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}
