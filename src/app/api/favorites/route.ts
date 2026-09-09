import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";

type AddFavoriteBody = {
  productId?: string;
};

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

  if (session.expiresAt < new Date()) {
    await db.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (session.user.isBlocked) {
    return null;
  }

  return session.user;
}

/*
 * ============================================================
 * GET /api/favorites
 * ============================================================
 *
 * Отримує всі товари користувача з обраного.
 */
export async function GET(request: NextRequest) {
  try {
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

    const favorites = await db.favoriteProduct.findMany({
      where: {
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

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: favorites,
      total: favorites.length,
    });
  } catch (error) {
    console.error("GET /api/favorites error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося завантажити обране",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * POST /api/favorites
 * ============================================================
 *
 * Додає товар до обраного.
 */
export async function POST(request: NextRequest) {
  try {
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

    let body: AddFavoriteBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректне тіло запиту",
        },
        {
          status: 400,
        }
      );
    }

    const productId =
      typeof body.productId === "string"
        ? body.productId.trim()
        : "";

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "productId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id: productId,
      },

      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        status: true,

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            sellerStatus: true,
          },
        },

        images: {
          orderBy: {
            sortOrder: "asc",
          },

          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    const existingFavorite =
      await db.favoriteProduct.findUnique({
        where: {
          userId_productId: {
            userId: user.id,
            productId,
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
                },
              },
            },
          },
        },
      });

    if (existingFavorite) {
      return NextResponse.json({
        success: true,
        message: "Товар вже є в обраному",
        data: existingFavorite,
        alreadyExists: true,
      });
    }

    const favorite = await db.favoriteProduct.create({
      data: {
        userId: user.id,
        productId,
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
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Товар додано в обране",
        data: favorite,
        alreadyExists: false,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    /*
     * Захист від race condition:
     * @@unique([userId, productId])
     */
    if (error?.code === "P2002") {
      return NextResponse.json({
        success: true,
        message: "Товар вже є в обраному",
        alreadyExists: true,
      });
    }

    console.error("POST /api/favorites error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося додати товар в обране",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * DELETE /api/favorites
 * ============================================================
 *
 * Видаляє товар користувача з обраного.
 *
 * Body:
 * {
 *   productId: string
 * }
 *
 * ВАЖЛИВО:
 * Видалення завжди прив'язане до поточного userId.
 * Користувач не може видалити FavoriteProduct іншого
 * користувача.
 */
export async function DELETE(request: NextRequest) {
  try {
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

    let body: AddFavoriteBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректне тіло запиту",
        },
        {
          status: 400,
        }
      );
    }

    const productId =
      typeof body.productId === "string"
        ? body.productId.trim()
        : "";

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "productId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const deleted =
      await db.favoriteProduct.deleteMany({
        where: {
          userId: user.id,
          productId,
        },
      });

    if (deleted.count === 0) {
      return NextResponse.json({
        success: true,
        message: "Товар не був в обраному",
        removed: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Товар видалено з обраного",
      removed: true,
    });
  } catch (error) {
    console.error("DELETE /api/favorites error:", error);

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