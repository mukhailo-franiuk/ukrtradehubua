"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Banner = {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  position: string;
  sortOrder: number;
};

const FALLBACK_BANNER: Banner = {
  id: "fallback",
  imageUrl: "",
  mobileImageUrl: null,
  title: "Великі покупки — вигідні ціни",
  subtitle:
    "Знаходьте товари від українських продавців на UkrTradeHub",
  linkUrl: "/catalog",
  position: "HOME_HERO",
  sortOrder: 0,
};

export default function Hero() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBanners() {
      try {
        const response = await fetch("/api/banners", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Не вдалося завантажити банери");
        }

        const data = await response.json();

        if (!cancelled && data?.success && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      } catch (error) {
        console.error("Hero banners error:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBanners();

    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(() => {
    if (banners.length > 0) {
      return banners;
    }

    return [FALLBACK_BANNER];
  }, [banners]);

  useEffect(() => {
    setCurrent((value) => {
      if (value >= slides.length) {
        return 0;
      }

      return value;
    });
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrent((value) => (value + 1) % slides.length);
    }, 7000);

    return () => {
      window.clearInterval(timer);
    };
  }, [slides.length]);

  const activeBanner = slides[current] ?? FALLBACK_BANNER;

  const goNext = () => {
    setCurrent((value) => (value + 1) % slides.length);
  };

  const goPrevious = () => {
    setCurrent(
      (value) => (value - 1 + slides.length) % slides.length
    );
  };

  const hasImage = Boolean(activeBanner.imageUrl);

  const link =
    activeBanner.linkUrl && activeBanner.linkUrl.trim()
      ? activeBanner.linkUrl
      : "/catalog";

  const isExternal =
    link.startsWith("http://") || link.startsWith("https://");

  if (loading) {
    return (
      <section className="relative w-full overflow-hidden bg-[#0b0d10]">
        <div className="mx-auto flex min-h-[360px] max-w-[1920px] items-center justify-center sm:min-h-[430px] lg:min-h-[560px]">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Завантажуємо банер...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-[#080a0d]">
      <div className="relative mx-auto max-w-[1920px]">
        {/* =====================================================
            BACKGROUND
        ====================================================== */}

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-amber-400/10 blur-[120px]" />

          <div className="absolute -bottom-40 right-[-100px] h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[130px]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_45%)]" />
        </div>

        {/* =====================================================
            SLIDE
        ====================================================== */}

        <div className="relative min-h-[430px] sm:min-h-[500px] lg:min-h-[600px]">
          {hasImage ? (
            <>
              {/* Desktop */}
              <div className="absolute inset-0 hidden md:block">
                <Image
                  src={activeBanner.imageUrl}
                  alt={
                    activeBanner.title ||
                    "UkrTradeHub — український маркетплейс"
                  }
                  fill
                  priority={current === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </div>

              {/* Mobile */}
              <div className="absolute inset-0 md:hidden">
                <Image
                  src={
                    activeBanner.mobileImageUrl ||
                    activeBanner.imageUrl
                  }
                  alt={
                    activeBanner.title ||
                    "UkrTradeHub — український маркетплейс"
                  }
                  fill
                  priority={current === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

              <div className="absolute inset-0 bg-black/10" />
            </>
          ) : (
            /* =================================================
               FALLBACK HERO
            ================================================== */

            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#11151b] via-[#0b0e12] to-[#050608]" />

              <div className="absolute right-[-10%] top-[-30%] h-[600px] w-[600px] rounded-full bg-amber-400/15 blur-[130px]" />

              <div className="absolute bottom-[-30%] right-[15%] h-[450px] w-[450px] rounded-full bg-yellow-500/10 blur-[120px]" />

              <div className="absolute right-[5%] top-[10%] hidden h-[420px] w-[420px] rotate-12 rounded-[70px] border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-sm lg:block" />

              <div className="absolute right-[12%] top-[18%] hidden h-[340px] w-[340px] rotate-[25deg] rounded-[60px] border border-amber-400/20 bg-amber-400/[0.04] lg:block" />

              <div className="absolute right-[18%] top-[27%] hidden h-[250px] w-[250px] rotate-[38deg] rounded-[45px] border border-white/10 bg-white/[0.04] lg:block" />
            </div>
          )}

          {/* ===================================================
              CONTENT
          ==================================================== */}

          <div className="relative z-10 mx-auto flex min-h-[430px] max-w-7xl items-center px-5 py-14 sm:min-h-[500px] sm:px-8 sm:py-16 lg:min-h-[600px] lg:px-10 lg:py-20">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3.5 py-2 text-xs font-semibold text-amber-300 backdrop-blur-md sm:mb-6 sm:text-sm">
                <Sparkles className="h-4 w-4" />
                <span>UkrTradeHub</span>
              </div>

              {/* Title */}
              <h1 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
                {activeBanner.title || "Великі покупки — вигідні ціни"}
              </h1>

              {/* Subtitle */}
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:mt-6 sm:text-lg sm:leading-8 lg:text-xl">
                {activeBanner.subtitle ||
                  "Знаходьте товари від українських продавців на UkrTradeHub"}
              </p>

              {/* CTA */}
              <div className="mt-7 sm:mt-9">
                {isExternal ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-3 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_35px_rgba(251,191,36,0.2)] transition-all hover:bg-amber-300 hover:shadow-[0_15px_45px_rgba(251,191,36,0.3)] active:scale-[0.98] sm:px-7 sm:py-4 sm:text-base"
                  >
                    Перейти до каталогу

                    <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </a>
                ) : (
                  <Link
                    href={link}
                    className="group inline-flex items-center gap-3 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_35px_rgba(251,191,36,0.2)] transition-all hover:bg-amber-300 hover:shadow-[0_15px_45px_rgba(251,191,36,0.3)] active:scale-[0.98] sm:px-7 sm:py-4 sm:text-base"
                  >
                    Перейти до каталогу

                    <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ===================================================
              ARROWS
          ==================================================== */}

          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Попередній банер"
                onClick={goPrevious}
                className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/30 p-3 text-white backdrop-blur-md transition hover:border-white/30 hover:bg-black/50 md:flex"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                aria-label="Наступний банер"
                onClick={goNext}
                className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/30 p-3 text-white backdrop-blur-md transition hover:border-white/30 hover:bg-black/50 md:flex"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* ===================================================
              DOTS
          ==================================================== */}

          {slides.length > 1 && (
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
              {slides.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  aria-label={`Перейти до банера ${index + 1}`}
                  onClick={() => setCurrent(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current
                      ? "w-8 bg-amber-400"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}

          {/* ===================================================
              SLIDE COUNTER
          ==================================================== */}

          {slides.length > 1 && (
            <div className="absolute bottom-6 right-5 z-20 hidden rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md sm:block">
              {String(current + 1).padStart(2, "0")} /{" "}
              {String(slides.length).padStart(2, "0")}
            </div>
          )}
        </div>

        {/* =====================================================
            BOTTOM FEATURES
        ====================================================== */}

        <div className="relative z-20 border-t border-white/[0.06] bg-black/20 backdrop-blur-xl">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/[0.06] px-5 sm:grid-cols-4 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3 py-4 pr-4">
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 sm:flex">
                <Sparkles className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold text-white sm:text-sm">
                  Українські продавці
                </p>
                <p className="hidden text-xs text-zinc-500 sm:block">
                  Надійні магазини
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-4 pl-4 sm:pl-6">
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 sm:flex">
                <ChevronRight className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold text-white sm:text-sm">
                  Великий вибір
                </p>
                <p className="hidden text-xs text-zinc-500 sm:block">
                  Товари в одному місці
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 py-4 pl-6 sm:flex">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <ArrowRight className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  Вигідні пропозиції
                </p>
                <p className="text-xs text-zinc-500">
                  Щоденні новинки
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 py-4 pl-6 sm:flex">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  UkrTradeHub
                </p>
                <p className="text-xs text-zinc-500">
                  Український маркетплейс
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}