import type { Metadata } from "next";
import Link from "next/link";

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Image as ImageIcon,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { db } from "@/lib/prisma";

import DeleteCategoryButton from "./DeleteCategoryButton";

export const metadata: Metadata = {
  title: "Категорії | UkrTradeHub Admin",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminCategoriesPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
};

type CategoryNode = {
  id: string;
  parentId: string | null;

  name: string;
  slug: string;
  description: string | null;

  imageUrl: string | null;
  icon: string | null;

  isActive: boolean;
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;

  products: {
    id: string;
  }[];

  children: CategoryNode[];
};

// =====================================================
// BUILD CATEGORY TREE
// =====================================================

function buildTree(
  categories: CategoryNode[]
): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const category of categories) {
    map.set(category.id, {
      ...category,
      children: [],
    });
  }

  for (const category of categories) {
    const current = map.get(category.id);

    if (!current) {
      continue;
    }

    if (category.parentId) {
      const parent = map.get(category.parentId);

      if (parent) {
        parent.children.push(current);
      } else {
        roots.push(current);
      }
    } else {
      roots.push(current);
    }
  }

  const sortTree = (
    nodes: CategoryNode[]
  ) => {
    nodes.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(
        b.name,
        "uk-UA"
      );
    });

    for (const node of nodes) {
      sortTree(node.children);
    }
  };

  sortTree(roots);

  return roots;
}

// =====================================================
// COUNT CATEGORIES
// =====================================================

function countCategories(
  nodes: CategoryNode[]
): number {
  return nodes.reduce(
    (total, node) =>
      total +
      1 +
      countCategories(node.children),
    0
  );
}

// =====================================================
// COUNT PRODUCTS
// =====================================================

function countProducts(
  nodes: CategoryNode[]
): number {
  return nodes.reduce(
    (total, node) =>
      total +
      node.products.length +
      countProducts(node.children),
    0
  );
}

// =====================================================
// CATEGORY ROW
// =====================================================

