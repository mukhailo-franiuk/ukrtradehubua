"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Send,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Store,
  ArrowUpRight,
} from "lucide-react";

import Logo from "@/components/Logo";

// =====================================================
// FOOTER
// =====================================================

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // =====================================================
  // SUBSCRIBE
  // =====================================================

  function handleSubscribe(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubscribed(true);
    setEmail("");

    setTimeout(() => {
      setSubscribed(false);
    }, 4000);
  }

  // =====================================================
  // LINKS
  // =====================================================

  const footerLinks = [
    {
      title: "Покупцям",
      links: [
        {
          name: "Каталог товарів",
          href: "/catalog",
        },
        {
          name: "Акції",
          href: "/sale",
        },
        {
          name: "Популярні товари",
          href: "/popular",
        },
        {
          name: "Обране",
          href: "/account/favorites",
        },
        {
          name: "Мої замовлення",
          href: "/account/orders",
        },
      ],
    },

    {
      title: "Допомога",
      links: [
        {
          name: "Доставка",
          href: "/delivery",
        },
        {
          name: "Оплата",
          href: "/payments",
        },
        {
          name: "Повернення",
          href: "/returns",
        },
        {
          name: "Часті питання",
          href: "/faq",
        },
        {
          name: "Підтримка",
          href: "/support",
        },
      ],
    },

    {
      title: "UkrTradeHub",
      links: [
        {
          name: "Про нас",
          href: "/about",
        },
        {
          name: "Контакти",
          href: "/contacts",
        },
        {
          name: "Стати продавцем",
          href: "/account/seller",
        },
        {
          name: "Правила маркетплейсу",
          href: "/terms",
        },
        {
          name: "Конфіденційність",
          href: "/privacy",
        },
      ],
    },
  ];

  // =====================================================
  // SOCIALS
  // =====================================================

  const socialLinks = [
    {
      id: "facebook",
      label: "Facebook",
      href: "https://facebook.com",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
        >
          <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.7V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V11H7.7v3h2.7v8h3.1Z" />
        </svg>
      ),
    },

    {
      id: "instagram",
      label: "Instagram",
      href: "https://instagram.com",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-current"
          strokeWidth="1.8"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
          />

          <circle
            cx="12"
            cy="12"
            r="4"
          />

          <circle
            cx="17.3"
            cy="6.8"
            r="1"
            className="fill-current stroke-none"
          />
        </svg>
      ),
    },

    {
      id: "telegram",
      label: "Telegram",
      href: "https://t.me",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
        >
          <path d="M21.8 3.2 18.5 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.9 13.7.9 12.1c-1.1-.3-1.1-1.1.2-1.6L20.6 3c.9-.3 1.7.2 1.2.2Z" />
        </svg>
      ),
    },

    {
      id: "youtube",
      label: "YouTube",
      href: "https://youtube.com",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
        >
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.8V8.2l6.4 3.8-6.4 3.8Z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative z-20 w-full overflow-hidden border-t border-white/[0.06] bg-[#070a10] text-white">

      {/* ================================================= */}
      {/* TOP BENEFITS */}
      {/* ================================================= */}

      <div className="border-b border-white/[0.05]">

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">

          <Benefit
            icon={<Truck size={20} />}
            title="Швидка доставка"
            description="Отримуйте замовлення по Україні"
            iconClass="text-blue-400"
          />

          <Benefit
            icon={<ShieldCheck size={20} />}
            title="Безпечні покупки"
            description="Надійні продавці та захист покупця"
            iconClass="text-emerald-400"
          />

          <Benefit
            icon={<RotateCcw size={20} />}
            title="Зручне повернення"
            description="Прості умови повернення товарів"
            iconClass="text-amber-400"
          />

          <Benefit
            icon={<Headphones size={20} />}
            title="Підтримка"
            description="Ми завжди готові допомогти"
            iconClass="text-purple-400"
          />

        </div>

      </div>

      {/* ================================================= */}
      {/* MAIN FOOTER */}
      {/* ================================================= */}

      <div className="mx-auto max-w-7xl px-4 py-12">

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">

          {/* ================================================= */}
          {/* BRAND */}
          {/* ================================================= */}

          <div className="lg:col-span-4">

            <Logo
              showText={true}
              size="md"
            />

            <p className="mt-5 max-w-sm text-sm leading-6 text-gray-500">
              UkrTradeHub — сучасний український
              маркетплейс, де покупці знаходять товари,
              а продавці розвивають власний бізнес.
            </p>

            {/* SELLER CARD */}

            <Link
              href="/account/seller"
              className="group mt-6 flex max-w-sm items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-amber-500/30 hover:bg-amber-500/[0.04]"
            >

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Store size={20} />
              </div>

              <div className="min-w-0 flex-1">

                <div className="text-sm font-semibold text-white">
                  Хочете продавати?
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Подайте заявку та створіть магазин
                </div>

              </div>

              <ArrowUpRight
                size={17}
                className="text-gray-600 transition group-hover:text-amber-400"
              />

            </Link>

          </div>

          {/* ================================================= */}
          {/* LINKS */}
          {/* ================================================= */}

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-5">

            {footerLinks.map((column) => (
              <div key={column.title}>

                <h3 className="mb-5 border-l-2 border-amber-500 pl-3 text-xs font-black uppercase tracking-wider text-gray-200">
                  {column.title}
                </h3>

                <ul className="space-y-3">

                  {column.links.map((link) => (
                    <li key={link.href}>

                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 transition hover:text-amber-400"
                      >
                        {link.name}
                      </Link>

                    </li>
                  ))}

                </ul>

              </div>
            ))}

          </div>

          {/* ================================================= */}
          {/* NEWSLETTER */}
          {/* ================================================= */}

          <div className="lg:col-span-3">

            <h3 className="text-sm font-bold text-white">
              Будьте в курсі
            </h3>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Отримуйте інформацію про нові товари,
              акції та спеціальні пропозиції.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="mt-5"
            >

              <motion.div
                animate={{
                  borderColor: isFocused
                    ? "rgba(245,158,11,0.6)"
                    : "rgba(255,255,255,0.07)",

                  boxShadow: isFocused
                    ? "0 0 20px rgba(245,158,11,0.08)"
                    : "0 0 0 rgba(0,0,0,0)",
                }}
                className="flex h-11 overflow-hidden rounded-xl border bg-[#101621]"
              >

                <input
                  type="email"
                  value={email}
                  required
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  onFocus={() =>
                    setIsFocused(true)
                  }
                  onBlur={() =>
                    setIsFocused(false)
                  }
                  placeholder="Ваш email"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-gray-600"
                />

                <button
                  type="submit"
                  aria-label="Підписатися"
                  className="flex w-11 shrink-0 items-center justify-center bg-amber-500 text-black transition hover:bg-amber-400"
                >
                  <Send size={16} />
                </button>

              </motion.div>

            </form>

            {subscribed && (
              <motion.p
                initial={{
                  opacity: 0,
                  y: -5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mt-3 text-xs text-emerald-400"
              >
                ✓ Ви успішно підписалися на новини
              </motion.p>
            )}

          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* BOTTOM */}
      {/* ================================================= */}

      <div className="border-t border-white/[0.05]">

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">

          {/* COPYRIGHT */}

          <div className="text-xs text-gray-600">
            © {new Date().getFullYear()}{" "}
            <span className="text-gray-400">
              UkrTradeHub
            </span>
            . Усі права захищено.
          </div>

          {/* LEGAL */}

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">

            <Link
              href="/privacy"
              className="transition hover:text-gray-300"
            >
              Конфіденційність
            </Link>

            <Link
              href="/terms"
              className="transition hover:text-gray-300"
            >
              Умови використання
            </Link>

            <Link
              href="/contacts"
              className="transition hover:text-gray-300"
            >
              Контакти
            </Link>

          </div>

          {/* SOCIAL */}

          <div className="flex items-center gap-2">

            {socialLinks.map((social) => (
              <motion.a
                key={social.id}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                whileHover={{
                  y: -3,
                  scale: 1.05,
                }}
                whileTap={{
                  scale: 0.95,
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-gray-500 transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
              >
                {social.icon}
              </motion.a>
            ))}

          </div>

        </div>

      </div>

    </footer>
  );
}

// =====================================================
// BENEFIT
// =====================================================

function Benefit({
  icon,
  title,
  description,
  iconClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.018] px-4 py-4 transition hover:border-white/[0.09] hover:bg-white/[0.025]">

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">

        <h4 className="text-xs font-bold uppercase tracking-wide text-gray-200">
          {title}
        </h4>

        <p className="mt-1 text-[11px] leading-4 text-gray-600">
          {description}
        </p>

      </div>

    </div>
  );
}