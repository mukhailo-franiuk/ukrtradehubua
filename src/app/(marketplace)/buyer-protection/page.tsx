
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  LockKeyhole,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Захист покупця",

  description:
    "Захист покупця на UkrTradeHub. Дізнайтеся, як захищаються ваші покупки, що робити у разі проблем із замовленням, товаром або продавцем.",

  keywords: [
    "UkrTradeHub захист покупця",
    "захист покупця",
    "захист покупок",
    "безпечна покупка",
    "маркетплейс Україна",
    "повернення товару",
    "проблема із замовленням",
    "спір з продавцем",
    "безпека покупок",
  ],

  alternates: {
    canonical: "/buyer-protection",
  },

  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "https://ukrtradehub.com/buyer-protection",
    siteName: "UkrTradeHub",

    title: "Захист покупця | UkrTradeHub",

    description:
      "Дізнайтеся, як UkrTradeHub допомагає захищати покупки та вирішувати проблеми із замовленнями.",

    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Захист покупця — UkrTradeHub",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Захист покупця | UkrTradeHub",

    description:
      "Безпечні покупки та підтримка покупців на UkrTradeHub.",

    images: ["/twitter-image"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const protectionSteps = [
  {
    number: "01",
    icon: ShoppingBag,
    title: "Оформлюйте замовлення",
    description:
      "Оберіть товар, перевірте інформацію про продавця та оформіть замовлення через UkrTradeHub.",
  },
  {
    number: "02",
    icon: LockKeyhole,
    title: "Безпечна оплата",
    description:
      "Використовуйте доступні на платформі способи оплати та зберігайте підтвердження замовлення.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Перевірте товар",
    description:
      "Після отримання перевірте товар та переконайтеся, що він відповідає опису замовлення.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Зверніться по допомогу",
    description:
      "Якщо виникла проблема, зверніться до продавця або служби підтримки UkrTradeHub.",
  },
];

const protectionFeatures = [
  {
    icon: UserCheck,
    title: "Інформація про продавця",
    description:
      "Перед покупкою ви можете ознайомитися з інформацією про магазин, рейтингом та відгуками.",
  },
  {
    icon: FileText,
    title: "Історія замовлення",
    description:
      "Основна інформація про оформлені замовлення зберігається у вашому особистому кабінеті.",
  },
  {
    icon: MessageCircle,
    title: "Комунікація",
    description:
      "У разі виникнення питань ви можете звернутися до продавця та отримати допомогу.",
  },
  {
    icon: ShieldCheck,
    title: "Підтримка UkrTradeHub",
    description:
      "Якщо проблему не вдалося вирішити безпосередньо з продавцем, зверніться до служби підтримки.",
  },
];

const problems = [
  {
    title: "Товар не відповідає опису",
    description:
      "Зафіксуйте проблему, збережіть фото товару та зверніться до продавця.",
  },
  {
    title: "Товар пошкоджений",
    description:
      "За можливості зафіксуйте стан упаковки та товару одразу після отримання.",
  },
  {
    title: "Замовлення не отримано",
    description:
      "Перевірте інформацію про відправлення та зверніться до продавця або підтримки.",
  },
  {
    title: "Інша проблема",
    description:
      "Опишіть ситуацію службі підтримки, додавши номер замовлення та необхідні матеріали.",
  },
];

const faq = [
  {
    question: "Що робити, якщо товар не відповідає опису?",
    answer:
      "Збережіть товар та упаковку, зробіть фото або відео проблеми та зверніться до продавця. Якщо вирішити питання не вдалося, зверніться до підтримки UkrTradeHub.",
  },
  {
    question: "Що робити, якщо товар пошкоджений?",
    answer:
      "Зафіксуйте пошкодження товару та упаковки. Не викидайте упаковку до з'ясування ситуації. Після цього зверніться до продавця та, за необхідності, до служби підтримки.",
  },
  {
    question: "Чи можу я повернути товар?",
    answer:
      "Можливість та умови повернення залежать від конкретного товару, продавця та вимог законодавства України. Перед оформленням повернення ознайомтеся з умовами продавця.",
  },
  {
    question: "Як звернутися до UkrTradeHub?",
    answer:
      "Ви можете скористатися розділом допомоги та звернутися до служби підтримки. Для швидшого вирішення питання підготуйте номер замовлення та опис проблеми.",
  },
  {
    question: "Чи потрібно зберігати підтвердження покупки?",
    answer:
      "Так. Рекомендуємо зберігати інформацію про замовлення, оплату, доставку та листування щодо проблемної покупки.",
  },
];

export default function BuyerProtectionPage() {
  return (
    <main className="min-h-screen bg-[#080b11] text-white">

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/[0.06]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(16,185,129,0.13),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">

          <div className="mx-auto max-w-3xl text-center">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2 text-xs font-bold text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Захист покупця
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Купуйте впевнено.
              <span className="block text-emerald-400">
                Ми допоможемо.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg">
              UkrTradeHub створений для того, щоб покупки були
              зрозумілими, безпечними та зручними для покупців.
            </p>

          </div>
        </div>
      </section>

      {/* PROTECTION FEATURES */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="mb-10">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
            Ваша безпека
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Що допомагає захистити покупця
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Ми створюємо інструменти, які допомагають покупцю
            приймати обґрунтовані рішення та вирішувати проблеми.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          {protectionFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-emerald-400/20 hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 transition group-hover:bg-emerald-400 group-hover:text-black">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-5 text-lg font-black">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  {feature.description}
                </p>
              </div>
            );
          })}

        </div>
      </section>

      {/* HOW PROTECTION WORKS */}

      <section className="border-y border-white/[0.06] bg-[#0b0f17]">

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

          <div className="mx-auto mb-12 max-w-2xl text-center">

            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              Як це працює
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Від покупки до отримання
            </h2>

            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Дотримуйтесь простих кроків, щоб зробити покупку
              максимально безпечною.
            </p>

          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {protectionSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
                >
                  <div className="flex items-center justify-between">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>

                    <span className="text-4xl font-black text-white/[0.06]">
                      {step.number}
                    </span>

                  </div>

                  <h3 className="mt-6 text-lg font-black">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    {step.description}
                  </p>
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">

          <div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>

            <div className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              Виникла проблема?
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Не хвилюйтеся.
              <span className="block text-zinc-500">
                Розберемося разом.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-500">
              Спочатку спробуйте вирішити питання безпосередньо
              з продавцем. Якщо це не допомогло, зверніться до
              служби підтримки UkrTradeHub.
            </p>

            <Link
              href="/help"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Отримати допомогу
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>

          <div className="grid gap-3 sm:grid-cols-2">

            {problems.map((problem) => (
              <div
                key={problem.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
              >
                <div className="flex items-start gap-3">

                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                  <div>
                    <h3 className="font-bold">
                      {problem.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {problem.description}
                    </p>
                  </div>

                </div>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* IMPORTANT INFO */}

      <section className="border-y border-white/[0.06] bg-[#0b0f17]">

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">

          <div className="grid gap-5 md:grid-cols-3">

            <div className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <Clock3 className="h-5 w-5 shrink-0 text-amber-400" />

              <div>
                <h3 className="font-black">
                  Не зволікайте
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Якщо ви виявили проблему, зверніться до
                  продавця якомога швидше.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <FileText className="h-5 w-5 shrink-0 text-sky-400" />

              <div>
                <h3 className="font-black">
                  Зберігайте документи
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Зберігайте інформацію про замовлення,
                  оплату та доставку.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />

              <div>
                <h3 className="font-black">
                  Безпека понад усе
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Не передавайте стороннім особам паролі та
                  платіжні дані свого акаунта.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* FAQ */}

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="mb-10 text-center">

          <HelpCircle className="mx-auto h-8 w-8 text-emerald-400" />

          <h2 className="mt-4 text-3xl font-black">
            Часті запитання
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500">
            Відповіді на найпоширеніші питання щодо захисту
            покупців на UkrTradeHub.
          </p>

        </div>

        <div className="space-y-3">

          {faq.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold">
                {item.question}

                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-open:rotate-90 group-open:text-emerald-400" />
              </summary>

              <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-sm leading-6 text-zinc-500">
                {item.answer}
              </div>
            </details>
          ))}

        </div>
      </section>

      {/* CTA */}

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">

        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-br from-emerald-400/[0.10] via-white/[0.025] to-transparent p-8 sm:p-12">

          <div className="relative max-w-2xl">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400 text-black">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
              Потрібна допомога із замовленням?
            </h2>

            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Перейдіть до центру допомоги або увійдіть до
              особистого кабінету, щоб переглянути свої замовлення.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">

              <Link
                href="/help"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Центр допомоги
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/orders"
                className="inline-flex items-center rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.05]"
              >
                Мої замовлення
              </Link>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}