
"use client";

import {
  Bell,
  Menu,
  Search,
} from "lucide-react";

type AdminHeaderProps = {
  onMenuClick: () => void;
};

export default function AdminHeader({
  onMenuClick,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-white/[0.07] bg-[#080b11]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex w-full items-center gap-4">
        {/* MOBILE MENU */}

        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-400 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
          aria-label="Відкрити меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* SEARCH */}

        <div className="hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

            <input
              type="search"
              placeholder="Пошук в адмін-панелі..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400/30 focus:bg-white/[0.04]"
            />
          </div>
        </div>

        <div className="flex-1 md:hidden" />

        {/* NOTIFICATIONS */}

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
          aria-label="Сповіщення"
        >
          <Bell className="h-[18px] w-[18px]" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
        </button>

        {/* ADMIN */}

        <div className="hidden h-10 items-center gap-3 border-l border-white/[0.07] pl-4 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-black">
            A
          </div>

          <div className="hidden xl:block">
            <div className="text-xs font-bold">
              Адміністратор
            </div>

            <div className="text-[10px] text-zinc-600">
              ADMIN
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}