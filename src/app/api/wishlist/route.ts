import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type AddToWishlistBody = {
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
// GET /api/wishlist
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

    const wishlist = await db.wishlist.findUnique({
      where: {
        userId: user.id,
      },

      include: {
        items: {
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
        },
      },
    });

    if (!wishlist) {
      return NextResponse.json({
        success: true,
        data: {
          id: null,
          userId: user.id,
          items: [],
          totalItems: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...wishlist,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("GET /api/wishlist error:", error);

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
// POST /api/wishlist
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

    let body: AddToWishlistBody;

    try {
      body = (await request.json()) as AddToWishlistBody;
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
    // WISHLIST
    // -------------------------------------------------

    const result = await db.$transaction(
      async (tx) => {
        const wishlist =
          await tx.wishlist.upsert({
            where: {
              userId: user.id,
            },

            create: {
              userId: user.id,
            },

            update: {},
          });

        // ---------------------------------------------
        // CHECK EXISTING
        // ---------------------------------------------

        const existingItem =
          await tx.wishlistItem.findUnique({
            where: {
              wishlistId_productId: {
                wishlistId: wishlist.id,
                productId,
              },
            },
          });

        if (existingItem) {
          return {
            wishlist,
            item: existingItem,
            alreadyExists: true,
          };
        }

        // ---------------------------------------------
        // CREATE
        // ---------------------------------------------

        const item =
          await tx.wishlistItem.create({
            data: {
              wishlistId: wishlist.id,
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

        return {
          wishlist,
          item,
          alreadyExists: false,
        };
      }
    );

    // -------------------------------------------------
    // ALREADY EXISTS
    // -------------------------------------------------

    if (result.alreadyExists) {
      return NextResponse.json({
        success: true,
        message: "Товар вже є в обраному",
        data: result.item,
      });
    }

    // -------------------------------------------------
    // CREATED
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Товар додано до обраного",
        data: result.item,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/wishlist error:", error);

    // -------------------------------------------------
    // PRISMA UNIQUE
    // -------------------------------------------------

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({
        success: true,
        message: "Товар вже є в обраному",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося додати товар до обраного",
      },
      {
        status: 500,
      }
    );
  }
}