import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
    promotionId: string;
  }>;
};

type ProductsBody = {
  productIds?: string[];
};

// =====================================================
// AUTH
// =====================================================

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (session.user.isBlocked) {
    return null;
  }

  return session.user;
}

// =====================================================
// CHECK ACCESS
// =====================================================

async function checkAccess(
  request: NextRequest,
  shopId: string
) {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      ),
    };
  }

  // ADMIN має повний доступ
  if (user.role === "ADMIN") {
    return {
      user,
      response: null,
    };
  }

  // Для SELLER перевіряємо власний магазин
  if (user.role !== "SELLER") {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Недостатньо прав",
        },
        {
          status: 403,
        }
      ),
    };
  }

  const shop = await db.shop.findUnique({
    where: {
      id: shopId,
    },
    select: {
      id: true,
      userId: true,
      sellerStatus: true,
      isActive: true,
    },
  });

  if (!shop) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      ),
    };
  }

  if (shop.userId !== user.id) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Ви не маєте доступу до цього магазину",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

// =====================================================
// GET
// /api/shops/[id]/promotions/[promotionId]/products
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: shopId, promotionId } =
      await context.params;

    if (!shopId || !promotionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні параметри запиту",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const access = await checkAccess(request, shopId);

    if (access.response) {
      return access.response;
    }

    // -------------------------------------------------
    // PROMOTION
    // -------------------------------------------------

    const promotion = await db.promotion.findFirst({
      where: {
        id: promotionId,
        shopId,
      },
      select: {
        id: true,
        shopId: true,
        name: true,
        type: true,
        value: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
      },
    });

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          error: "Акцію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // PRODUCTS
    // -------------------------------------------------

    const promotionProducts =
      await db.promotionProduct.findMany({
        where: {
          promotionId,
        },

        include: {
          product: {
            include: {
              images: {
                orderBy: {
                  sortOrder: "asc",
                },
              },

              _count: {
                select: {
                  orderItems: true,
                  favorites: true,
                },
              },
            },
          },
        },

        orderBy: {
          product: {
            createdAt: "desc",
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: promotionProducts,
      promotion,
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/promotions/[promotionId]/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати товари акції",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST
// Додавання товарів до акції
// =====================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: shopId, promotionId } =
      await context.params;

    if (!shopId || !promotionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні параметри запиту",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const access = await checkAccess(request, shopId);

    if (access.response) {
      return access.response;
    }

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: ProductsBody;

    try {
      body = (await request.json()) as ProductsBody;
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

    const productIds = Array.isArray(body.productIds)
      ? [
          ...new Set(
            body.productIds.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.trim().length > 0
            )
          ),
        ]
      : [];

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно передати хоча б один productId",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // PROMOTION
    // -------------------------------------------------

    const promotion = await db.promotion.findFirst({
      where: {
        id: promotionId,
        shopId,
      },
      select: {
        id: true,
        shopId: true,
      },
    });

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          error: "Акцію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // PRODUCTS
    // -------------------------------------------------

    const products = await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        shopId,
      },

      select: {
        id: true,
      },
    });

    const existingProductIds = new Set(
      products.map((product) => product.id)
    );

    const invalidProductIds = productIds.filter(
      (productId) =>
        !existingProductIds.has(productId)
    );

    if (invalidProductIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Один або декілька товарів не належать цьому магазину або не існують",
          invalidProductIds,
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // EXISTING RELATIONS
    // -------------------------------------------------

    const existingRelations =
      await db.promotionProduct.findMany({
        where: {
          promotionId,
          productId: {
            in: productIds,
          },
        },

        select: {
          productId: true,
        },
      });

    const existingIds = new Set(
      existingRelations.map(
        (item) => item.productId
      )
    );

    const newProductIds = productIds.filter(
      (productId) =>
        !existingIds.has(productId)
    );

    if (newProductIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Усі передані товари вже додані до цієї акції",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // CREATE RELATIONS
    // -------------------------------------------------

    await db.$transaction(
      newProductIds.map((productId) =>
        db.promotionProduct.create({
          data: {
            promotionId,
            productId,
          },
        })
      )
    );

    // -------------------------------------------------
    // RESULT
    // -------------------------------------------------

    const addedProducts =
      await db.promotionProduct.findMany({
        where: {
          promotionId,
          productId: {
            in: newProductIds,
          },
        },

        include: {
          product: {
            include: {
              images: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: `До акції додано товарів: ${newProductIds.length}`,
        data: addedProducts,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/shops/[id]/promotions/[promotionId]/products error:",
      error
    );

    // Prisma unique constraint
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Деякі товари вже додані до цієї акції",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося додати товари до акції",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE
// Видалення товарів з акції
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: shopId, promotionId } =
      await context.params;

    if (!shopId || !promotionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні параметри запиту",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const access = await checkAccess(request, shopId);

    if (access.response) {
      return access.response;
    }

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: ProductsBody;

    try {
      body = (await request.json()) as ProductsBody;
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

    const productIds = Array.isArray(body.productIds)
      ? [
          ...new Set(
            body.productIds.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.trim().length > 0
            )
          ),
        ]
      : [];

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Необхідно передати хоча б один productId",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // PROMOTION
    // -------------------------------------------------

    const promotion = await db.promotion.findFirst({
      where: {
        id: promotionId,
        shopId,
      },

      select: {
        id: true,
      },
    });

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          error: "Акцію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------

    const result =
      await db.promotionProduct.deleteMany({
        where: {
          promotionId,
          productId: {
            in: productIds,
          },
        },
      });

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Вказані товари не знайдені в цій акції",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `З акції видалено товарів: ${result.count}`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error(
      "DELETE /api/shops/[id]/promotions/[promotionId]/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити товари з акції",
      },
      {
        status: 500,
      }
    );
  }
}