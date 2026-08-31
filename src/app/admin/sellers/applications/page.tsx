import type { Metadata } from "next";
import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Заявки продавців",
};

type AdminSellerApplicationsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
};

const PAGE_SIZE = 20;

function applicationStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";

    case "APPROVED":
      return "Схвалена";

    case "REJECTED":
      return "Відхилена";

    default:
      return status;
  }
}

function applicationStatusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "APPROVED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "REJECTED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function sellerStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує";

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

function sellerStatusStyle(status: string) {
  switch (status) {
    case "PENDING":
      return "text-amber-300";

    case "ACTIVE":
      return "text-emerald-300";

    case "BLOCKED":
      return "text-red-300";

    case "SUSPENDED":
      return "text-orange-300";

    default:
      return "text-zinc-500";
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminSellerApplicationsPage({
  searchParams,
}: AdminSellerApplicationsPageProps) {
  const params = await searchParams;

  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1
  );

  const search = params.search?.trim() || "";
  const status = params.status?.trim() || "";

  const where = {
    ...(status
      ? {
          status: status as "PENDING" | "APPROVED" | "REJECTED",
        }
      : {}),

    ...(search
      ? {
          user: {
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
              {
                phone: {
                  contains: search,
                },
              },
            ],
          },
        }
      : {}),
  };

  const [applications, totalApplications] =
    await Promise.all([
      db.sellerApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              createdAt: true,
              shop: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sellerStatus: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),

      db.sellerApplication.count({
        where,
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalApplications / PAGE_SIZE)
  );

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <ShieldCheck className="h-5 w-5" />

              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Marketplace
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Заявки продавців
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Перегляд та керування заявками на статус продавця
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <div className="text-2xl font-black">
                  {totalApplications.toLocaleString("uk-UA")}
                </div>

                <div className="text-xs text-zinc-600">
                  Всього заявок
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <form
          method="GET"
          className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Пошук за ім'ям, email або телефоном..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30"
              />
            </div>

            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-zinc-400 outline-none transition focus:border-amber-400/30"
            >
              <option value="">
                Усі статуси
              </option>

              <option value="PENDING">
                Очікують
              </option>

              <option value="APPROVED">
                Схвалені
              </option>

              <option value="REJECTED">
                Відхилені
              </option>
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Знайти
            </button>
          </div>
        </form>

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <TableHead>
                    Користувач
                  </TableHead>

                  <TableHead>
                    Телефон
                  </TableHead>

                  <TableHead>
                    Магазин
                  </TableHead>

                  <TableHead>
                    Статус заявки
                  </TableHead>

                  <TableHead>
                    Статус продавця
                  </TableHead>

                  <TableHead>
                    Подана
                  </TableHead>

                  <th className="w-[80px] px-4 py-4" />
                </tr>
              </thead>

              <tbody>
                {applications.map((application) => {
                  const user = application.user;

                  const initials = (
                    user.name ||
                    user.email
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr
                      key={application.id}
                      className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.02]"
                    >
                      {/* USER */}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-sm font-black text-amber-400">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">
                              {user.name || "Без імені"}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-zinc-600">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PHONE */}

                      <td className="px-4 py-4">
                        <span className="text-sm text-zinc-400">
                          {user.phone || "—"}
                        </span>
                      </td>

                      {/* SHOP */}

                      <td className="px-4 py-4">
                        {user.shop ? (
                          <div>
                            <div className="text-sm font-semibold text-zinc-300">
                              {user.shop.name}
                            </div>

                            <div className="mt-0.5 text-xs text-zinc-600">
                              /{user.shop.slug}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-700">
                            Не створено
                          </span>
                        )}
                      </td>

                      {/* APPLICATION STATUS */}

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${applicationStatusStyle(
                            application.status
                          )}`}
                        >
                          {applicationStatusLabel(
                            application.status
                          )}
                        </span>
                      </td>

                      {/* SELLER STATUS */}

                      <td className="px-4 py-4">
                        {user.shop ? (
                          <span
                            className={`text-xs font-bold ${sellerStatusStyle(
                              user.shop.sellerStatus
                            )}`}
                          >
                            {sellerStatusLabel(
                              user.shop.sellerStatus
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-700">
                            —
                          </span>
                        )}
                      </td>

                      {/* CREATED */}

                      <td className="px-4 py-4">
                        <span className="text-xs text-zinc-500">
                          {formatDate(
                            application.createdAt
                          )}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/sellers/applications/${application.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
                          aria-label="Переглянути заявку"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {applications.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-700">
                          <ShieldCheck className="h-6 w-6" />
                        </div>

                        <div className="font-bold text-zinc-400">
                          Заявок не знайдено
                        </div>

                        <div className="mt-1 text-sm text-zinc-700">
                          Спробуйте змінити параметри пошуку
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
              <div className="text-xs text-zinc-600">
                Сторінка {page} з {totalPages}
              </div>

              <div className="flex gap-2">
                <PaginationLink
                  disabled={page <= 1}
                  href={createPageUrl({
                    page: page - 1,
                    search,
                    status,
                  })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationLink>

                <PaginationLink
                  disabled={page >= totalPages}
                  href={createPageUrl({
                    page: page + 1,
                    search,
                    status,
                  })}
                >
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-zinc-700">
      {children}
    </th>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.05] text-zinc-800">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
    >
      {children}
    </Link>
  );
}

function createPageUrl({
  page,
  search,
  status,
}: {
  page: number;
  search: string;
  status: string;
}) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (search) {
    params.set("search", search);
  }

  if (status) {
    params.set("status", status);
  }

  const query = params.toString();

  return query
    ? `/admin/sellers/applications?${query}`
    : "/admin/sellers/applications";
}