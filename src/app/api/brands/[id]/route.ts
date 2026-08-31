import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBrandBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
};

// =====================================================
// HELPERS
// =====================================================

function getPrismaErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

// =====================================================
// GET /api/brands/[id]
// =====================================================

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID бренду є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const brand = await db.brand.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            products: true,
          },
        },

        products: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            status: true,
            stock: true,
            rating: true,
            isFeatured: true,
            isNew: true,
            createdAt: true,
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 20,
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error("GET /api/brands/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати бренд",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/brands/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID бренду є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK BRAND
    // =================================================

    const existingBrand = await db.brand.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        isActive: true,
      },
    });

    if (!existingBrand) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // PARSE BODY
    // =================================================

    let body: UpdateBrandBody;

    try {
      body = (await request.json()) as UpdateBrandBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VALIDATE BODY
    // =================================================

    const data: UpdateBrandBody = {};

    // -------------------------------------------------
    // NAME
    // -------------------------------------------------

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Назва бренду не може бути порожньою",
          },
          {
            status: 400,
          }
        );
      }

      data.name = name;
    }

    // -------------------------------------------------
    // SLUG
    // -------------------------------------------------

    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase();

      if (!slug) {
        return NextResponse.json(
          {
            success: false,
            error: "Slug бренду не може бути порожнім",
          },
          {
            status: 400,
          }
        );
      }

      if (slug !== existingBrand.slug) {
        const slugExists = await db.brand.findUnique({
          where: {
            slug,
          },

          select: {
            id: true,
          },
        });

        if (slugExists && slugExists.id !== id) {
          return NextResponse.json(
            {
              success: false,
              error: "Бренд з таким slug вже існує",
            },
            {
              status: 409,
            }
          );
        }
      }

      data.slug = slug;
    }

    // -------------------------------------------------
    // DESCRIPTION
    // -------------------------------------------------

    if (body.description !== undefined) {
      data.description =
        body.description === null
          ? null
          : body.description.trim() || null;
    }

    // -------------------------------------------------
    // LOGO
    // -------------------------------------------------

    if (body.logoUrl !== undefined) {
      data.logoUrl =
        body.logoUrl === null
          ? null
          : body.logoUrl.trim() || null;
    }

    // -------------------------------------------------
    // ACTIVE
    // -------------------------------------------------

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: "isActive має бути boolean",
          },
          {
            status: 400,
          }
        );
      }

      data.isActive = body.isActive;
    }

    // =================================================
    // NOTHING TO UPDATE
    // =================================================

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Немає даних для оновлення",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // UPDATE
    // =================================================

    const brand = await db.brand.update({
      where: {
        id,
      },

      data,

      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Бренд успішно оновлено",
      data: brand,
    });
  } catch (error) {
    console.error("PATCH /api/brands/[id] error:", error);

    const code = getPrismaErrorCode(error);

    if (code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд з таким значенням вже існує",
        },
        {
          status: 409,
        }
      );
    }

    if (code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити бренд",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/brands/[id]
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID бренду є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK BRAND
    // =================================================

    const brand = await db.brand.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,

        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // PROTECT BRAND WITH PRODUCTS
    // =================================================

    if (brand._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Неможливо видалити бренд, оскільки до нього прив'язані товари",
          productsCount: brand._count.products,
        },
        {
          status: 409,
        }
      );
    }

    // =================================================
    // DELETE
    // =================================================

    await db.brand.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Бренд успішно видалено",
      data: {
        id: brand.id,
        name: brand.name,
      },
    });
  } catch (error) {
    console.error("DELETE /api/brands/[id] error:", error);

    const code = getPrismaErrorCode(error);

    if (code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Неможливо видалити бренд, оскільки він використовується товарами",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити бренд",
      },
      {
        status: 500,
      }
    );
  }
}