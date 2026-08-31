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
// GET /api/favorites/[id]
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const user = await getCurrentUser(request);

    if (!user) {
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

    // -------------------------------------------------
    // PARAMS
    // -------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID обраного є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // FIND FAVORITE
    // -------------------------------------------------

    const favorite =
      await db.favoriteProduct.findFirst({
        where: {
          id,
          userId: user.id,
        },

        include: {
          product: {
            include: {
              images: {
                orderBy: {
                  sortOrder: "asc",
                },
              },

              shop: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  rating: true,
                  isActive: true,
                  sellerStatus: true,
                },
              },
            },
          },
        },
      });

    if (!favorite) {
      return NextResponse.json(
        {
          success: false,
          error: "Обраний товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: favorite,
    });
  } catch (error) {
    console.error(
      "GET /api/favorites/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати обраний товар",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/favorites/[id]
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const user = await getCurrentUser(request);

    if (!user) {
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

    // -------------------------------------------------
    // PARAMS
    // -------------------------------------------------

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID обраного є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // FIND FAVORITE
    // -------------------------------------------------

    const favorite =
      await db.favoriteProduct.findFirst({
        where: {
          id,
          userId: user.id,
        },

        select: {
          id: true,
          productId: true,
        },
      });

    if (!favorite) {
      return NextResponse.json(
        {
          success: false,
          error: "Обраний товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------

    await db.favoriteProduct.delete({
      where: {
        id: favorite.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Товар видалено з обраного",
      deletedFavoriteId: favorite.id,
      productId: favorite.productId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/favorites/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити товар з обраного",
      },
      {
        status: 500,
      }
    );
  }
}