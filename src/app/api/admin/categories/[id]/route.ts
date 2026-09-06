
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// GET /api/admin/categories/[id]
// =====================================================

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const category = await db.category.findUnique({
      where: {
        id,
      },
      include: {
        seo: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              name: "asc",
            },
          ],
        },
        _count: {
          select: {
            products: true,
            children: true,
            banners: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/categories/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати категорію",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/admin/categories/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();

    const {
      name,
      slug,
      description,
      imageUrl,
      icon,
      parentId,
      isActive,
      sortOrder,
      seo,
    } = body;

    const existing = await db.category.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    const normalizedName =
      typeof name === "string"
        ? name.trim()
        : existing.name;

    const normalizedSlug =
      typeof slug === "string"
        ? slug.trim().toLowerCase()
        : existing.slug;

    if (!normalizedName || !normalizedSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Назва та slug є обов'язковими",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // CHECK SLUG
    // ===================================================

    const slugExists =
      await db.category.findFirst({
        where: {
          slug: normalizedSlug,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (slugExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Категорія з таким slug вже існує",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // CHECK PARENT
    // ===================================================

    const normalizedParentId =
      parentId || null;

    if (normalizedParentId) {
      if (normalizedParentId === id) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Категорія не може бути батьківською сама собі",
          },
          {
            status: 400,
          }
        );
      }

      const parent =
        await db.category.findUnique({
          where: {
            id: normalizedParentId,
          },
          select: {
            id: true,
          },
        });

      if (!parent) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Батьківську категорію не знайдено",
          },
          {
            status: 404,
          }
        );
      }

      // Перевіряємо, щоб не створити цикл.
      let currentParentId:
        | string
        | null = normalizedParentId;

      while (currentParentId) {
        if (currentParentId === id) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Неможливо створити циклічну структуру категорій",
            },
            {
              status: 400,
            }
          );
        }

        const parent =
          await db.category.findUnique({
            where: {
              id: currentParentId,
            },
            select: {
              parentId: true,
            },
          });

        currentParentId =
          parent?.parentId ?? null;
      }
    }

    // ===================================================
    // UPDATE
    // ===================================================

    const category =
      await db.category.update({
        where: {
          id,
        },
        data: {
          name: normalizedName,
          slug: normalizedSlug,

          description:
            typeof description === "string"
              ? description.trim() || null
              : existing.description,

          imageUrl:
            typeof imageUrl === "string"
              ? imageUrl.trim() || null
              : existing.imageUrl,

          icon:
            typeof icon === "string"
              ? icon.trim() || null
              : existing.icon,

          parentId:
            normalizedParentId,

          isActive:
            typeof isActive === "boolean"
              ? isActive
              : existing.isActive,

          sortOrder:
            typeof sortOrder === "number"
              ? sortOrder
              : existing.sortOrder,

          ...(seo
            ? {
                seo: {
                  upsert: {
                    create: {
                      title:
                        seo.title
                          ? String(
                              seo.title
                            ).trim()
                          : null,
                      description:
                        seo.description
                          ? String(
                              seo.description
                            ).trim()
                          : null,
                      keywords:
                        seo.keywords
                          ? String(
                              seo.keywords
                            ).trim()
                          : null,
                      canonical:
                        seo.canonical
                          ? String(
                              seo.canonical
                            ).trim()
                          : null,
                    },
                    update: {
                      title:
                        seo.title
                          ? String(
                              seo.title
                            ).trim()
                          : null,
                      description:
                        seo.description
                          ? String(
                              seo.description
                            ).trim()
                          : null,
                      keywords:
                        seo.keywords
                          ? String(
                              seo.keywords
                            ).trim()
                          : null,
                      canonical:
                        seo.canonical
                          ? String(
                              seo.canonical
                            ).trim()
                          : null,
                    },
                  },
                },
              }
            : {}),
        },

        include: {
          seo: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Категорію успішно оновлено",
      category,
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/categories/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося оновити категорію",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/admin/categories/[id]
// =====================================================

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const category =
      await db.category.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // PROTECT CATEGORY WITH PRODUCTS
    // ===================================================

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Неможливо видалити категорію, у якій є товари",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // PROTECT CATEGORY WITH CHILDREN
    // ===================================================

    if (category._count.children > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Спочатку видаліть або перемістіть дочірні категорії",
        },
        {
          status: 409,
        }
      );
    }

    await db.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Категорію успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/categories/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося видалити категорію",
      },
      {
        status: 500,
      }
    );
  }
}