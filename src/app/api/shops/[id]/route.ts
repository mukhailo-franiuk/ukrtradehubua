import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// =====================================================
// TYPES
// =====================================================

type UpdateShopBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  shortDescription?: string | null;

  sellerStatus?:
    | "PENDING"
    | "ACTIVE"
    | "BLOCKED"
    | "SUSPENDED";

  isActive?: boolean;

  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

// =====================================================
// HELPERS
// =====================================================

function isPrismaError(
  error: unknown,
  code: string
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

// =====================================================
// GET /api/shops/[id]
// =====================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const shop = await db.shop.findUnique({
      where: {
        id,
      },

      include: {
        logo: true,
        cover: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isBlocked: true,
            createdAt: true,
          },
        },

        _count: {
          select: {
            products: true,
            reviews: true,
            followers: true,
            favoriteBy: true,
            promotions: true,
            banners: true,
            orderSellers: true,
            payouts: true,
            conversations: true,
            views: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error("GET /api/shops/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати магазин",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/shops/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // PARSE JSON
    // =================================================

    let body: UpdateShopBody;

    try {
      body = (await request.json()) as UpdateShopBody;
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
    // CHECK SHOP
    // =================================================

    const existingShop = await db.shop.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        userId: true,
      },
    });

    if (!existingShop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // AUTH: власник магазину або адмін
    // =================================================

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    const isOwner = existingShop.userId === currentUser.id;
    const isAdmin = currentUser.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Доступ заборонено",
        },
        {
          status: 403,
        }
      );
    }

    // sellerStatus та isActive контролює лише адміністрація —
    // продавець не може сам собі схвалити/розблокувати магазин
    if (
      !isAdmin &&
      (body.sellerStatus !== undefined || body.isActive !== undefined)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Змінювати статус магазину може лише адміністратор",
        },
        {
          status: 403,
        }
      );
    }

    // =================================================
    // VALIDATE NAME
    // =================================================

    let name: string | undefined;

    if (body.name !== undefined) {
      name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Назва магазину не може бути порожньою",
          },
          {
            status: 400,
          }
        );
      }
    }

    // =================================================
    // VALIDATE SLUG
    // =================================================

    let slug: string | undefined;

    if (body.slug !== undefined) {
      slug = body.slug.trim().toLowerCase();

      if (!slug) {
        return NextResponse.json(
          {
            success: false,
            error: "Slug магазину не може бути порожнім",
          },
          {
            status: 400,
          }
        );
      }

      const slugOwner = await db.shop.findUnique({
        where: {
          slug,
        },

        select: {
          id: true,
        },
      });

      if (slugOwner && slugOwner.id !== id) {
        return NextResponse.json(
          {
            success: false,
            error: "Магазин з таким slug вже існує",
          },
          {
            status: 409,
          }
        );
      }
    }

    // =================================================
    // VALIDATE SELLER STATUS
    // =================================================

    const allowedSellerStatuses = [
      "PENDING",
      "ACTIVE",
      "BLOCKED",
      "SUSPENDED",
    ] as const;

    if (
      body.sellerStatus !== undefined &&
      !allowedSellerStatuses.includes(body.sellerStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний статус продавця",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // VALIDATE EMAIL
    // =================================================

    let email: string | null | undefined;

    if (body.email !== undefined) {
      email =
        body.email === null
          ? null
          : body.email.trim() || null;

      if (
        email !== null &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректний email",
          },
          {
            status: 400,
          }
        );
      }
    }

    // =================================================
    // NORMALIZE OPTIONAL FIELDS
    // =================================================

    const description =
      body.description !== undefined
        ? body.description?.trim() || null
        : undefined;

    const shortDescription =
      body.shortDescription !== undefined
        ? body.shortDescription?.trim() || null
        : undefined;

    const phone =
      body.phone !== undefined
        ? body.phone?.trim() || null
        : undefined;

    const website =
      body.website !== undefined
        ? body.website?.trim() || null
        : undefined;

    // =================================================
    // UPDATE
    // =================================================

    const shop = await db.shop.update({
      where: {
        id,
      },

      data: {
        ...(name !== undefined
          ? {
              name,
            }
          : {}),

        ...(slug !== undefined
          ? {
              slug,
            }
          : {}),

        ...(body.description !== undefined
          ? {
              description,
            }
          : {}),

        ...(body.shortDescription !== undefined
          ? {
              shortDescription,
            }
          : {}),

        ...(body.sellerStatus !== undefined
          ? {
              sellerStatus: body.sellerStatus,
            }
          : {}),

        ...(body.isActive !== undefined
          ? {
              isActive: body.isActive,
            }
          : {}),

        ...(body.phone !== undefined
          ? {
              phone,
            }
          : {}),

        ...(body.email !== undefined
          ? {
              email,
            }
          : {}),

        ...(body.website !== undefined
          ? {
              website,
            }
          : {}),
      },

      include: {
        logo: true,
        cover: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isBlocked: true,
          },
        },

        _count: {
          select: {
            products: true,
            reviews: true,
            followers: true,
            favoriteBy: true,
            promotions: true,
            banners: true,
            orderSellers: true,
            payouts: true,
            conversations: true,
            views: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Магазин успішно оновлено",
      data: shop,
    });
  } catch (error) {
    console.error("PATCH /api/shops/[id] error:", error);

    // =================================================
    // NOT FOUND
    // =================================================

    if (isPrismaError(error, "P2025")) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // UNIQUE
    // =================================================

    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин з таким slug вже існує",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити магазин",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/shops/[id]
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Видаляти магазин може лише адміністратор",
        },
        {
          status: 403,
        }
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        userId: true,
        sellerStatus: true,
        _count: {
          select: {
            products: true,
            orderSellers: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // SAFETY CHECK
    // =================================================
    //
    // У твоїй схемі Product -> Shop має onDelete: Cascade,
    // але OrderItem -> Shop має onDelete: Restrict.
    //
    // Тому магазин з товарами можна видалити на рівні
    // Product, але магазин, який уже має OrderSeller /
    // OrderItem залежності, може бути заблокований БД.
    //
    // Не видаляємо магазин, якщо він уже бере участь
    // у замовленнях.
    // =================================================

    if (shop._count.orderSellers > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Магазин не можна видалити, оскільки він вже має замовлення",
        },
        {
          status: 409,
        }
      );
    }

    // =================================================
    // DELETE
    // =================================================

    await db.shop.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Магазин успішно видалено",
    });
  } catch (error) {
    console.error("DELETE /api/shops/[id] error:", error);

    // =================================================
    // FOREIGN KEY / RESTRICT
    // =================================================

    if (isPrismaError(error, "P2003")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Магазин не можна видалити, оскільки він пов'язаний з іншими даними",
        },
        {
          status: 409,
        }
      );
    }

    // =================================================
    // NOT FOUND
    // =================================================

    if (isPrismaError(error, "P2025")) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити магазин",
      },
      {
        status: 500,
      }
    );
  }
}