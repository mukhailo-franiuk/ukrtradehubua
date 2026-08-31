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
// GET /api/wishlist/[id]
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
          error: "ID елемента обраного є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // FIND ITEM
    // -------------------------------------------------

    const item = await db.wishlistItem.findFirst({
      where: {
        id,

        wishlist: {
          userId: user.id,
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

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Елемент обраного не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error(
      "GET /api/wishlist/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати елемент обраного",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/wishlist/[id]
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
          error: "ID елемента обраного є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // VERIFY OWNERSHIP
    // -------------------------------------------------

    const item = await db.wishlistItem.findFirst({
      where: {
        id,

        wishlist: {
          userId: user.id,
        },
      },

      select: {
        id: true,
        productId: true,
        wishlistId: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Елемент обраного не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------

    await db.wishlistItem.delete({
      where: {
        id: item.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Товар видалено з обраного",
      deletedItemId: item.id,
      productId: item.productId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/wishlist/[id] error:",
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