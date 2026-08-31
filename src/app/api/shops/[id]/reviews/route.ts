import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// GET /api/shops/[id]/reviews
// Отримати відгуки магазину
// =====================================================

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

    const limit = Math.min(
      Math.max(Number(limitParam) || 20, 1),
      100
    );

    const page = Math.max(
      Number(pageParam) || 1,
      1
    );

    const skip = (page - 1) * limit;

    // =================================================
    // Перевірка магазину
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
        { status: 404 }
      );
    }

    // =================================================
    // WHERE
    // =================================================

    const where = {
      shopId: id,
      ...(status &&
      ["PENDING", "APPROVED", "REJECTED"].includes(status)
        ? {
            status: status as
              | "PENDING"
              | "APPROVED"
              | "REJECTED",
          }
        : {}),
    };

    // =================================================
    // REVIEWS
    // =================================================

    const [reviews, total, aggregate] =
      await Promise.all([
        db.shopReview.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,

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

        db.shopReview.count({
          where,
        }),

        db.shopReview.aggregate({
          where: {
            shopId: id,
            status: "APPROVED",
          },
          _avg: {
            rating: true,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    // =================================================
    // RATING DISTRIBUTION
    // =================================================

    const ratingGroups = await Promise.all(
      [5, 4, 3, 2, 1].map(async (rating) => {
        const count = await db.shopReview.count({
          where: {
            shopId: id,
            status: "APPROVED",
            rating,
          },
        });

        return {
          rating,
          count,
        };
      })
    );

    return NextResponse.json({
      success: true,

      data: reviews,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },

      summary: {
        averageRating:
          aggregate._avg.rating !== null
            ? Number(aggregate._avg.rating.toFixed(2))
            : 0,

        totalReviews: aggregate._count._all,

        distribution: ratingGroups,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/reviews error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати відгуки магазину",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/shops/[id]/reviews
// Створити відгук магазину
// =====================================================

type CreateShopReviewBody = {
  rating?: number;
  title?: string | null;
  comment?: string | null;
};

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // USER
    // =================================================

    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно авторизуватися",
        },
        { status: 401 }
      );
    }

    const session = await db.session.findUnique({
      where: {
        token,
      },
      include: {
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

    if (
      !session ||
      session.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Сесія недійсна або закінчилася",
        },
        { status: 401 }
      );
    }

    if (
      session.user.isBlocked ||
      session.user.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ваш акаунт заблокований або неактивний",
        },
        { status: 403 }
      );
    }

    const userId = session.user.id;

    // =================================================
    // SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        userId: true,
        isActive: true,
        sellerStatus: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        { status: 404 }
      );
    }

    if (
      !shop.isActive ||
      shop.sellerStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин зараз неактивний",
        },
        { status: 400 }
      );
    }

    // Не дозволяємо продавцю оцінювати власний магазин
    if (shop.userId === userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Не можна залишити відгук власному магазину",
        },
        { status: 400 }
      );
    }

    // =================================================
    // BODY
    // =================================================

    let body: CreateShopReviewBody;

    try {
      body = (await request.json()) as CreateShopReviewBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const rating = Number(body.rating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Оцінка повинна бути цілим числом від 1 до 5",
        },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string"
        ? body.title.trim() || null
        : null;

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim() || null
        : null;

    // =================================================
    // DUPLICATE CHECK
    // =================================================

    const existingReview =
      await db.shopReview.findFirst({
        where: {
          userId,
          shopId: id,
        },
        select: {
          id: true,
        },
      });

    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: "Ви вже залишали відгук цьому магазину",
        },
        { status: 409 }
      );
    }

    // =================================================
    // CREATE
    // =================================================

    const review = await db.shopReview.create({
      data: {
        userId,
        shopId: id,
        rating,
        title,
        comment,
        status: "PENDING",
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
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Відгук успішно створено та передано на модерацію",
        data: review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/shops/[id]/reviews error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити відгук",
      },
      { status: 500 }
    );
  }
}