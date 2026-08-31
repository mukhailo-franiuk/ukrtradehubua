"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

interface LogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export default function Logo({
  showText = true,
  size = "md",
  href = "/",
  className = "",
}: LogoProps) {
  const sizes = {
    sm: {
      wrapper: "h-8 w-8 rounded-lg",
      icon: 16,
      title: "text-sm",
      subtitle: "text-[8px]",
    },
    md: {
      wrapper: "h-10 w-10 rounded-xl",
      icon: 20,
      title: "text-base",
      subtitle: "text-[9px]",
    },
    lg: {
      wrapper: "h-12 w-12 rounded-2xl",
      icon: 24,
      title: "text-lg",
      subtitle: "text-[10px]",
    },
  };

  const current = sizes[size];

  return (
    <Link
      href={href}
      aria-label="UkrTradeHub"
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      {/* LOGO ICON */}
      <div
        className={`
          ${current.wrapper}
          relative
          flex
          shrink-0
          items-center
          justify-center
          overflow-hidden
          bg-gradient-to-br
          from-amber-400
          via-amber-500
          to-orange-600
          shadow-lg
          shadow-amber-500/20
          transition-all
          duration-300
          group-hover:scale-105
          group-hover:shadow-amber-500/30
        `}
      >
        {/* glow */}
        <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <ShoppingBag
          size={current.icon}
          strokeWidth={2.4}
          className="relative z-10 text-black"
        />

        {/* small hub dot */}
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
      </div>

      {/* TEXT */}
      {showText && (
        <div className="flex min-w-0 flex-col leading-none">
          <span
            className={`
              ${current.title}
              whitespace-nowrap
              font-black
              tracking-tight
              text-white
              transition-colors
              duration-300
              group-hover:text-amber-400
            `}
          >
            UkrTrade<span className="text-amber-400">Hub</span>
          </span>

          <span
            className={`
              ${current.subtitle}
              mt-1
              whitespace-nowrap
              font-semibold
              uppercase
              tracking-[0.18em]
              text-gray-500
            `}
          >
            Український маркетплейс
          </span>
        </div>
      )}
    </Link>
  );
}