
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  Store,
  User,
  XCircle,
} from "lucide-react";

import { db } from "@/lib/prisma";

type ApplicationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: ApplicationPageProps): Promise<Metadata> {
  const { id } = await params;

  const application = await db.sellerApplication.findUnique({
    where: { id },
    select: {
      businessName: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!application) {
    return {
      title: "Заявку не знайдено | UkrTradeHub Admin",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    application.businessName ||
    application.user.name ||
    application.user.email;

  return {
    title: `${title} | Заявка продавця`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

function formatDate(date: Date | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function applicationStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Очікує розгляду";

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

function userStatusLabel(status: string) {
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

function userStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "BLOCKED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "SUSPENDED":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function roleLabel(role: string) {
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

export default async function AdminSellerApplicationPage({
  params,
}: ApplicationPageProps) {
  const { id } = await params;

  const application = await db.sellerApplication.findUnique({
    where: { id },

    include: {
      user: {
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              sellerStatus: true,
              isActive: true,
              rating: true,
              productsCount: true,
              salesCount: true,
              ordersCount: true,
            },
          },

          _count: {
            select: {
              sessions: true,
              orders: true,
              productReviews: true,
              shopReviews: true,
              reports: true,
            },
          },
        },
      },
    },
  });

  if (!application) {
    notFound();
  }

  const user = application.user;

  const initials = (
    user.name ||
    application.businessName ||
    user.email
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const isPending = application.status === "PENDING";
  const isApproved = application.status === "APPROVED";
  const isRejected = application.status === "REJECTED";

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6">
          <Link
            href="/admin/sellers/applications"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до заявок
          </Link>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-black shadow-lg shadow-amber-400/10">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
                    {application.businessName ||
                      user.name ||
                      "Заявка продавця"}
                  </h1>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${applicationStatusStyle(
                      application.status
                    )}`}
                  >
                    {applicationStatusLabel(application.status)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-zinc-500">
                  Заявка продавця · {user.email}
                </p>
              </div>
            </div>

            {/* ACTIONS */}

            {isPending && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/api/admin/sellers/applications/${application.id}/approve`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-400/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Схвалити заявку
                </Link>

                <Link
                  href={`/admin/sellers/applications/${application.id}/reject`}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-400/20"
                >
                  <XCircle className="h-4 w-4" />
                  Відхилити заявку
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          <div className="space-y-6">

            {/* STATUS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Статус заявки
                  </h2>
                </div>
              </div>

              <div className="p-5">
                <div
                  className={`flex items-center gap-4 rounded-2xl border p-5 ${applicationStatusStyle(
                    application.status
                  )}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10">
                    {isPending && (
                      <Clock3 className="h-6 w-6" />
                    )}

                    {isApproved && (
                      <CheckCircle2 className="h-6 w-6" />
                    )}

                    {isRejected && (
                      <XCircle className="h-6 w-6" />
                    )}
                  </div>

                  <div>
                    <div className="text-lg font-black">
                      {applicationStatusLabel(
                        application.status
                      )}
                    </div>

                    <div className="mt-1 text-xs opacity-70">
                      Подана: {formatDate(application.createdAt)}
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] px-4 py-3 text-xs leading-5 text-zinc-500">
                    Заявка очікує рішення адміністратора.
                    Після схвалення користувач стане продавцем,
                    а його магазин — активним.
                  </div>
                )}

                {isApproved && (
                  <div className="mt-4 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] px-4 py-3 text-xs leading-5 text-emerald-300/70">
                    Заявку схвалено. Користувач має статус продавця.
                  </div>
                )}

                {isRejected && (
                  <div className="mt-4 rounded-xl border border-red-400/10 bg-red-400/[0.03] px-4 py-3 text-xs leading-5 text-red-300/70">
                    Заявку відхилено.
                  </div>
                )}
              </div>
            </section>

            {/* BUSINESS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Інформація про бізнес
                  </h2>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2">
                <InfoItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="Назва бізнесу"
                  value={application.businessName || "Не вказано"}
                />

                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Телефон заявки"
                  value={
                    application.phone ||
                    user.phone ||
                    "Не вказано"
                  }
                />

                <InfoItem
                  icon={<FileText className="h-4 w-4" />}
                  label="Податковий номер"
                  value={
                    application.taxNumber || "Не вказано"
                  }
                />

                <InfoItem
                  icon={<Globe className="h-4 w-4" />}
                  label="Вебсайт"
                  value={
                    application.website || "Не вказано"
                  }
                />
              </div>
            </section>

            {/* DESCRIPTION */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Опис бізнесу
                  </h2>
                </div>
              </div>

              <div className="p-5">
                {application.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                    {application.description}
                  </p>
                ) : (
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-5 text-sm text-zinc-600">
                    Опис бізнесу не вказано.
                  </div>
                )}
              </div>
            </section>

            {/* ADMIN NOTE */}

            {application.adminNote && (
              <section className="overflow-hidden rounded-2xl border border-amber-400/10 bg-amber-400/[0.03]">
                <div className="border-b border-amber-400/10 px-5 py-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Shield className="h-4 w-4" />

                    <h2 className="text-sm font-black">
                      Примітка адміністратора
                    </h2>
                  </div>
                </div>

                <div className="p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                    {application.adminNote}
                  </p>
                </div>
              </section>
            )}

            {/* USER */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Обліковий запис заявника
                  </h2>
                </div>
              </div>

              <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2">
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Ім'я"
                  value={user.name || "Не вказано"}
                />

                <InfoItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={user.email}
                />

                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Телефон"
                  value={user.phone || "Не вказано"}
                />

                <InfoItem
                  icon={<Shield className="h-4 w-4" />}
                  label="Роль"
                  value={roleLabel(user.role)}
                />

                <InfoItem
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Статус акаунта"
                  value={userStatusLabel(user.status)}
                />

                <InfoItem
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Реєстрація"
                  value={formatDate(user.createdAt)}
                />
              </div>
            </section>

            {/* ACTIVITY */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Активність акаунта
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-3">
                <StatCard
                  label="Замовлення"
                  value={user._count.orders}
                />

                <StatCard
                  label="Відгуки про товари"
                  value={user._count.productReviews}
                />

                <StatCard
                  label="Відгуки про магазини"
                  value={user._count.shopReviews}
                />

                <StatCard
                  label="Сесії"
                  value={user._count.sessions}
                />

                <StatCard
                  label="Скарги"
                  value={user._count.reports}
                />
              </div>
            </section>
          </div>

          {/* SIDEBAR */}

          <aside className="space-y-6">

            {/* APPLICATION */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Заявка
              </div>

              <div className="space-y-4">
                <SidebarItem
                  label="ID заявки"
                  value={application.id}
                  mono
                />

                <SidebarItem
                  label="Статус"
                  value={applicationStatusLabel(
                    application.status
                  )}
                />

                <SidebarItem
                  label="Створено"
                  value={formatDate(application.createdAt)}
                />

                <SidebarItem
                  label="Оновлено"
                  value={formatDate(application.updatedAt)}
                />
              </div>
            </section>

            {/* USER */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Заявник
              </div>

              <div className="space-y-4">
                <SidebarItem
                  label="ID користувача"
                  value={user.id}
                  mono
                />

                <SidebarItem
                  label="Email"
                  value={user.email}
                />

                <SidebarItem
                  label="Телефон"
                  value={user.phone || "—"}
                />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-600">
                    Роль
                  </span>

                  <span className="text-xs font-bold text-zinc-300">
                    {roleLabel(user.role)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-600">
                    Статус
                  </span>

                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${userStatusStyle(
                      user.status
                    )}`}
                  >
                    {userStatusLabel(user.status)}
                  </span>
                </div>

                {user.isBlocked && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-400/10 bg-red-400/5 px-3 py-3 text-xs font-bold text-red-300">
                    <ShieldAlert className="h-4 w-4" />
                    Користувач заблокований
                  </div>
                )}
              </div>
            </section>

            {/* SHOP */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Магазин
                </div>

                <Store className="h-4 w-4 text-zinc-700" />
              </div>

              {user.shop ? (
                <div>
                  <div className="text-base font-black text-white">
                    {user.shop.name}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    /{user.shop.slug}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat
                      label="Товари"
                      value={user.shop.productsCount}
                    />

                    <MiniStat
                      label="Продажі"
                      value={user.shop.salesCount}
                    />

                    <MiniStat
                      label="Замовлення"
                      value={user.shop.ordersCount}
                    />

                    <MiniStat
                      label="Рейтинг"
                      value={Number(user.shop.rating).toFixed(1)}
                    />
                  </div>

                  <Link
                    href={`/admin/sellers/${user.id}`}
                    className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs font-bold text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-white"
                  >
                    <span>Переглянути продавця</span>

                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-5 text-center">
                  <Store className="mx-auto mb-2 h-6 w-6 text-zinc-700" />

                  <div className="text-xs font-bold text-zinc-500">
                    Магазин ще не створено
                  </div>
                </div>
              )}
            </section>

            {/* QUICK LINKS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Швидкі переходи
              </div>

              <div className="space-y-2">
                <QuickLink
                  href={`/admin/users/${user.id}`}
                  icon={<User className="h-4 w-4" />}
                  label="Профіль користувача"
                />

                {user.shop && (
                  <QuickLink
                    href={`/admin/sellers/${user.id}`}
                    icon={<Store className="h-4 w-4" />}
                    label="Профіль продавця"
                  />
                )}

                <QuickLink
                  href="/admin/sellers/applications"
                  icon={<FileText className="h-4 w-4" />}
                  label="Усі заявки"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0b0f16] p-4">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-zinc-600">
        {icon}
        {label}
      </div>

      <div className="break-words text-sm font-semibold text-zinc-300">
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-[#0b0f16] p-5">
      <div className="text-2xl font-black text-white">
        {value.toLocaleString("uk-UA")}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-zinc-600">
        {label}
      </span>

      <span
        className={`max-w-[220px] break-words text-right text-xs text-zinc-400 ${
          mono ? "font-mono text-[10px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="text-sm font-black text-white">
        {typeof value === "number"
          ? value.toLocaleString("uk-UA")
          : value}
      </div>

      <div className="mt-0.5 text-[10px] text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 text-sm font-medium text-zinc-400 transition hover:border-amber-400/10 hover:bg-amber-400/[0.05] hover:text-white"
    >
      <span className="text-zinc-600">
        {icon}
      </span>

      <span className="flex-1">
        {label}
      </span>

      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-zinc-700" />
    </Link>
  );
}