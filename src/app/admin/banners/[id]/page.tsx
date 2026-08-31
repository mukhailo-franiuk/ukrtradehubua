import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Store,
  Tag,
  User,
} from "lucide-react";

type Banner = {
  id: string;

  createdById: string;
  shopId: string | null;
  categoryId: string | null;

  title: string | null;
  subtitle: string | null;

  imageUrl: string;
  mobileImageUrl: string | null;

  linkUrl: string | null;

  position: string;
  sortOrder: number;

  startsAt: string | null;
  endsAt: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;

  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };

  shop: {
    id: string;
    name: string;
    slug: string;
  } | null;

  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "Не встановлено";

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function BannerPage({
  params,
}: PageProps) {
  const { id } = await params;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/admin/banners/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return (
      <main className="min-h-screen bg-[#080b11] px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/banners"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до банерів
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/10 bg-red-400/[0.05] p-8">
            <h1 className="text-xl font-black">
              Банер не знайдено
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Можливо, банер був видалений або ID некоректний.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const result = await response.json();

  if (!result.success || !result.banner) {
    return (
      <main className="min-h-screen bg-[#080b11] px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/banners"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до банерів
          </Link>

          <div className="mt-8 rounded-2xl border border-red-400/10 bg-red-400/[0.05] p-8">
            <h1 className="text-xl font-black">
              Не вдалося завантажити банер
            </h1>
          </div>
        </div>
      </main>
    );
  }

  const banner = result.banner as Banner;

  return (
    <main className="min-h-screen bg-[#080b11] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/banners"
              className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Банери
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">
                {banner.title || "Без назви"}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  banner.isActive
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-zinc-400/10 text-zinc-500"
                }`}
              >
                {banner.isActive ? "Активний" : "Неактивний"}
              </span>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Детальна інформація про банер
            </p>
          </div>

          <Link
            href={`/admin/banners/${banner.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
          >
            <Edit3 className="h-4 w-4" />
            Редагувати
          </Link>
        </div>

        {/* CONTENT */}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">

          {/* PREVIEW */}

          <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025]">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-emerald-400" />

                <h2 className="font-black">
                  Попередній перегляд
                </h2>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                <img
                  src={banner.imageUrl}
                  alt={banner.title || "Банер"}
                  className="block h-auto max-h-[520px] w-full object-contain"
                />
              </div>

              {banner.mobileImageUrl && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-400">
                    <ImageIcon className="h-4 w-4" />
                    Мобільне зображення
                  </div>

                  <div className="max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                    <img
                      src={banner.mobileImageUrl}
                      alt={
                        banner.title
                          ? `${banner.title} — mobile`
                          : "Мобільний банер"
                      }
                      className="block h-auto w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* INFO */}

          <aside className="space-y-4">

            {/* MAIN INFO */}

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
                Інформація
              </h2>

              <div className="mt-5 space-y-5">

                <InfoRow
                  icon={<Tag className="h-4 w-4" />}
                  label="Позиція"
                  value={banner.position}
                />

                <InfoRow
                  icon={<ImageIcon className="h-4 w-4" />}
                  label="Порядок"
                  value={String(banner.sortOrder)}
                />

                <InfoRow
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Початок"
                  value={formatDate(banner.startsAt)}
                />

                <InfoRow
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Завершення"
                  value={formatDate(banner.endsAt)}
                />

              </div>
            </div>

            {/* SHOP */}

            {banner.shop && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
                  <Store className="h-4 w-4" />
                  Магазин
                </div>

                <div className="mt-5">
                  <p className="font-black">
                    {banner.shop.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {banner.shop.slug}
                  </p>
                </div>
              </div>
            )}

            {/* CATEGORY */}

            {banner.category && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
                  <Tag className="h-4 w-4" />
                  Категорія
                </div>

                <div className="mt-5">
                  <p className="font-black">
                    {banner.category.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {banner.category.slug}
                  </p>
                </div>
              </div>
            )}

            {/* LINK */}

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
                <Link2 className="h-4 w-4" />
                Посилання
              </div>

              {banner.linkUrl ? (
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-start gap-2 break-all text-sm font-bold text-emerald-400 transition hover:text-emerald-300"
                >
                  <span>{banner.linkUrl}</span>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                </a>
              ) : (
                <p className="mt-4 text-sm text-zinc-600">
                  Посилання не задано
                </p>
              )}
            </div>

          </aside>
        </div>

        {/* TEXT */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
              Контент
            </h2>

            <div className="mt-5 space-y-5">

              <div>
                <p className="text-xs font-bold text-zinc-600">
                  Заголовок
                </p>

                <p className="mt-1 font-bold">
                  {banner.title || "Не задано"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-600">
                  Підзаголовок
                </p>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {banner.subtitle || "Не задано"}
                </p>
              </div>

            </div>
          </div>

          {/* CREATOR */}

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
              Створив
            </h2>

            <div className="mt-5 flex items-center gap-4">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400">
                <User className="h-5 w-5" />
              </div>

              <div>
                <p className="font-black">
                  {banner.createdBy.name || "Без імені"}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  {banner.createdBy.email}
                </p>
              </div>

            </div>
          </div>

        </section>

        {/* DATES */}

        <div className="mt-6 flex flex-wrap gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5 text-xs text-zinc-600">
          <span>
            Створено:{" "}
            <strong className="text-zinc-400">
              {formatDate(banner.createdAt)}
            </strong>
          </span>

          <span>
            Оновлено:{" "}
            <strong className="text-zinc-400">
              {formatDate(banner.updatedAt)}
            </strong>
          </span>

          <span>
            ID:{" "}
            <strong className="font-mono text-zinc-400">
              {banner.id}
            </strong>
          </span>
        </div>

      </div>
    </main>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-zinc-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-zinc-600">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-zinc-300">
          {value}
        </p>
      </div>
    </div>
  );
}