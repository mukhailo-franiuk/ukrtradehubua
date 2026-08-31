import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// HELPERS
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
    select: {
      user: {
        select: {
          id: true,
          role: true,
          status: true,
          isBlocked: true,
        },
      },
    },
  });

  if (!session?.user) {
    return null;
  }

  if (
    session.user.status !== "ACTIVE" ||
    session.user.isBlocked
  ) {
    return null;
  }

  return session.user;
}

// =====================================================
// GET /api/shops/[id]/followers
// =====================================================

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const { searchParams } = new URL(request.url);

    const pageParam = Number(
      searchParams.get("page") || "1"
    );

    const limitParam = Number(
      searchParams.get("limit") || "20"
    );

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 100)
        : 20;

    const skip = (page - 1) * limit;

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
        slug: true,
        sellerStatus: true,
        isActive: true,
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
    // QUERY
    // =================================================

    const [followers, total] = await Promise.all([
      db.shopFollower.findMany({
        where: {
          shopId: id,
        },

        skip,
        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: {
                select: {
                  url: true,
                  alt: true,
                },
              },
            },
          },
        },
      }),

      db.shopFollower.count({
        where: {
          shopId: id,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // =================================================
    // CHECK CURRENT USER
    // =================================================

    const currentUser = await getCurrentUser(request);

    let isFollowing = false;

    if (currentUser) {
      const existingFollow =
        await db.shopFollower.findUnique({
          where: {
            userId_shopId: {
              userId: currentUser.id,
              shopId: id,
            },
          },
          select: {
            id: true,
          },
        });

      isFollowing = Boolean(existingFollow);
    }

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,

      data: {
        shop,

        followers,

        total,

        isFollowing,

        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/followers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати підписників",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/shops/[id]/followers
// =====================================================

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    // =================================================
    // AUTH
    // =================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно авторизуватися",
        },
        {
          status: 401,
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
        sellerStatus: true,
        isActive: true,
        userId: true,
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
    // SHOP STATUS
    // =================================================

    if (
      !shop.isActive ||
      shop.sellerStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Цей магазин недоступний",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // OWNER CANNOT FOLLOW OWN SHOP
    // =================================================

    if (shop.userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Ви не можете підписатися на власний магазин",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK EXISTING FOLLOW
    // =================================================

    const existingFollow =
      await db.shopFollower.findUnique({
        where: {
          userId_shopId: {
            userId: user.id,
            shopId: id,
          },
        },
      });

    if (existingFollow) {
      return NextResponse.json({
        success: true,
        message: "Ви вже підписані на цей магазин",
        data: {
          isFollowing: true,
          followerId: existingFollow.id,
        },
      });
    }

    // =================================================
    // CREATE FOLLOW
    // =================================================

    const follower = await db.shopFollower.create({
      data: {
        userId: user.id,
        shopId: id,
      },

      select: {
        id: true,
        userId: true,
        shopId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Ви успішно підписалися на магазин",
        data: {
          follower,
          isFollowing: true,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/shops/[id]/followers error:",
      error
    );

    // =================================================
    // PRISMA UNIQUE CONSTRAINT
    // =================================================

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({
        success: true,
        message: "Ви вже підписані на цей магазин",
        data: {
          isFollowing: true,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося підписатися на магазин",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/shops/[id]/followers
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    // =================================================
    // AUTH
    // =================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно авторизуватися",
        },
        {
          status: 401,
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
    // CHECK FOLLOW
    // =================================================

    const existingFollow =
      await db.shopFollower.findUnique({
        where: {
          userId_shopId: {
            userId: user.id,
            shopId: id,
          },
        },
      });

    if (!existingFollow) {
      return NextResponse.json({
        success: true,
        message: "Ви не підписані на цей магазин",
        data: {
          isFollowing: false,
        },
      });
    }

    // =================================================
    // DELETE FOLLOW
    // =================================================

    await db.shopFollower.delete({
      where: {
        id: existingFollow.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ви відписалися від магазину",
      data: {
        isFollowing: false,
      },
    });
  } catch (error) {
    console.error(
      "DELETE /api/shops/[id]/followers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося відписатися від магазину",
      },
      {
        status: 500,
      }
    );
  }
}