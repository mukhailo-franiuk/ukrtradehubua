
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Ticket,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Зв'язатися з підтримкою",

  description:
    "Зв'яжіться зі службою підтримки UkrTradeHub. Отримайте допомогу щодо замовлень, оплати, доставки, повернення товарів, акаунта або роботи продавця.",

  keywords: [
    "UkrTradeHub підтримка",
    "UkrTradeHub контакти",
    "зв'язатися з UkrTradeHub",
    "служба підтримки",
    "підтримка покупців",
    "підтримка продавців",
    "допомога із замовленням",
    "маркетплейс Україна",
  ],

  alternates: {
    canonical: "/help/contact",
  },

  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "https://ukrtradehub.com/help/contact",
    siteName: "UkrTradeHub",
    title: "Зв'язатися з підтримкою | UkrTradeHub",
    description:
      "Отримайте допомогу від команди UkrTradeHub щодо замовлень, доставки, оплати та роботи маркетплейсу.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Підтримка UkrTradeHub",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Зв'язатися з підтримкою | UkrTradeHub",
    description:
      "Служба підтримки UkrTradeHub допоможе вирішити питання щодо покупок і продажів.",
    images: ["/twitter-image"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

const topics = [
  "Проблема із замовленням",
  "Оплата",
  "Доставка",
  "Повернення товару",
  "Проблема з продавцем",
  "Акаунт",
  "Продажі",
  "Інше",
];

export default function ContactSupportPage() {
  return (
    <main className="min-h-screen bg-[#080b11] text-white">

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/[0.06]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,0.14),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">

          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Центр допомоги
          </Link>

          <div className="mx-auto mt-10 max-w-3xl text-center">

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <MessageCircle className="h-7 w-7" />
            </div>

            <div className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              Підтримка UkrTradeHub
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Ми готові
              <span className="block text-amber-400">
                вам допомогти
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-500">
              Опишіть свою проблему, і команда UkrTradeHub
              допоможе знайти рішення.
            </p>

          </div>
        </div>
      </section>

      {/* MAIN */}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* FORM */}

          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">

            <div className="mb-8">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                  <Ticket className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    Створити звернення
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Заповніть форму нижче
                  </p>
                </div>

              </div>

            </div>

            <form className="space-y-6">

              {/* NAME + EMAIL */}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-bold"
                  >
                    Ваше ім'я
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Михайло"
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                  />
                </div>

              </div>

              {/* TOPIC */}

              <div>
                <label
                  htmlFor="topic"
                  className="mb-2 block text-sm font-bold"
                >
                  Тема звернення
                </label>

                <select
                  id="topic"
                  name="topic"
                  defaultValue=""
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0b0f17] px-4 text-sm text-white outline-none transition focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                >
                  <option value="" disabled>
                    Оберіть тему
                  </option>

                  {topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              {/* ORDER */}

              <div>
                <label
                  htmlFor="orderId"
                  className="mb-2 block text-sm font-bold"
                >
                  Номер замовлення
                  <span className="ml-2 font-normal text-zinc-600">
                    необов'язково
                  </span>
                </label>

                <input
                  id="orderId"
                  name="orderId"
                  type="text"
                  placeholder="Наприклад: ORD-123456"
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>

              {/* MESSAGE */}

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-bold"
                >
                  Повідомлення
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows={7}
                  placeholder="Опишіть вашу проблему якомога детальніше..."
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>

              {/* PRIVACY */}

              <div className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">

                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <p className="text-xs leading-5 text-zinc-500">
                  Не надсилайте паролі, PIN-коди, CVV та інші
                  конфіденційні платіжні дані. Для вирішення
                  питання достатньо інформації про замовлення
                  та опису проблеми.
                </p>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300 active:scale-[0.99]"
              >
                <Send className="h-4 w-4" />
                Надіслати звернення
              </button>

            </form>

          </div>

          {/* SIDEBAR */}

          <aside className="space-y-4">

            {/* RESPONSE */}

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                <Clock3 className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-lg font-black">
                Ми на зв'язку
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Ми намагатимемося відповісти на ваше звернення
                якомога швидше.
              </p>

            </div>

            {/* EMAIL */}

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                <Mail className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-lg font-black">
                Email
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Напишіть нам електронною поштою.
              </p>

              <a
                href="mailto:support@ukrtradehub.com"
                className="mt-4 inline-flex text-sm font-bold text-sky-400 transition hover:text-sky-300"
              >
                support@ukrtradehub.com
              </a>

            </div>

            {/* PHONE */}

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Phone className="h-5 w-5" />
              </div>

              <h3 className="mt-5 text-lg font-black">
                Телефон
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Якщо для вашого звернення доступна телефонна
                підтримка, відповідні контакти будуть вказані
                в офіційних каналах UkrTradeHub.
              </p>

            </div>

          </aside>

        </div>
      </section>

      {/* BEFORE CONTACT */}

      <section className="border-t border-white/[0.06] bg-[#0b0f17]">

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">

          <div className="grid gap-4 md:grid-cols-3">

            <Link
              href="/help"
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-amber-400/20"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                  <MessageCircle className="h-5 w-5" />
                </div>

                <ArrowLeft className="h-4 w-4 text-zinc-700 transition group-hover:-translate-x-1 group-hover:text-amber-400" />

              </div>

              <h3 className="mt-5 font-black">
                Центр допомоги
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Переглянути популярні питання та відповіді.
              </p>
            </Link>

            <Link
              href="/delivery"
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-amber-400/20"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <ArrowRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-amber-400" />

              </div>

              <h3 className="mt-5 font-black">
                Доставка та оплата
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Перевірити інформацію перед зверненням.
              </p>
            </Link>

            <Link
              href="/buyer-protection"
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-emerald-400/20"
            >
              <div className="flex items-center justify-between">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <ArrowRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-1 group-hover:text-emerald-400" />

              </div>

              <h3 className="mt-5 font-black">
                Захист покупця
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Дізнатися, як діяти у проблемній ситуації.
              </p>
            </Link>

          </div>

        </div>
      </section>

    </main>
  );
}