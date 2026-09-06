import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/reviews/shops/[id]
 *
 * Публічне отримання схвалених відгуків магазину.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Shop ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // SHOP
    // =====================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        rating: true,

        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          error: "Shop not found",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // REVIEWS
    // =====================================================

    const reviews =
      await db.shopReview.findMany({
        where: {
          shopId: id,
          status: "APPROVED",
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,

          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    // =====================================================
    // AGGREGATE
    // =====================================================

    const aggregate =
      await db.shopReview.aggregate({
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
      });

    // =====================================================
    // DISTRIBUTION
    // =====================================================

    const distribution =
      await db.shopReview.groupBy({
        by: ["rating"],

        where: {
          shopId: id,
          status: "APPROVED",
        },

        _count: {
          _all: true,
        },

        orderBy: {
          rating: "desc",
        },
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      shop: {
        id: shop.id,
        name: shop.name,
        rating: Number(shop.rating),

        reviewsCount:
          shop._count.reviews,
      },

      summary: {
        averageRating: Number(
          aggregate._avg.rating ?? 0,
        ),

        reviewsCount:
          aggregate._count._all,

        distribution:
          distribution.map((item) => ({
            rating: item.rating,
            count: item._count._all,
          })),
      },

      reviews,
    });
  } catch (error) {
    console.error(
      "GET /api/reviews/shops/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to load shop reviews",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * POST /api/reviews/shops/[id]
 *
 * Створення відгуку на магазин.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    // =====================================================
    // AUTH
    // =====================================================

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Shop ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // SHOP
    // =====================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          error: "Shop not found",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // BODY
    // =====================================================

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        {
          status: 400,
        },
      );
    }

    const data = body as {
      rating?: unknown;
      title?: unknown;
      comment?: unknown;
    };

    // =====================================================
    // RATING
    // =====================================================

    const rating =
      typeof data.rating === "number"
        ? data.rating
        : Number(data.rating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          error:
            "Rating must be an integer from 1 to 5",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // TITLE
    // =====================================================

    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : null;

    if (
      title &&
      title.length > 200
    ) {
      return NextResponse.json(
        {
          error:
            "Title must not exceed 200 characters",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // COMMENT
    // =====================================================

    const comment =
      typeof data.comment === "string"
        ? data.comment.trim()
        : null;

    if (
      comment &&
      comment.length > 5000
    ) {
      return NextResponse.json(
        {
          error:
            "Comment must not exceed 5000 characters",
        },
        {
          status: 400,
        },
      );
    }

    if (!title && !comment) {
      return NextResponse.json(
        {
          error:
            "Title or comment is required",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // DUPLICATE REVIEW
    // =====================================================

    const existingReview =
      await db.shopReview.findFirst({
        where: {
          userId: user.id,
          shopId: id,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (existingReview) {
      return NextResponse.json(
        {
          error:
            "You have already reviewed this shop",

          reviewId:
            existingReview.id,

          status:
            existingReview.status,
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // VERIFY PURCHASE
    // =====================================================

    const purchasedItem =
      await db.orderItem.findFirst({
        where: {
          shopId: id,

          order: {
            userId: user.id,
          },
        },

        select: {
          id: true,
        },
      });

    if (!purchasedItem) {
      return NextResponse.json(
        {
          error:
            "You can only review a shop after purchasing from it",
        },
        {
          status: 403,
        },
      );
    }

    // =====================================================
    // CREATE REVIEW
    // =====================================================

    const review =
      await db.shopReview.create({
        data: {
          userId: user.id,
          shopId: id,

          rating,
          title: title || null,
          comment: comment || null,

          status: "PENDING",
        },

        select: {
          id: true,
          shopId: true,
          rating: true,
          title: true,
          comment: true,
          status: true,
          createdAt: true,
        },
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        message:
          "Shop review submitted successfully and is awaiting moderation",

        review,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/reviews/shops/[id] error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create shop review",
      },
      {
        status: 500,
      },
    );
  }
}