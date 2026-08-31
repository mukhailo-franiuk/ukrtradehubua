import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Акції та знижки | UkrTradeHub",
  description:
    "Найкращі акції, знижки та спеціальні пропозиції на UkrTradeHub.",
  keywords: [
    "UkrTradeHub",
    "акції",
    "знижки",
    "розпродаж",
    "Flash Deals",
    "маркетплейс України",
  ],
  alternates: {
    canonical: "/deals",
  },
  openGraph: {
    title: "Акції та знижки | UkrTradeHub",
    description:
      "Найкращі акції, знижки та спеціальні пропозиції на UkrTradeHub.",
    url: "/deals",
    siteName: "UkrTradeHub",
    locale: "uk_UA",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DealsPage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-sm font-semibold uppercase tracking-wider text-amber-400">
            UkrTradeHub
          </span>

          <h1 className="mt-3 text-4xl font-black sm:text-6xl">
            Акції та знижки
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-400">
            Найкращі пропозиції, Flash Deals та спеціальні ціни
            від продавців UkrTradeHub.
          </p>
        </div>
      </section>
    </main>
  );
}