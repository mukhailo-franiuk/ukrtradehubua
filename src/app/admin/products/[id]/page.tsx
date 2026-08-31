import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Package,
  ShoppingBag,
  Store,
  Tag,
  User,
  XCircle,
} from "lucide-react";

import { db } from "@/lib/prisma";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: {
      id,
    },
    select: {
      title: true,
    },
  });

  if (!product) {
    return {
      title: "Товар не знайдено | UkrTradeHub Admin",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${product.title || "Товар"} | Товари`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Number(value).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₴`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toLocaleString("uk-UA");
}

function productStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Активний";

    case "DRAFT":
      return "Чернетка";

    case "ARCHIVED":
      return "Архівований";

    case "BLOCKED":
      return "Заблокований";

    case "INACTIVE":
      return "Неактивний";

    default:
      return status;
  }
}

function productStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "DRAFT":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "BLOCKED":
      return "border-red-400/20 bg-red-400/10 text-red-300";

    case "ARCHIVED":
      return "border-zinc-400/20 bg-zinc-400/10 text-zinc-400";

    case "INACTIVE":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";

    default:
      return "border-zinc-400/10 bg-zinc-400/5 text-zinc-400";
  }
}

function variantStatusStyle(isActive: boolean) {
  return isActive
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : "border-zinc-400/10 bg-zinc-400/5 text-zinc-500";
}

function variantStatusLabel(isActive: boolean) {
  return isActive ? "Активний" : "Неактивний";
}

