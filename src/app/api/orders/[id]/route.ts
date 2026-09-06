import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення не вказано",
        },
        { status: 400 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
        shippingAddress: true,

        items: {
          orderBy: {
            createdAt: "asc",
          },

          include: {
            product: {
              select: {
                id: true,
                slug: true,
                title: true,

                images: {
                  orderBy: {
                    sortOrder: "asc",
                  },

                  select: {
                    id: true,
                    url: true,
                    thumbnailUrl: true,
                    alt: true,
                    sortOrder: true,
                    isPrimary: true,
                  },
                },
              },
            },

            variant: {
              select: {
                id: true,
                title: true,
                price: true,
                oldPrice: true,
                stock: true,
                reservedStock: true,
                isActive: true,
              },
            },

            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                rating: true,
              },
            },
          },
        },

        sellers: {
          orderBy: {
            createdAt: "asc",
          },

          include: {
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                rating: true,
              },
            },
          },
        },

        payments: {
          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            provider: true,
            transactionId: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,

      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,

        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        deliveryAmount: order.deliveryAmount,
        total: order.total,

        customerNote: order.customerNote,
        shippingAddressId: order.shippingAddressId,
        shippingMethod: order.shippingMethod,

        createdAt: order.createdAt,
        updatedAt: order.updatedAt,

        shippingAddress: order.shippingAddress
          ? {
              id: order.shippingAddress.id,

              firstName: order.shippingAddress.firstName,
              lastName: order.shippingAddress.lastName,
              phone: order.shippingAddress.phone,

              city: order.shippingAddress.city,
              region: order.shippingAddress.region,

              street: order.shippingAddress.street,
              building: order.shippingAddress.building,
              apartment: order.shippingAddress.apartment,

              novaPoshtaWarehouse:
                order.shippingAddress.novaPoshtaWarehouse,

              isDefault: order.shippingAddress.isDefault,
            }
          : null,

        items: order.items.map((item) => ({
          id: item.id,

          productId: item.productId,
          variantId: item.variantId,
          shopId: item.shopId,

          productTitle: item.productTitle,
          sku: item.sku,

          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,

          product: {
            id: item.product.id,
            slug: item.product.slug,
            title: item.product.title,

            images: item.product.images.map((image) => ({
              id: image.id,
              url: image.url,
              thumbnailUrl: image.thumbnailUrl,
              alt: image.alt,
              sortOrder: image.sortOrder,
              isPrimary: image.isPrimary,
            })),
          },

          variant: item.variant
            ? {
                id: item.variant.id,
                title: item.variant.title,
                price: item.variant.price,
                oldPrice: item.variant.oldPrice,
                stock: item.variant.stock,
                reservedStock: item.variant.reservedStock,
                isActive: item.variant.isActive,
              }
            : null,

          shop: {
            id: item.shop.id,
            name: item.shop.name,
            slug: item.shop.slug,
            rating: item.shop.rating,
          },
        })),

        sellers: order.sellers.map((seller) => ({
          id: seller.id,

          subtotal: seller.subtotal,
          shipping: seller.shipping,
          total: seller.total,

          status: seller.status,

          shop: {
            id: seller.shop.id,
            name: seller.shop.name,
            slug: seller.shop.slug,
            rating: seller.shop.rating,
          },
        })),

        payments: order.payments.map((payment) => ({
          id: payment.id,

          amount: payment.amount,
          method: payment.method,
          status: payment.status,

          provider: payment.provider,
          transactionId: payment.transactionId,
          paidAt: payment.paidAt,

          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error(
      "[GET /api/orders/[id]]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося завантажити замовлення",
      },
      { status: 500 },
    );
  }
}