
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  HelpCircle,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Доставка та оплата",

  description:
    "Дізнайтеся про способи доставки та оплати замовлень на UkrTradeHub. Нова пошта, Укрпошта, Meest, кур'єрська доставка та самовивіз.",

  keywords: [
    "UkrTradeHub доставка",
    "доставка UkrTradeHub",
    "оплата UkrTradeHub",
    "доставка товарів Україна",
    "Нова пошта",
    "Укрпошта",
    "Meest",
    "кур'єрська доставка",
    "самовивіз",
    "оплата замовлення",
  ],

  alternates: {
    canonical: "/delivery",
  },

  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "https://ukrtradehub.com/delivery",
    siteName: "UkrTradeHub",
    title: "Доставка та оплата | UkrTradeHub",
    description:
      "Способи доставки та оплати замовлень на UkrTradeHub.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Доставка та оплата — UkrTradeHub",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Доставка та оплата | UkrTradeHub",
    description:
      "Способи доставки та оплати замовлень на UkrTradeHub.",
    images: ["/twitter-image"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

const deliveryMethods = [
  {
    icon: Truck,
    title: "Нова пошта",
    description:
      "Отримання у відділенні або поштоматі Нової пошти.",
    features: [
      "Відділення",
      "Поштомати",
      "Кур'єрська доставка",
    ],
  },
  {
    icon: Package,
    title: "Укрпошта",
    description:
      "Доставка у відділення Укрпошти по Україні.",
    features: [
      "Відділення",
      "Адресна доставка",
      "Доступна вартість",
    ],
  },
  {
    icon: MapPin,
    title: "Meest",
    description:
      "Доставка до пунктів видачі та поштоматів Meest.",
    features: [
      "Пункти видачі",
      "Поштомати",
      "Кур'єр",
    ],
  },
  {
    icon: Truck,
    title: "Кур'єр",
    description:
      "Адресна доставка кур'єром, якщо продавець підтримує цей спосіб.",
    features: [
      "До дверей",
      "Зручний час",
      "За умовами продавця",
    ],
  },
];

const paymentMethods = [
  {
    icon: CreditCard,
    title: "Оплата карткою",
    description:
      "Безпечна онлайн-оплата банківською карткою під час оформлення замовлення.",
  },
  {
    icon: ShieldCheck,
    title: "Безпечна оплата",
    description:
      "Платіжні операції проходять через захищені платіжні сервіси.",
  },
  {
    icon: Package,
    title: "Інші способи",
    description:
      "Деякі продавці можуть пропонувати додаткові способи оплати. Доступні варіанти відображаються під час оформлення.",
  },
];

const faq = [
  {
    question: "Скільки коштує доставка?",
    answer:
      "Вартість доставки залежить від способу доставки, розміру та ваги посилки, а також умов конкретного продавця. Остаточна сума відображається під час оформлення замовлення.",
  },
  {
    question: "Хто оплачує доставку?",
    answer:
      "Умови оплати доставки визначаються продавцем. Інформація про вартість та спосіб оплати доставки відображається перед підтвердженням замовлення.",
  },
  {
    question: "Чи можна отримати товар у поштоматі?",
    answer:
      "Так, якщо продавець підтримує відповідний спосіб доставки. Доступні варіанти залежать від конкретного товару та продавця.",
  },
  {
    question: "Коли я отримаю замовлення?",
    answer:
      "Термін доставки залежить від продавця, способу доставки та вашого населеного пункту. Орієнтовний термін відображається під час оформлення.",
  },
  {
    question: "Чи можна відстежувати посилку?",
    answer:
      "Так. Після передачі замовлення перевізнику інформація для відстеження може бути доступна у вашому особистому кабінеті.",
  },
];

export default function DeliveryPage() {
  return (
    <main className="min-h-screen bg-[#080b11] text-white">

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,0.14),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">

          <div className="mx-auto max-w-3xl text-center">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-xs font-bold text-amber-300">
              <Truck className="h-4 w-4" />
              Доставка та оплата
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Отримуйте покупки
              <span className="block text-amber-400">
                зручно та безпечно
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg">
              Обирайте зручний спосіб доставки та оплати
              під час оформлення замовлення на UkrTradeHub.
            </p>

          </div>
        </div>
      </section>

      {/* DELIVERY */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="mb-10">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
            Доставка
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Оберіть зручний спосіб
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Доступні способи доставки залежать від конкретного
            продавця та товару.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {deliveryMethods.map((method) => {
            const Icon = method.icon;

            return (
              <div
                key={method.title}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-amber-400/20 hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 transition group-hover:bg-amber-400 group-hover:text-black">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-5 text-lg font-black">
                  {method.title}
                </h3>

                <p className="mt-2 min-h-[60px] text-sm leading-6 text-zinc-500">
                  {method.description}
                </p>

                <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-5">
                  {method.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-xs text-zinc-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PAYMENT */}

      <section className="border-y border-white/[0.06] bg-[#0b0f17]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

          <div className="mb-10">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              Оплата
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Безпечна оплата замовлень
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;

              return (
                <div
                  key={method.title}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-amber-400">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-5 text-lg font-black">
                    {method.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    {method.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="mb-10 text-center">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
            Як це працює
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Від покупки до отримання
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">

          {[
            ["01", "Оберіть товар", "Знайдіть потрібний товар та додайте його до кошика."],
            ["02", "Оформіть замовлення", "Вкажіть адресу та оберіть спосіб доставки."],
            ["03", "Оплатіть", "Оберіть доступний спосіб оплати та підтвердьте замовлення."],
            ["04", "Отримайте", "Слідкуйте за замовленням та отримайте свою покупку."],
          ].map(([number, title, description]) => (
            <div key={number} className="relative">

              <div className="text-5xl font-black text-white/[0.05]">
                {number}
              </div>

              <h3 className="mt-[-18px] text-lg font-black">
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {description}
              </p>

            </div>
          ))}

        </div>
      </section>

      {/* INFO */}

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:pb-20">

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <Clock3 className="h-6 w-6 text-amber-400" />

            <h3 className="mt-4 font-black">
              Термін доставки
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Залежить від продавця, перевізника та
              населеного пункту отримувача.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />

            <h3 className="mt-4 font-black">
              Захист покупця
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Якщо виникла проблема із замовленням,
              зверніться до служби підтримки UkrTradeHub.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <MapPin className="h-6 w-6 text-sky-400" />

            <h3 className="mt-4 font-black">
              Україна
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Доставка доступна в населені пункти,
              які підтримуються обраним перевізником.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ */}

      <section className="border-t border-white/[0.06] bg-[#0b0f17]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">

          <div className="mb-10 text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-amber-400" />

            <h2 className="mt-4 text-3xl font-black">
              Часті запитання
            </h2>
          </div>

          <div className="space-y-3">
            {faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold">
                  {item.question}

                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-open:rotate-90 group-open:text-amber-400" />
                </summary>

                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 text-sm leading-6 text-zinc-500">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* CTA */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">

        <div className="relative overflow-hidden rounded-3xl border border-amber-400/10 bg-gradient-to-br from-amber-400/[0.12] via-white/[0.025] to-transparent p-8 sm:p-12">

          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Залишилися питання?
            </h2>

            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Наша команда допоможе розібратися з доставкою,
              оплатою або вашим замовленням.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">

              <Link
                href="/help"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300"
              >
                Центр допомоги
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.05]"
              >
                На головну
              </Link>

            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
