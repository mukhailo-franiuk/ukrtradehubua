
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Потрібно увійти в акаунт",
        },
        { status: 401 }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 1. ВСІ покупки цього товару поточного користувача
    // =====================================================

    const allUserOrderItems =
      await db.orderItem.findMany({
        where: {
          productId: id,

          order: {
            userId: user.id,
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          productId: true,
          productTitle: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          sku: true,
          variantId: true,

          order: {
            select: {
              id: true,
              orderNumber: true,
              userId: true,
              status: true,
              createdAt: true,
            },
          },

          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          review: {
            select: {
              id: true,
              rating: true,
              status: true,
            },
          },
        },
      });

    // =====================================================
    // 2. Тільки ті, де ще немає відгуку
    // =====================================================

    const eligibleItems =
      allUserOrderItems.filter(
        (item) => !item.review
      );

    // =====================================================
    // 3. Формуємо відповідь
    // =====================================================

    const orderItems = eligibleItems.map(
      (item) => ({
        id: item.id,

        quantity: item.quantity,

        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),

        productTitle: item.productTitle,
        sku: item.sku,
        variantId: item.variantId,

        order: {
          id: item.order.id,
          orderNumber: item.order.orderNumber,
          createdAt:
            item.order.createdAt.toISOString(),
          status: item.order.status,
        },

        shop: {
          id: item.shop.id,
          name: item.shop.name,
          slug: item.shop.slug,
        },
      })
    );

    return NextResponse.json({
      success: true,

      product: {
        id: product.id,
        title: product.title,
      },

      orderItems,

      // ===================================================
      // ДІАГНОСТИКА
      // ===================================================
      //
      // Тимчасово залишаємо ці дані.
      // Вони допоможуть зрозуміти ситуацію.
      //
      debug: {
        userId: user.id,

        productId: id,

        allUserOrderItemsCount:
          allUserOrderItems.length,

        eligibleOrderItemsCount:
          eligibleItems.length,

        itemsWithReviewCount:
          allUserOrderItems.filter(
            (item) => !!item.review
          ).length,

        items: allUserOrderItems.map(
          (item) => ({
            orderItemId: item.id,
            productId: item.productId,
            productTitle: item.productTitle,

            orderId: item.order.id,
            orderNumber:
              item.order.orderNumber,

            orderUserId:
              item.order.userId,

            orderStatus:
              item.order.status,

            review: item.review
              ? {
                  id: item.review.id,
                  rating:
                    item.review.rating,
                  status:
                    item.review.status,
                }
              : null,
          })
        ),
      },
    });
  } catch (error) {
    console.error(
      "[REVIEWS] eligible-order-items error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Не вдалося перевірити покупки",
      },
      {
        status: 500,
      }
    );
  }
}