export default async function AdminProductPage({
  params,
}: ProductPageProps) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: {
      id,
    },

    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          sellerStatus: true,
          isActive: true,
          rating: true,
          productsCount: true,
          salesCount: true,
          ordersCount: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              isBlocked: true,
            },
          },
        },
      },

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      variants: true,

      /*
       * У твоїй Prisma-схемі relation Product називається `attributes`,
       * а не `productAttributeValues`.
       *
       * Тому тут використовуємо тільки relation, яку реально бачить
       * Prisma Client.
       */
      attributes: true,

      _count: {
        select: {
          orderItems: true,
          favorites: true,
          views: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const primaryImage =
    product.images.find((image) => image.isPrimary) ||
    product.images[0];

  const status = product.status;

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* ============================================================
            HEADER
        ============================================================ */}

        <div className="mb-6">
          <Link
            href="/admin/products"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад до товарів
          </Link>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                {primaryImage?.url ? (
                  <img
                    src={primaryImage.url}
                    alt={product.title || "Товар"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-7 w-7 text-zinc-700" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="max-w-3xl truncate text-2xl font-black tracking-tight sm:text-3xl">
                    {product.title || "Без назви"}
                  </h1>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${productStatusStyle(
                      status
                    )}`}
                  >
                    {productStatusLabel(status)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                  <span>/{product.slug}</span>

                  {product.category && (
                    <>
                      <span className="text-zinc-800">•</span>

                      <span>{product.category.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${productStatusStyle(
                  status
                )}`}
              >
                {status === "ACTIVE" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : status === "BLOCKED" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}

                {productStatusLabel(status)}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            CONTENT
        ============================================================ */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* ============================================================
              MAIN
          ============================================================ */}

          <div className="space-y-6">

            {/* PRODUCT INFORMATION */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Інформація про товар
                  </h2>
                </div>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="aspect-square overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070a10]">
                  {primaryImage?.url ? (
                    <img
                      src={primaryImage.url}
                      alt={product.title || "Товар"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-zinc-800" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col">
                  <h2 className="text-xl font-black text-white">
                    {product.title || "Без назви"}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.category && (
                      <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-zinc-400">
                        <Tag className="h-3.5 w-3.5" />

                        {product.category.name}
                      </span>
                    )}

                    {product.isFeatured && (
                      <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                        Рекомендований
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="text-xs text-zinc-600">
                      Ціна
                    </div>

                    <div className="mt-1 text-3xl font-black text-amber-400">
                      {formatPrice(product.price)}
                    </div>
                  </div>

                  {product.description && (
                    <div className="mt-6">
                      <div className="mb-2 text-xs font-bold text-zinc-600">
                        Опис
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* STOCK */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Залишки
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-3">
                <StatCard
                  icon={<Package className="h-5 w-5" />}
                  label="На складі"
                  value={product.stock}
                />

                <StatCard
                  icon={<Clock3 className="h-5 w-5" />}
                  label="Зарезервовано"
                  value={product.reservedStock}
                />

                <StatCard
                  icon={<ShoppingBag className="h-5 w-5" />}
                  label="Замовлень"
                  value={product._count.orderItems}
                />
              </div>
            </section>

            {/* STATISTICS */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />

                  <h2 className="text-sm font-black">
                    Статистика
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/[0.05] md:grid-cols-4">
                <StatCard
                  icon={<Eye className="h-5 w-5" />}
                  label="Перегляди"
                  value={product.viewsCount}
                />

                <StatCard
                  icon={<Heart className="h-5 w-5" />}
                  label="В обраному"
                  value={product.favoritesCount}
                />

                <StatCard
                  icon={<ShoppingBag className="h-5 w-5" />}
                  label="Замовлення"
                  value={product._count.orderItems}
                />

                <StatCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Рейтинг"
                  value={Number(product.rating).toFixed(1)}
                />
              </div>
            </section>

            {/* IMAGES */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-amber-400" />

                    <h2 className="text-sm font-black">
                      Зображення
                    </h2>
                  </div>

                  <span className="text-xs text-zinc-600">
                    {product.images.length}
                  </span>
                </div>
              </div>

              <div className="p-5">
                {product.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {product.images.map((image) => (
                      <div
                        key={image.id}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.07] bg-[#070a10]"
                      >
                        <img
                          src={image.url}
                          alt={image.alt || product.title || "Товар"}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        {image.isPrimary && (
                          <div className="absolute left-2 top-2 rounded-lg border border-amber-400/20 bg-black/70 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-300">
                            Основне
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-8 text-center">
                    <ImageIcon className="mx-auto mb-2 h-7 w-7 text-zinc-700" />

                    <div className="text-sm font-bold text-zinc-500">
                      Зображень немає
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* VARIANTS */}

            {product.variants.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-400" />

                      <h2 className="text-sm font-black">
                        Варіанти товару
                      </h2>
                    </div>

                    <span className="text-xs text-zinc-600">
                      {product.variants.length}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <TableHead>
                          Варіант
                        </TableHead>

                        <TableHead>
                          SKU
                        </TableHead>

                        <TableHead>
                          Ціна
                        </TableHead>

                        <TableHead>
                          Стара ціна
                        </TableHead>

                        <TableHead>
                          Залишок
                        </TableHead>

                        <TableHead>
                          Резерв
                        </TableHead>

                        <TableHead>
                          Статус
                        </TableHead>
                      </tr>
                    </thead>

                    <tbody>
                      {product.variants.map((variant) => (
                        <tr
                          key={variant.id}
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-zinc-300">
                              {variant.title || "Без назви"}
                            </div>

                            <div className="mt-1 font-mono text-[10px] text-zinc-700">
                              {variant.id}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-mono text-xs text-zinc-500">
                              {variant.sku || "—"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-amber-400">
                            {formatPrice(variant.price)}
                          </td>

                          <td className="px-4 py-4 text-sm text-zinc-500">
                            {formatPrice(variant.oldPrice)}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-zinc-300">
                            {formatNumber(variant.stock)}
                          </td>

                          <td className="px-4 py-4 text-sm text-zinc-500">
                            {formatNumber(variant.reservedStock)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${variantStatusStyle(
                                variant.isActive
                              )}`}
                            >
                              {variantStatusLabel(
                                variant.isActive
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ATTRIBUTES */}

            {product.attributes.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-amber-400" />

                    <h2 className="text-sm font-black">
                      Характеристики
                    </h2>
                  </div>
                </div>

                <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2">
                  {product.attributes.map((attribute) => {
                    /*
                     * Не припускаємо структуру Attribute.
                     * Показуємо JSON без вигаданих полів.
                     */
                    const record =
                      attribute &&
                      typeof attribute === "object"
                        ? (attribute as Record<string, unknown>)
                        : null;

                    const label =
                      typeof record?.name === "string"
                        ? record.name
                        : typeof record?.title === "string"
                        ? record.title
                        : "Характеристика";

                    const value =
                      typeof record?.value === "string"
                        ? record.value
                        : typeof record?.value === "number"
                        ? String(record.value)
                        : "—";

                    return (
                      <InfoItem
                        key={
                          typeof record?.id === "string"
                            ? record.id
                            : `${label}-${value}`
                        }
                        label={label}
                        value={value}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ============================================================
              SIDEBAR
          ============================================================ */}

          <aside className="space-y-6">

            {/* PRODUCT */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Товар
                </div>

                <Package className="h-4 w-4 text-zinc-700" />
              </div>

              <div className="space-y-4">
                <SidebarItem
                  label="ID"
                  value={product.id}
                  mono
                />

                <SidebarItem
                  label="Slug"
                  value={`/${product.slug}`}
                />

                <SidebarItem
                  label="Статус"
                  value={productStatusLabel(product.status)}
                />

                <SidebarItem
                  label="Створено"
                  value={formatDate(product.createdAt)}
                />

                <SidebarItem
                  label="Оновлено"
                  value={formatDate(product.updatedAt)}
                />
              </div>
            </section>

            {/* SHOP */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Магазин
                </div>

                <Store className="h-4 w-4 text-zinc-700" />
              </div>

              {product.shop ? (
                <div>
                  <div className="text-base font-black text-white">
                    {product.shop.name}
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    /{product.shop.slug}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat
                      label="Товари"
                      value={product.shop.productsCount}
                    />

                    <MiniStat
                      label="Продажі"
                      value={product.shop.salesCount}
                    />

                    <MiniStat
                      label="Замовлення"
                      value={product.shop.ordersCount}
                    />

                    <MiniStat
                      label="Рейтинг"
                      value={Number(product.shop.rating).toFixed(1)}
                    />
                  </div>

                  <Link
                    href={`/admin/sellers/${product.shop.user.id}`}
                    className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs font-bold text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-white"
                  >
                    <span>
                      Переглянути продавця
                    </span>

                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-zinc-600">
                  Магазин не знайдено
                </div>
              )}
            </section>

            {/* SELLER */}

            {product.shop?.user && (
              <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    Продавець
                  </div>

                  <User className="h-4 w-4 text-zinc-700" />
                </div>

                <div className="space-y-4">
                  <SidebarItem
                    label="Ім'я"
                    value={
                      product.shop.user.name ||
                      "Без імені"
                    }
                  />

                  <SidebarItem
                    label="Email"
                    value={product.shop.user.email}
                  />

                  <SidebarItem
                    label="Телефон"
                    value={
                      product.shop.user.phone ||
                      "—"
                    }
                  />

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-zinc-600">
                      Статус
                    </span>

                    <span
                      className={
                        product.shop.user.isBlocked
                          ? "text-xs font-bold text-red-300"
                          : "text-xs font-bold text-emerald-300"
                      }
                    >
                      {product.shop.user.isBlocked
                        ? "Заблокований"
                        : product.shop.user.status}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* CATEGORY */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Категорія
              </div>

              {product.category ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                      <Tag className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-zinc-300">
                        {product.category.name}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-zinc-600">
                        /{product.category.slug}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/categories/${product.category.id}`}
                    className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs font-bold text-zinc-400 transition hover:border-amber-400/20 hover:bg-amber-400/[0.05] hover:text-white"
                  >
                    <span>
                      Переглянути категорію
                    </span>

                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-zinc-600">
                  Категорію не призначено
                </div>
              )}
            </section>

            {/* QUICK LINKS */}

            <section className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Швидкі переходи
              </div>

              <div className="space-y-2">
                {product.shop && (
                  <QuickLink
                    href={`/admin/sellers/${product.shop.user.id}`}
                    icon={<Store className="h-4 w-4" />}
                    label="Профіль продавця"
                  />
                )}

                <QuickLink
                  href="/admin/products"
                  icon={<Package className="h-4 w-4" />}
                  label="Усі товари"
                />

                <QuickLink
                  href="/admin/orders"
                  icon={<ShoppingBag className="h-4 w-4" />}
                  label="Замовлення"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0b0f16] p-4">
      <div className="mb-1.5 text-[11px] text-zinc-600">
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
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0b0f16] p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="text-2xl font-black text-white">
        {typeof value === "number"
          ? value.toLocaleString("uk-UA")
          : value}
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