
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Користувачі",
  description: "Керування користувачами UkrTradeHub",
  robots: {
    index: false,
    follow: false,
  },
};

type SearchParams = {
  q?: string;
  role?: string;
  status?: string;
  page?: string;
};

const PAGE_SIZE = 20;

function getPage(value?: string) {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function getRoleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Адміністратор";
    case "SELLER":
      return "Продавець";
    case "CUSTOMER":
      return "Покупець";
    default:
      return role;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активний";
    case "BLOCKED":
      return "Заблокований";
    case "SUSPENDED":
      return "Призупинений";
    default:
      return status;
  }
}

function formatDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildUrl(
  params: SearchParams,
  changes: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams();

  const values = {
    q: params.q,
    role: params.role,
    status: params.status,
    page: params.page,
    ...changes,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `/admin/users?${query}` : "/admin/users";
}

async function getUsers(params: SearchParams) {
  const page = getPage(params.page);
  const skip = (page - 1) * PAGE_SIZE;

  const search = params.q?.trim();

  const where = {
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(params.role &&
    ["CUSTOMER", "SELLER", "ADMIN"].includes(params.role)
      ? {
          role: params.role as "CUSTOMER" | "SELLER" | "ADMIN",
        }
      : {}),

    ...(params.status &&
    ["ACTIVE", "BLOCKED", "SUSPENDED"].includes(params.status)
      ? {
          status: params.status as
            | "ACTIVE"
            | "BLOCKED"
            | "SUSPENDED",
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),

    db.user.count({
      where,
    }),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

async function getStats() {
  const [
    total,
    customers,
    sellers,
    admins,
    active,
    blocked,
    suspended,
  ] = await Promise.all([
    db.user.count(),

    db.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

    db.user.count({
      where: {
        role: "SELLER",
      },
    }),

    db.user.count({
      where: {
        role: "ADMIN",
      },
    }),

    db.user.count({
      where: {
        status: "ACTIVE",
      },
    }),

    db.user.count({
      where: {
        isBlocked: true,
      },
    }),

    db.user.count({
      where: {
        status: "SUSPENDED",
      },
    }),
  ]);

  return {
    total,
    customers,
    sellers,
    admins,
    active,
    blocked,
    suspended,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [data, stats] = await Promise.all([
    getUsers(params),
    getStats(),
  ]);

  const start =
    data.total === 0
      ? 0
      : (data.page - 1) * PAGE_SIZE + 1;

  const end = Math.min(
    data.page * PAGE_SIZE,
    data.total
  );

  return (
    <main className="min-h-full bg-[#070a10] p-4 text-white sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-7">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition hover:text-amber-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              <Users className="h-4 w-4" />
              Marketplace
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Користувачі
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Керування користувачами та їхнім доступом до платформи
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
            <Users className="h-4 w-4 text-zinc-600" />

            <span className="text-xs font-bold text-zinc-400">
              {stats.total.toLocaleString("uk-UA")} користувачів
            </span>
          </div>
        </div>
      </div>

      {/* STATS */}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Усього"
          value={stats.total}
        />

        <StatCard
          icon={UserCheck}
          label="Активні"
          value={stats.active}
        />

        <StatCard
          icon={UserPlus}
          label="Продавці"
          value={stats.sellers}
        />

        <StatCard
          icon={UserX}
          label="Заблоковані"
          value={stats.blocked}
          danger
        />
      </section>

      {/* SECONDARY STATS */}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Покупці"
          value={stats.customers}
        />

        <MiniStat
          label="Адміністратори"
          value={stats.admins}
        />

        <MiniStat
          label="Призупинені"
          value={stats.suspended}
        />

        <MiniStat
          label="На сторінці"
          value={data.users.length}
        />
      </section>

      {/* FILTERS */}

      <section className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0b1018] p-4">
        <form
          method="GET"
          action="/admin/users"
          className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]"
        >
          {/* SEARCH */}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Пошук за ім'ям або email..."
              className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30 focus:bg-white/[0.04]"
            />
          </div>

          {/* ROLE */}

          <div className="relative">
            <select
              name="role"
              defaultValue={params.role ?? ""}
              className="h-11 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 pr-9 text-sm text-zinc-400 outline-none transition focus:border-amber-400/30"
            >
              <option value="">Усі ролі</option>
              <option value="CUSTOMER">Покупці</option>
              <option value="SELLER">Продавці</option>
              <option value="ADMIN">Адміністратори</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700" />
          </div>

          {/* STATUS */}

          <div className="relative">
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-11 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 pr-9 text-sm text-zinc-400 outline-none transition focus:border-amber-400/30"
            >
              <option value="">Усі статуси</option>
              <option value="ACTIVE">Активні</option>
              <option value="BLOCKED">Заблоковані</option>
              <option value="SUSPENDED">Призупинені</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700" />
          </div>

          <button
            type="submit"
            className="h-11 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
          >
            Застосувати
          </button>
        </form>

        {(params.q || params.role || params.status) && (
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
            <div className="text-xs text-zinc-600">
              Активні фільтри:
              {params.q && (
                <span className="ml-2 text-zinc-400">
                  «{params.q}»
                </span>
              )}
              {params.role && (
                <span className="ml-2 text-zinc-400">
                  {getRoleLabel(params.role)}
                </span>
              )}
              {params.status && (
                <span className="ml-2 text-zinc-400">
                  {getStatusLabel(params.status)}
                </span>
              )}
            </div>

            <Link
              href="/admin/users"
              className="text-xs font-bold text-amber-400 transition hover:text-amber-300"
            >
              Очистити
            </Link>
          </div>
        )}
      </section>

      {/* DESKTOP TABLE */}

      <section className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1018] lg:block">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-sm font-black text-white">
              Список користувачів
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              {data.total === 0
                ? "Нічого не знайдено"
                : `Показано ${start}–${end} з ${data.total}`}
            </p>
          </div>

          <ShieldCheck className="h-5 w-5 text-zinc-700" />
        </div>

        {data.users.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-left">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">
                    Користувач
                  </th>

                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">
                    Роль
                  </th>

                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">
                    Статус
                  </th>

                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">
                    Останній вхід
                  </th>

                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">
                    Реєстрація
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em] text-zinc-700">
                    Дія
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="group transition hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={user.name}
                          email={user.email}
                        />

                        <div className="min-w-0">
                          <div className="max-w-[260px] truncate text-sm font-bold text-white">
                            {user.name || "Без імені"}
                          </div>

                          <div className="mt-0.5 max-w-[280px] truncate text-xs text-zinc-600">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={user.status}
                        isBlocked={user.isBlocked}
                      />
                    </td>

                    <td className="px-5 py-4 text-xs text-zinc-600">
                      {formatDate(user.lastLoginAt)}
                    </td>

                    <td className="px-5 py-4 text-xs text-zinc-600">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-amber-300"
                      >
                        Переглянути
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MOBILE LIST */}

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1018] lg:hidden">
        <div className="border-b border-white/[0.07] px-4 py-4">
          <h2 className="text-sm font-black text-white">
            Користувачі
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            {data.total === 0
              ? "Нічого не знайдено"
              : `${start}–${end} з ${data.total}`}
          </p>
        </div>

        {data.users.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {data.users.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="block p-4 transition active:bg-white/[0.03]"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    name={user.name}
                    email={user.email}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {user.name || "Без імені"}
                    </div>

                    <div className="mt-1 truncate text-xs text-zinc-600">
                      {user.email}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <RoleBadge role={user.role} />

                      <StatusBadge
                        status={user.status}
                        isBlocked={user.isBlocked}
                      />
                    </div>

                    <div className="mt-3 text-[11px] text-zinc-700">
                      Реєстрація: {formatDate(user.createdAt)}
                    </div>
                  </div>

                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-700" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* PAGINATION */}

      {data.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-700">
            Сторінка {data.page} з {data.totalPages}
          </div>

          <div className="flex items-center gap-2">
            {data.page > 1 && (
              <Link
                href={buildUrl(params, {
                  page: String(data.page - 1),
                })}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] px-3 text-xs font-bold text-zinc-500 transition hover:border-white/15 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Назад
              </Link>
            )}

            {data.page < data.totalPages && (
              <Link
                href={buildUrl(params, {
                  page: String(data.page + 1),
                })}
                className="flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-black transition hover:bg-amber-300"
              >
                Далі
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b1018] p-4 sm:p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          danger
            ? "bg-red-500/10 text-red-400"
            : "bg-amber-400/10 text-amber-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="mt-4 text-2xl font-black text-white">
        {value.toLocaleString("uk-UA")}
      </div>

      <div className="mt-1 text-xs font-semibold text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
      <div className="text-lg font-black text-white">
        {value.toLocaleString("uk-UA")}
      </div>

      <div className="mt-0.5 text-[11px] text-zinc-700">
        {label}
      </div>
    </div>
  );
}

function Avatar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const letter = (name || email).charAt(0).toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-black">
      {letter}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-zinc-400">
      {getRoleLabel(role)}
    </span>
  );
}

function StatusBadge({
  status,
  isBlocked,
}: {
  status: string;
  isBlocked: boolean;
}) {
  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Заблокований
      </span>
    );
  }

  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Активний
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      {getStatusLabel(status)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-700">
        <UserCog className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-sm font-black text-zinc-400">
        Користувачів не знайдено
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-700">
        Спробуйте змінити параметри пошуку або очистити фільтри.
      </p>

      <Link
        href="/admin/users"
        className="mt-4 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-amber-300"
      >
        Показати всіх
      </Link>
    </div>
  );
}