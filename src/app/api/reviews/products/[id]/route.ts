
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * GET /api/reviews/products/[productId]
 *
 * Публічне отримання схвалених відгуків товару.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Product ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        title: true,
        rating: true,
        reviewsCount: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found",
        },
        {
          status: 404,
        }
      );
    }

    const reviews = await db.productReview.findMany({
      where: {
        productId: id,
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

    const aggregate = await db.productReview.aggregate({
      where: {
        productId: id,
        status: "APPROVED",
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });

    const distribution = await db.productReview.groupBy({
      by: ["rating"],
      where: {
        productId: id,
        status: "APPROVED",
      },
      _count: {
        _all: true,
      },
      orderBy: {
        rating: "desc",
      },
    });

    return NextResponse.json({
      product: {
        id: product.id,
        title: product.title,
        rating: Number(product.rating),
        reviewsCount: product.reviewsCount,
      },

      summary: {
        averageRating: Number(
          aggregate._avg.rating ?? 0
        ),
        reviewsCount: aggregate._count._all,

        distribution: distribution.map((item) => ({
          rating: item.rating,
          count: item._count._all,
        })),
      },

      reviews,
    });
  } catch (error) {
    console.error(
      "GET /api/reviews/products/[productId] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load product reviews",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST /api/reviews/products/[productId]
 *
 * Створення відгуку на товар.
 *
 * Важливо:
 * - orderItemId є обов'язковим;
 * - orderItem повинен належати поточному користувачу;
 * - orderItem повинен належати цьому productId;
 * - один orderItem може мати тільки один review;
 * - новий review отримує статус PENDING.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Product ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found",
        },
        {
          status: 404,
        }
      );
    }

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
        }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        {
          status: 400,
        }
      );
    }

    const data = body as {
      orderItemId?: unknown;
      rating?: unknown;
      title?: unknown;
      comment?: unknown;
    };

    /*
     * -------------------------------------------------------
     * ORDER ITEM
     * -------------------------------------------------------
     */

    if (
      typeof data.orderItemId !== "string" ||
      !data.orderItemId.trim()
    ) {
      return NextResponse.json(
        {
          error: "orderItemId is required",
        },
        {
          status: 400,
        }
      );
    }

    const orderItemId = data.orderItemId.trim();

    const orderItem = await db.orderItem.findUnique({
      where: {
        id: orderItemId,
      },
      select: {
        id: true,
        productId: true,
        shopId: true,

        order: {
          select: {
            id: true,
            userId: true,
          },
        },

        review: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        {
          error: "Order item not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Перевіряємо, що цей orderItem належить
     * поточному користувачу.
     */
    if (orderItem.order.userId !== user.id) {
      return NextResponse.json(
        {
          error:
            "You can only review products from your own orders",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Перевіряємо, що orderItem справді відноситься
     * до товару з URL.
     */
    if (orderItem.productId !== id) {
      return NextResponse.json(
        {
          error:
            "This order item does not belong to this product",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Один OrderItem = максимум один ProductReview.
     */
    if (orderItem.review) {
      return NextResponse.json(
        {
          error: "This order item has already been reviewed",
          reviewId: orderItem.review.id,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * -------------------------------------------------------
     * RATING
     * -------------------------------------------------------
     */

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
          error: "Rating must be an integer from 1 to 5",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -------------------------------------------------------
     * TITLE
     * -------------------------------------------------------
     */

    const title =
      typeof data.title === "string"
        ? data.title.trim()
        : null;

    if (title && title.length > 200) {
      return NextResponse.json(
        {
          error: "Title must not exceed 200 characters",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -------------------------------------------------------
     * COMMENT
     * -------------------------------------------------------
     */

    const comment =
      typeof data.comment === "string"
        ? data.comment.trim()
        : null;

    if (comment && comment.length > 5000) {
      return NextResponse.json(
        {
          error: "Comment must not exceed 5000 characters",
        },
        {
          status: 400,
        }
      );
    }

    if (!title && !comment) {
      return NextResponse.json(
        {
          error: "Title or comment is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -------------------------------------------------------
     * CREATE REVIEW
     * -------------------------------------------------------
     */

    const review = await db.productReview.create({
      data: {
        userId: user.id,
        productId: id,
        orderItemId,

        rating,
        title: title || null,
        comment: comment || null,

        /*
         * Відгук спочатку проходить модерацію.
         */
        status: "PENDING",
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
      },
    });

    return NextResponse.json(
      {
        message:
          "Review submitted successfully and is awaiting moderation",

        review,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/reviews/products/[productId] error:",
      error
    );

    /*
     * Захист від race condition:
     * orderItemId має @unique у Prisma.
     */
    if (
      error instanceof Error &&
      error.message.includes(
        "Unique constraint failed"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This order item has already been reviewed",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create product review",
      },
      {
        status: 500,
      }
    );
  }
}