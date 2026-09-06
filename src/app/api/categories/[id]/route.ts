import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// =====================================================
// GET /api/categories/[id]
// Отримання однієї категорії
// =====================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({
      where: {
        id,
      },
      include: {
        seo: true,

        parent: true,

        children: {
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
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("GET /api/categories/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати категорію",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/categories/[id]
// Оновлення категорії
// =====================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existingCategory = await db.category.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        { status: 404 }
      );
    }

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

    // =================================================
    // ВАЛІДАЦІЯ NAME
    // =================================================

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Назва категорії не може бути порожньою",
          },
          { status: 400 }
        );
      }
    }

    // =================================================
    // ВАЛІДАЦІЯ SLUG
    // =================================================

    let normalizedSlug: string | undefined;

    if (slug !== undefined) {
      if (
        typeof slug !== "string" ||
        slug.trim().length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Slug не може бути порожнім",
          },
          { status: 400 }
        );
      }

      normalizedSlug = slug.trim().toLowerCase();

      const slugExists = await db.category.findFirst({
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
            message: "Категорія з таким slug вже існує",
          },
          { status: 409 }
        );
      }
    }

    // =================================================
    // ВАЛІДАЦІЯ PARENT
    // =================================================

    if (parentId !== undefined) {
      // Не можна зробити категорію самій собі parent
      if (parentId === id) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Категорія не може бути батьківською сама собі",
          },
          { status: 400 }
        );
      }

      // Якщо parentId = null — робимо категорію кореневою
      if (parentId !== null) {
        const parent = await db.category.findUnique({
          where: {
            id: parentId,
          },
          select: {
            id: true,
            parentId: true,
          },
        });

        if (!parent) {
          return NextResponse.json(
            {
              success: false,
              message: "Батьківську категорію не знайдено",
            },
            { status: 404 }
          );
        }

        // =============================================
        // ЗАХИСТ ВІД ЦИКЛУ
        // =============================================

        let currentId: string | null = parentId;

        while (currentId !== null) {
          if (currentId === id) {
            return NextResponse.json(
              {
                success: false,
                message:
                  "Неможливо створити циклічну структуру категорій",
              },
              { status: 400 }
            );
          }

          const currentCategory =
            await db.category.findUnique({
              where: {
                id: currentId,
              },
              select: {
                parentId: true,
              },
            });

          if (!currentCategory) {
            break;
          }

          currentId = currentCategory.parentId;
        }
      }
    }

    // =================================================
    // ПІДГОТОВКА DATA
    // =================================================

    const data: Parameters<
      typeof db.category.update
    >[0]["data"] = {};

    if (name !== undefined) {
      data.name = name.trim();
    }

    if (normalizedSlug !== undefined) {
      data.slug = normalizedSlug;
    }

    if (description !== undefined) {
      data.description =
        description === null
          ? null
          : String(description).trim();
    }

    if (imageUrl !== undefined) {
      data.imageUrl =
        imageUrl === null
          ? null
          : String(imageUrl).trim();
    }

    if (icon !== undefined) {
      data.icon =
        icon === null
          ? null
          : String(icon).trim();
    }

    if (parentId !== undefined) {
      data.parentId = parentId;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    if (sortOrder !== undefined) {
      const parsedSortOrder = Number(sortOrder);

      if (!Number.isInteger(parsedSortOrder)) {
        return NextResponse.json(
          {
            success: false,
            message: "sortOrder повинен бути цілим числом",
          },
          { status: 400 }
        );
      }

      data.sortOrder = parsedSortOrder;
    }

    // =================================================
    // SEO
    // =================================================

    if (seo !== undefined) {
      if (seo === null) {
        data.seo = {
          delete: true,
        };
      } else {
        data.seo = {
          upsert: {
            create: {
              title:
                seo.title !== undefined &&
                seo.title !== null
                  ? String(seo.title).trim()
                  : null,

              description:
                seo.description !== undefined &&
                seo.description !== null
                  ? String(seo.description).trim()
                  : null,

              keywords:
                seo.keywords !== undefined &&
                seo.keywords !== null
                  ? String(seo.keywords).trim()
                  : null,

              canonical:
                seo.canonical !== undefined &&
                seo.canonical !== null
                  ? String(seo.canonical).trim()
                  : null,
            },

            update: {
              title:
                seo.title !== undefined &&
                seo.title !== null
                  ? String(seo.title).trim()
                  : null,

              description:
                seo.description !== undefined &&
                seo.description !== null
                  ? String(seo.description).trim()
                  : null,

              keywords:
                seo.keywords !== undefined &&
                seo.keywords !== null
                  ? String(seo.keywords).trim()
                  : null,

              canonical:
                seo.canonical !== undefined &&
                seo.canonical !== null
                  ? String(seo.canonical).trim()
                  : null,
            },
          },
        };
      }
    }

    // =================================================
    // UPDATE
    // =================================================

    const category = await db.category.update({
      where: {
        id,
      },

      data,

      include: {
        seo: true,

        parent: true,

        children: {
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

    return NextResponse.json({
      success: true,
      message: "Категорію успішно оновлено",
      category,
    });
  } catch (error) {
    console.error("PATCH /api/categories/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося оновити категорію",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/categories/[id]
// Видалення категорії
// =====================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({
      where: {
        id,
      },

      include: {
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
        { status: 404 }
      );
    }

    // =================================================
    // НЕ МОЖНА ВИДАЛЯТИ КАТЕГОРІЮ З ТОВАРАМИ
    // =================================================

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Неможливо видалити категорію, оскільки в ній є товари",
          productsCount: category._count.products,
        },
        { status: 409 }
      );
    }

    // =================================================
    // НЕ МОЖНА ВИДАЛЯТИ КАТЕГОРІЮ З CHILDREN
    // =================================================

    if (category._count.children > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Неможливо видалити категорію, оскільки вона має дочірні категорії",
          childrenCount: category._count.children,
        },
        { status: 409 }
      );
    }

    // =================================================
    // DELETE
    // =================================================

    await db.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Категорію успішно видалено",
    });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося видалити категорію",
      },
      { status: 500 }
    );
  }
}