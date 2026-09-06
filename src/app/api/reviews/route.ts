import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/prisma";

const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

type ReviewStatusFilter =
  (typeof VALID_STATUSES)[number];

type ReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // ADMIN AUTH
    // =====================================================

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // =====================================================
    // QUERY
    // =====================================================

    const searchParams =
      request.nextUrl.searchParams;

    const rawStatus =
      (
        searchParams.get("status") ??
        "ALL"
      ).toUpperCase();

    const status: ReviewStatusFilter =
      VALID_STATUSES.includes(
        rawStatus as ReviewStatusFilter,
      )
        ? (rawStatus as ReviewStatusFilter)
        : "ALL";

    const rawPage = Number(
      searchParams.get("page") ?? "1",
    );

    const rawLimit = Number(
      searchParams.get("limit") ?? "20",
    );

    const page =
      Number.isFinite(rawPage) && rawPage > 0
        ? Math.floor(rawPage)
        : 1;

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 20;

    // =====================================================
    // WHERE
    // =====================================================

    const reviewStatus =
      status === "ALL"
        ? undefined
        : (status as ReviewStatus);

    const productWhere =
      reviewStatus === undefined
        ? {}
        : {
            status: reviewStatus,
          };

    const shopWhere =
      reviewStatus === undefined
        ? {}
        : {
            status: reviewStatus,
          };

    // =====================================================
    // LOAD REVIEWS + COUNTS
    // =====================================================

    const [
      productReviews,
      shopReviews,

      pendingProducts,
      pendingShops,

      approvedProducts,
      approvedShops,

      rejectedProducts,
      rejectedShops,
    ] = await Promise.all([
      // ---------------------------------------------------
      // PRODUCT REVIEWS
      // ---------------------------------------------------

      db.productReview.findMany({
        where: productWhere,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          productId: true,
          orderItemId: true,
          rating: true,
          title: true,
          comment: true,
          status: true,
          createdAt: true,
          updatedAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              rating: true,
              reviewsCount: true,
            },
          },
        },
      }),

      // ---------------------------------------------------
      // SHOP REVIEWS
      // ---------------------------------------------------

      db.shopReview.findMany({
        where: shopWhere,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          shopId: true,
          rating: true,
          title: true,
          comment: true,
          status: true,
          createdAt: true,
          updatedAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              rating: true,

              _count: {
                select: {
                  reviews: true,
                },
              },
            },
          },
        },
      }),

      // ---------------------------------------------------
      // COUNTS
      // ---------------------------------------------------

      db.productReview.count({
        where: {
          status: "PENDING",
        },
      }),

      db.shopReview.count({
        where: {
          status: "PENDING",
        },
      }),

      db.productReview.count({
        where: {
          status: "APPROVED",
        },
      }),

      db.shopReview.count({
        where: {
          status: "APPROVED",
        },
      }),

      db.productReview.count({
        where: {
          status: "REJECTED",
        },
      }),

      db.shopReview.count({
        where: {
          status: "REJECTED",
        },
      }),
    ]);

    // =====================================================
    // NORMALIZE REVIEWS
    // =====================================================

    const reviews = [
      ...productReviews.map((review) => ({
        id: review.id,

        type: "PRODUCT" as const,

        targetId: review.productId,
        targetName: review.product.title,

        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: review.status,

        createdAt: review.createdAt,
        updatedAt: review.updatedAt,

        orderItemId: review.orderItemId,

        user: review.user,

        product: review.product,

        shop: null,
      })),

      ...shopReviews.map((review) => ({
        id: review.id,

        type: "SHOP" as const,

        targetId: review.shopId,
        targetName: review.shop.name,

        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: review.status,

        createdAt: review.createdAt,
        updatedAt: review.updatedAt,

        orderItemId: null,

        user: review.user,

        product: null,

        shop: {
          id: review.shop.id,
          name: review.shop.name,
          slug: review.shop.slug,
          rating: review.shop.rating,
          reviewsCount:
            review.shop._count.reviews,
        },
      })),
    ].sort(
      (a, b) =>
        b.createdAt.getTime() -
        a.createdAt.getTime(),
    );

    // =====================================================
    // PAGINATION
    // =====================================================

    const total = reviews.length;

    const start =
      (page - 1) * limit;

    const paginatedReviews =
      reviews.slice(
        start,
        start + limit,
      );

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit),
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      reviews: paginatedReviews,

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },

      counts: {
        pending:
          pendingProducts +
          pendingShops,

        approved:
          approvedProducts +
          approvedShops,

        rejected:
          rejectedProducts +
          rejectedShops,

        total:
          pendingProducts +
          pendingShops +
          approvedProducts +
          approvedShops +
          rejectedProducts +
          rejectedShops,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/reviews error:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to load reviews",
      },
      {
        status: 500,
      },
    );
  }
}