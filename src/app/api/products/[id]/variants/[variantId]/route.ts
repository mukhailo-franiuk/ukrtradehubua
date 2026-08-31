import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    variantId: string;
  }>;
};

/**
 * =========================================================
 * GET
 * /api/products/[id]/variants/[variantId]
 * =========================================================
 *
 * Отримати конкретний варіант товару.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    const variant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            shopId: true,
          },
        },

        values: {
          include: {
            attribute: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
              },
            },
            value: {
              select: {
                id: true,
                value: true,
                slug: true,
                colorHex: true,
              },
            },
          },
        },

        images: {
          include: {
            image: true,
          },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Варіант товару не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error(
      "GET /api/products/[id]/variants/[variantId] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати варіант товару",
      },
      { status: 500 }
    );
  }
}

/**
 * =========================================================
 * PATCH
 * /api/products/[id]/variants/[variantId]
 * =========================================================
 *
 * Оновлення:
 * - title
 * - sku
 * - price
 * - oldPrice
 * - stock
 * - reservedStock
 * - weight
 * - isActive
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    const body = await request.json();

    const {
      title,
      sku,
      price,
      oldPrice,
      stock,
      reservedStock,
      weight,
      isActive,
    } = body;

    /**
     * -------------------------------------------------------
     * Перевірка варіанту
     * -------------------------------------------------------
     */

    const existingVariant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            shopId: true,
          },
        },
      },
    });

    if (!existingVariant) {
      return NextResponse.json(
        {
          success: false,
          message: "Варіант товару не знайдено",
        },
        { status: 404 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевірка SKU
     * -------------------------------------------------------
     */

    if (sku !== undefined && sku !== existingVariant.sku) {
      const skuExists = await db.productVariant.findUnique({
        where: {
          sku: String(sku),
        },
        select: {
          id: true,
        },
      });

      if (skuExists && skuExists.id !== variantId) {
        return NextResponse.json(
          {
            success: false,
            message: "Варіант з таким SKU вже існує",
          },
          { status: 409 }
        );
      }
    }

    /**
     * -------------------------------------------------------
     * Валідація числових значень
     * -------------------------------------------------------
     */

    if (price !== undefined && price !== null) {
      if (Number.isNaN(Number(price)) || Number(price) < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна ціна",
          },
          { status: 400 }
        );
      }
    }

    if (oldPrice !== undefined && oldPrice !== null) {
      if (Number.isNaN(Number(oldPrice)) || Number(oldPrice) < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна стара ціна",
          },
          { status: 400 }
        );
      }
    }

    if (stock !== undefined) {
      if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна кількість товару",
          },
          { status: 400 }
        );
      }
    }

    if (reservedStock !== undefined) {
      if (
        !Number.isInteger(Number(reservedStock)) ||
        Number(reservedStock) < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректний зарезервований залишок",
          },
          { status: 400 }
        );
      }
    }

    if (weight !== undefined && weight !== null) {
      if (Number.isNaN(Number(weight)) || Number(weight) < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна вага",
          },
          { status: 400 }
        );
      }
    }

    /**
     * reservedStock не може бути більшим за stock
     */
    const finalStock =
      stock !== undefined
        ? Number(stock)
        : existingVariant.stock;

    const finalReservedStock =
      reservedStock !== undefined
        ? Number(reservedStock)
        : existingVariant.reservedStock;

    if (finalReservedStock > finalStock) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Зарезервований залишок не може перевищувати загальний залишок",
        },
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * Формуємо data
     * -------------------------------------------------------
     */

    const data: Prisma.ProductVariantUpdateInput = {};

    if (title !== undefined) {
      data.title =
        title === null || title === ""
          ? null
          : String(title).trim();
    }

    if (sku !== undefined) {
      data.sku = String(sku).trim();
    }

    if (price !== undefined) {
      data.price =
        price === null
          ? null
          : new Prisma.Decimal(String(price));
    }

    if (oldPrice !== undefined) {
      data.oldPrice =
        oldPrice === null
          ? null
          : new Prisma.Decimal(String(oldPrice));
    }

    if (stock !== undefined) {
      data.stock = Number(stock);
    }

    if (reservedStock !== undefined) {
      data.reservedStock = Number(reservedStock);
    }

    if (weight !== undefined) {
      data.weight =
        weight === null
          ? null
          : new Prisma.Decimal(String(weight));
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    /**
     * -------------------------------------------------------
     * Оновлення
     * -------------------------------------------------------
     */

    const variant = await db.productVariant.update({
      where: {
        id: variantId,
      },
      data,
      include: {
        values: {
          include: {
            attribute: true,
            value: true,
          },
        },
        images: {
          include: {
            image: true,
          },
        },
      },
    });

    /**
     * -------------------------------------------------------
     * Оновлюємо статус товару
     * -------------------------------------------------------
     */

    const variants = await db.productVariant.findMany({
      where: {
        productId,
        isActive: true,
      },
      select: {
        stock: true,
      },
    });

    const totalStock = variants.reduce(
      (sum, item) => sum + item.stock,
      0
    );

    await db.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: totalStock,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Варіант товару успішно оновлено",
      data: variant,
    });
  } catch (error) {
    console.error(
      "PATCH /api/products/[id]/variants/[variantId] error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "SKU вже використовується",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося оновити варіант товару",
      },
      { status: 500 }
    );
  }
}

/**
 * =========================================================
 * DELETE
 * /api/products/[id]/variants/[variantId]
 * =========================================================
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    /**
     * -------------------------------------------------------
     * Перевірка варіанту
     * -------------------------------------------------------
     */

    const variant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Варіант товару не знайдено",
        },
        { status: 404 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевіряємо замовлення
     * -------------------------------------------------------
     *
     * ProductVariant має relation:
     *
     * orderItems OrderItem[]
     *
     * Тому варіант, який уже використовувався
     * у замовленнях, краще не видаляти фізично.
     */

    const orderItemsCount =
      await db.orderItem.count({
        where: {
          variantId,
        },
      });

    if (orderItemsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Цей варіант вже використовувався у замовленнях. Його не можна видалити.",
          code: "VARIANT_USED_IN_ORDER",
        },
        { status: 409 }
      );
    }

    /**
     * -------------------------------------------------------
     * Видалення
     * -------------------------------------------------------
     *
     * VariantValue та ProductVariantImage
     * видаляться через onDelete: Cascade.
     */

    await db.productVariant.delete({
      where: {
        id: variantId,
      },
    });

    /**
     * -------------------------------------------------------
     * Перерахунок stock товару
     * -------------------------------------------------------
     */

    const variants = await db.productVariant.findMany({
      where: {
        productId,
        isActive: true,
      },
      select: {
        stock: true,
      },
    });

    const totalStock = variants.reduce(
      (sum, item) => sum + item.stock,
      0
    );

    await db.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: totalStock,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Варіант товару успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id]/variants/[variantId] error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Варіант не можна видалити через пов'язані дані",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося видалити варіант товару",
      },
      { status: 500 }
    );
  }
}