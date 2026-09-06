import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/*
 * ============================================================
 * PATCH /api/cart/[id]
 * ============================================================
 *
 * Змінює кількість конкретної позиції кошика.
 *
 * Body:
 *
 * {
 *   "quantity": 3
 * }
 *
 * Якщо quantity <= 0 — позиція видаляється.
 *
 * ВАЖЛИВО:
 * [id] — це ID CartItem, а не productId.
 */

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    /*
     * ----------------------------------------------------------
     * PARAMS
     * ----------------------------------------------------------
     */

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "CART_ITEM_ID_REQUIRED",
          message: "ID позиції кошика є обов'язковим.",
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------------------------
     * AUTH
     * ----------------------------------------------------------
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Потрібно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    /*
     * ----------------------------------------------------------
     * BODY
     * ----------------------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_JSON",
          message: "Некоректний JSON.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "Некоректне тіло запиту.",
        },
        { status: 400 }
      );
    }

    const data = body as {
      quantity?: unknown;
    };

    const quantity = Number(data.quantity);

    /*
     * ----------------------------------------------------------
     * QUANTITY
     * ----------------------------------------------------------
     */

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_QUANTITY",
          message:
            "Кількість повинна бути цілим числом від 0 до 100.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * CART ITEM
     * ==========================================================
     *
     * Одразу перевіряємо:
     *
     * cartItem.id
     * cartItem.cart.userId
     *
     * Тобто користувач не зможе змінити чужу позицію.
     */

    const cartItem = await db.cartItem.findFirst({
      where: {
        id,

        cart: {
          userId: user.id,
        },
      },

      select: {
        id: true,
        cartId: true,
        productId: true,
        variantId: true,
        quantity: true,

        product: {
          select: {
            id: true,
            title: true,
            status: true,
            stock: true,
            reservedStock: true,

            shop: {
              select: {
                id: true,
                isActive: true,
                sellerStatus: true,
              },
            },
          },
        },

        variant: {
          select: {
            id: true,
            productId: true,
            stock: true,
            reservedStock: true,
            isActive: true,
          },
        },
      },
    });

    /*
     * ----------------------------------------------------------
     * ITEM NOT FOUND
     * ----------------------------------------------------------
     */

    if (!cartItem) {
      return NextResponse.json(
        {
          success: false,
          error: "CART_ITEM_NOT_FOUND",
          message: "Позицію кошика не знайдено.",
        },
        { status: 404 }
      );
    }

    /*
     * ==========================================================
     * QUANTITY = 0
     * ==========================================================
     *
     * Видаляємо позицію.
     */

    if (quantity === 0) {
      await db.cartItem.delete({
        where: {
          id: cartItem.id,
        },
      });

      return NextResponse.json({
        success: true,
        deleted: true,
        message: "Товар видалено з кошика.",
        item: {
          id: cartItem.id,
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          quantity: 0,
        },
      });
    }

    /*
     * ==========================================================
     * PRODUCT VALIDATION
     * ==========================================================
     */

    if (cartItem.product.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "PRODUCT_NOT_AVAILABLE",
          message: "Товар зараз недоступний.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * SHOP VALIDATION
     * ==========================================================
     */

    if (
      !cartItem.product.shop ||
      !cartItem.product.shop.isActive ||
      cartItem.product.shop.sellerStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "SHOP_NOT_AVAILABLE",
          message: "Магазин зараз недоступний.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * VARIANT VALIDATION
     * ==========================================================
     */

    if (cartItem.variantId) {
      if (!cartItem.variant) {
        return NextResponse.json(
          {
            success: false,
            error: "VARIANT_NOT_FOUND",
            message: "Варіант товару більше не існує.",
          },
          { status: 400 }
        );
      }

      if (!cartItem.variant.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: "VARIANT_NOT_AVAILABLE",
            message: "Цей варіант товару недоступний.",
          },
          { status: 400 }
        );
      }

      if (
        cartItem.variant.productId !==
        cartItem.productId
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_VARIANT",
            message: "Варіант не належить цьому товару.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * ==========================================================
     * AVAILABLE STOCK
     * ==========================================================
     */

    const availableStock = cartItem.variant
      ? Math.max(
          0,
          cartItem.variant.stock -
            cartItem.variant.reservedStock
        )
      : Math.max(
          0,
          cartItem.product.stock -
            cartItem.product.reservedStock
        );

    /*
     * ----------------------------------------------------------
     * OUT OF STOCK
     * ----------------------------------------------------------
     */

    if (availableStock <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "OUT_OF_STOCK",
          message: "Товару більше немає в наявності.",
          availableStock: 0,
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------------------------
     * INSUFFICIENT STOCK
     * ----------------------------------------------------------
     */

    if (quantity > availableStock) {
      return NextResponse.json(
        {
          success: false,
          error: "INSUFFICIENT_STOCK",
          message: `Доступно лише ${availableStock} шт.`,
          availableStock,
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * UPDATE
     * ==========================================================
     */

    const updatedItem = await db.cartItem.update({
      where: {
        id: cartItem.id,
      },

      data: {
        quantity,
      },

      select: {
        id: true,
        productId: true,
        variantId: true,
        quantity: true,
      },
    });

    /*
     * ==========================================================
     * RESPONSE
     * ==========================================================
     */

    return NextResponse.json({
      success: true,

      message: "Кількість товару оновлено.",

      item: updatedItem,

      availableStock,
    });
  } catch (error) {
    console.error(
      "PATCH /api/cart/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          "Не вдалося оновити кількість товару.",
      },
      { status: 500 }
    );
  }
}

/*
 * ============================================================
 * DELETE /api/cart/[id]
 * ============================================================
 *
 * Видаляє конкретну позицію з кошика.
 *
 * [id] = CartItem.id
 */

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    /*
     * ----------------------------------------------------------
     * PARAMS
     * ----------------------------------------------------------
     */

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "CART_ITEM_ID_REQUIRED",
          message: "ID позиції кошика є обов'язковим.",
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------------------------
     * AUTH
     * ----------------------------------------------------------
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Потрібно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    /*
     * ----------------------------------------------------------
     * FIND ITEM
     * ----------------------------------------------------------
     *
     * Перевіряємо, що CartItem належить кошику
     * поточного користувача.
     */

    const cartItem = await db.cartItem.findFirst({
      where: {
        id,

        cart: {
          userId: user.id,
        },
      },

      select: {
        id: true,
        productId: true,
        variantId: true,
        quantity: true,
      },
    });

    /*
     * ----------------------------------------------------------
     * NOT FOUND
     * ----------------------------------------------------------
     */

    if (!cartItem) {
      return NextResponse.json(
        {
          success: false,
          error: "CART_ITEM_NOT_FOUND",
          message: "Позицію кошика не знайдено.",
        },
        { status: 404 }
      );
    }

    /*
     * ----------------------------------------------------------
     * DELETE
     * ----------------------------------------------------------
     */

    await db.cartItem.delete({
      where: {
        id: cartItem.id,
      },
    });

    /*
     * ----------------------------------------------------------
     * SUCCESS
     * ----------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      deleted: true,

      message: "Товар видалено з кошика.",

      item: {
        id: cartItem.id,
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
      },
    });
  } catch (error) {
    console.error(
      "DELETE /api/cart/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          "Не вдалося видалити товар з кошика.",
      },
      { status: 500 }
    );
  }
}