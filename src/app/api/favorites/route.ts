import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type AddFavoriteBody = {
  productId?: string;
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
// GET /api/favorites
// =====================================================

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
        error: "Не вдалося отримати обране",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/favorites
// =====================================================

export async function POST(request: NextRequest) {
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
    // BODY
    // -------------------------------------------------

    let body: AddFavoriteBody;

    try {
      body = (await request.json()) as AddFavoriteBody;
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

    const productId = body.productId?.trim();

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

    // -------------------------------------------------
    // PRODUCT
    // -------------------------------------------------

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

    // -------------------------------------------------
    // CHECK EXISTING
    // -------------------------------------------------

    const existingFavorite =
      await db.favoriteProduct.findUnique({
        where: {
          userId_productId: {
            userId: user.id,
            productId,
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

    // -------------------------------------------------
    // CREATE
    // -------------------------------------------------

    const favorite =
      await db.favoriteProduct.create({
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
                  rating: true,
                  isActive: true,
                  sellerStatus: true,
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
  } catch (error) {
    console.error("POST /api/favorites error:", error);

    // -------------------------------------------------
    // PRISMA UNIQUE
    // -------------------------------------------------

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: true,
          message: "Товар вже є в обраному",
        },
        {
          status: 200,
        }
      );
    }

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