function CategoryRow({
  category,
  level = 0,
}: {
  category: CategoryNode;
  level?: number;
}) {
  const hasChildren =
    category.children.length > 0;

  return (
    <>
      <tr className="border-b border-white/[0.05] transition hover:bg-white/[0.025]">
        {/* CATEGORY */}

        <td className="px-4 py-4">
          <div
            className="flex items-center gap-3"
            style={{
              paddingLeft: `${level * 28}px`,
            }}
          >
            {/* IMAGE */}

            <div
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
                category.isActive
                  ? "border-amber-400/10 bg-amber-400/10"
                  : "border-white/[0.05] bg-white/[0.02]"
              }`}
            >
              {category.imageUrl ? (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover"
                />
              ) : category.icon ? (
                <span className="text-sm">
                  {category.icon}
                </span>
              ) : (
                <FolderTree
                  className={`h-4 w-4 ${
                    category.isActive
                      ? "text-amber-400"
                      : "text-zinc-700"
                  }`}
                />
              )}
            </div>

            {/* NAME */}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                ) : level > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-800" />
                ) : null}

                <span className="truncate text-sm font-bold text-zinc-200">
                  {category.name}
                </span>
              </div>

              <div className="mt-1 truncate font-mono text-[10px] text-zinc-700">
                /{category.slug}
              </div>
            </div>
          </div>
        </td>

        {/* PRODUCTS */}

        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-700" />

            <span className="text-sm font-bold text-zinc-300">
              {category.products.length.toLocaleString(
                "uk-UA"
              )}
            </span>

            <span className="text-xs text-zinc-700">
              {category.products.length === 1
                ? "товар"
                : "товарів"}
            </span>
          </div>
        </td>

        {/* SORT */}

        <td className="px-4 py-4">
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-xs text-zinc-500">
            {category.sortOrder}
          </span>
        </td>

        {/* STATUS */}

        <td className="px-4 py-4">
          {category.isActive ? (
            <span className="inline-flex rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
              Активна
            </span>
          ) : (
            <span className="inline-flex rounded-lg border border-zinc-400/10 bg-zinc-400/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-500">
              Неактивна
            </span>
          )}
        </td>

        {/* ACTIONS */}

        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-2">
            {/* EDIT */}

            <Link
              href={`/admin/categories/${category.id}`}
              aria-label={`Редагувати ${category.name}`}
              title="Редагувати"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:border-amber-400/20 hover:bg-amber-400/10 hover:text-amber-400"
            >
              <Pencil className="h-4 w-4" />
            </Link>

            {/* DELETE */}

            <DeleteCategoryButton
              id={category.id}
              name={category.name}
            />
          </div>
        </td>
      </tr>

      {/* CHILDREN */}

      {category.children.map(
        (child) => (
          <CategoryRow
            key={child.id}
            category={child}
            level={level + 1}
          />
        )
      )}
    </>
  );
}

// =====================================================
// PAGE
// =====================================================

export default async function AdminCategoriesPage({
  searchParams,
}: AdminCategoriesPageProps) {
  const params = await searchParams;

  const search =
    params.search?.trim() || "";

  const status =
    params.status?.trim() || "";

  // ===================================================
  // DATABASE
  // ===================================================

  const categories =
    await db.category.findMany({
      where: {
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  slug: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),

        ...(status === "active"
          ? {
              isActive: true,
            }
          : status === "inactive"
            ? {
                isActive: false,
              }
            : {}),
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],

      include: {
        products: {
          select: {
            id: true,
          },
        },

        children: {
          select: {
            id: true,
          },
        },
      },
    });

  // ===================================================
  // NORMALIZE
  // ===================================================

  const nodes: CategoryNode[] =
    categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,

      name: category.name,
      slug: category.slug,
      description: category.description,

      imageUrl: category.imageUrl,
      icon: category.icon,

      isActive: category.isActive,
      sortOrder: category.sortOrder,

      createdAt: category.createdAt,
      updatedAt: category.updatedAt,

      products: category.products,

      children: [],
    }));

  // ===================================================
  // TREE
  // ===================================================

  const tree = buildTree(nodes);

  // ===================================================
  // STATS
  // ===================================================

  const totalCategories =
    countCategories(tree);

  const totalProducts =
    countProducts(tree);

  const activeCategories =
    nodes.filter(
      (category) => category.isActive
    ).length;

  const inactiveCategories =
    nodes.filter(
      (category) => !category.isActive
    ).length;

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <main className="min-h-full bg-[#070a10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ============================================
            HEADER
        ============================================ */}

        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-amber-400">
              <FolderTree className="h-5 w-5" />

              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Marketplace
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Категорії
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Керування категоріями товарів
              UkrTradeHub
            </p>
          </div>

          <Link
            href="/admin/categories/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-black transition hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />

            Нова категорія
          </Link>
        </div>

        {/* ============================================
            STATS
        ============================================ */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Всього категорій"
            value={totalCategories}
            icon={
              <FolderTree className="h-5 w-5" />
            }
          />

          <StatCard
            label="Активних"
            value={activeCategories}
            icon={
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            }
          />

          <StatCard
            label="Неактивних"
            value={inactiveCategories}
            icon={
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            }
          />

          <StatCard
            label="Товарів у категоріях"
            value={totalProducts}
            icon={
              <Package className="h-5 w-5" />
            }
          />
        </div>

        {/* ============================================
            FILTERS
        ============================================ */}

        <form
          method="GET"
          className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* SEARCH */}

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Пошук за назвою, slug або описом..."
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#070a10] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-amber-400/30"
              />
            </div>

            {/* STATUS */}

            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-white/[0.07] bg-[#070a10] px-4 text-sm text-zinc-400 outline-none focus:border-amber-400/30"
            >
              <option value="">
                Усі категорії
              </option>

              <option value="active">
                Активні
              </option>

              <option value="inactive">
                Неактивні
              </option>
            </select>

            {/* SEARCH BUTTON */}

            <button
              type="submit"
              className="h-11 rounded-xl bg-amber-400 px-6 text-sm font-black text-black transition hover:bg-amber-300"
            >
              Знайти
            </button>

            {/* RESET */}

            {(search || status) && (
              <Link
                href="/admin/categories"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.07] px-5 text-sm font-bold text-zinc-500 transition hover:border-white/[0.12] hover:text-white"
              >
                Скинути
              </Link>
            )}
          </div>
        </form>

        {/* ============================================
            TABLE
        ============================================ */}

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0f16]">
          {/* TABLE HEADER */}

          <div className="border-b border-white/[0.07] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">
                  Дерево категорій
                </h2>

                <p className="mt-1 text-xs text-zinc-700">
                  Ієрархія категорій маркетплейсу
                </p>
              </div>

              <span className="text-xs text-zinc-600">
                {nodes.length.toLocaleString(
                  "uk-UA"
                )}{" "}
                категорій
              </span>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.015]">
                  <TableHead>
                    Категорія
                  </TableHead>

                  <TableHead>
                    Товари
                  </TableHead>

                  <TableHead>
                    Порядок
                  </TableHead>

                  <TableHead>
                    Статус
                  </TableHead>

                  <th className="w-[110px] px-4 py-4" />
                </tr>
              </thead>

              <tbody>
                {tree.length > 0 ? (
                  tree.map(
                    (category) => (
                      <CategoryRow
                        key={category.id}
                        category={category}
                      />
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-700">
                          <FolderTree className="h-6 w-6" />
                        </div>

                        <div className="font-bold text-zinc-400">
                          Категорій не знайдено
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
        </section>
      </div>
    </main>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f16] p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
        {icon}
      </div>

      <div className="text-2xl font-black text-white">
        {value.toLocaleString("uk-UA")}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
      </div>
    </div>
  );
}

// =====================================================
// TABLE HEAD
// =====================================================

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