import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    variantId: string;
  }>;
};

type CreateValueBody = {
  attributeId?: unknown;
  valueId?: unknown;
};

type UpdateValueBody = {
  attributeId?: unknown;
  valueId?: unknown;
};

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * =========================================================
 * GET
 *
 * /api/products/[id]/variants/[variantId]/values
 *
 * Отримати всі AttributeValue конкретного варіанту.
 * =========================================================
 */

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    /**
     * Перевіряємо, що variant належить саме цьому product.
     */
    const variant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      select: {
        id: true,
        productId: true,
        sku: true,
        title: true,
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

    const values = await db.variantValue.findMany({
      where: {
        variantId,
      },

      include: {
        attribute: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            isFilterable: true,
            isRequired: true,
          },
        },

        value: {
          select: {
            id: true,
            attributeId: true,
            value: true,
            slug: true,
            colorHex: true,
            sortOrder: true,
          },
        },
      },

      orderBy: {
        attribute: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: values,
      meta: {
        variantId,
        productId,
        count: values.length,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/products/[id]/variants/[variantId]/values error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати значення варіанту",
      },
      { status: 500 }
    );
  }
}

/**
 * =========================================================
 * POST
 *
 * /api/products/[id]/variants/[variantId]/values
 *
 * Body:
 *
 * {
 *   "attributeId": "...",
 *   "valueId": "..."
 * }
 *
 * Наприклад:
 *
 * {
 *   "attributeId": "color-id",
 *   "valueId": "black-id"
 * }
 *
 * =========================================================
 */

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    let body: CreateValueBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const { attributeId, valueId } = body;

    /**
     * -------------------------------------------------------
     * Валідація body
     * -------------------------------------------------------
     */

    if (!isNonEmptyString(attributeId)) {
      return NextResponse.json(
        {
          success: false,
          message: "attributeId є обов'язковим",
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(valueId)) {
      return NextResponse.json(
        {
          success: false,
          message: "valueId є обов'язковим",
        },
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевіряємо variant
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
     * Перевіряємо Attribute
     * -------------------------------------------------------
     */

    const attribute = await db.attribute.findUnique({
      where: {
        id: attributeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        {
          success: false,
          message: "Атрибут не знайдено",
        },
        { status: 404 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевіряємо AttributeValue
     *
     * ВАЖЛИВО:
     *
     * valueId повинен належати саме цьому attributeId.
     * -------------------------------------------------------
     */

    const attributeValue =
      await db.attributeValue.findFirst({
        where: {
          id: valueId,
          attributeId,
        },

        select: {
          id: true,
          attributeId: true,
          value: true,
          slug: true,
          colorHex: true,
        },
      });

    if (!attributeValue) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення атрибута не існує або не належить цьому атрибуту",
        },
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * Один Attribute тільки один раз у Variant
     *
     * @@unique([variantId, attributeId])
     * -------------------------------------------------------
     */

    const existing = await db.variantValue.findFirst({
      where: {
        variantId,
        attributeId,
      },
      select: {
        id: true,
        valueId: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Цей атрибут уже доданий до варіанту",
          data: {
            existingValueId: existing.valueId,
          },
        },
        { status: 409 }
      );
    }

    /**
     * -------------------------------------------------------
     * Створюємо VariantValue
     * -------------------------------------------------------
     */

    const variantValue = await db.variantValue.create({
      data: {
        variantId,
        attributeId,
        valueId,
      },

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
            attributeId: true,
            value: true,
            slug: true,
            colorHex: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Значення атрибута додано до варіанту",
        data: variantValue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/products/[id]/variants/[variantId]/values error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Цей атрибут уже використовується у варіанті",
          },
          { status: 409 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Невірний зв'язок з атрибутом або його значенням",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося додати значення атрибута",
      },
      { status: 500 }
    );
  }
}

/**
 * =========================================================
 * PATCH
 *
 * /api/products/[id]/variants/[variantId]/values
 *
 * Body:
 *
 * {
 *   "attributeId": "...",
 *   "valueId": "..."
 * }
 *
 * Оскільки endpoint працює з усім набором значень,
 * PATCH замінює value конкретного attribute.
 *
 * =========================================================
 */

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    let body: UpdateValueBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const { attributeId, valueId } = body;

    if (!isNonEmptyString(attributeId)) {
      return NextResponse.json(
        {
          success: false,
          message: "attributeId є обов'язковим",
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(valueId)) {
      return NextResponse.json(
        {
          success: false,
          message: "valueId є обов'язковим",
        },
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевіряємо Variant
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
     * Перевіряємо Attribute
     * -------------------------------------------------------
     */

    const attribute = await db.attribute.findUnique({
      where: {
        id: attributeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        {
          success: false,
          message: "Атрибут не знайдено",
        },
        { status: 404 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевіряємо AttributeValue
     * -------------------------------------------------------
     */

    const attributeValue =
      await db.attributeValue.findFirst({
        where: {
          id: valueId,
          attributeId,
        },

        select: {
          id: true,
          attributeId: true,
          value: true,
          slug: true,
          colorHex: true,
        },
      });

    if (!attributeValue) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення не існує або не належить цьому атрибуту",
        },
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * Знаходимо існуюче значення
     * -------------------------------------------------------
     */

    const existing = await db.variantValue.findFirst({
      where: {
        variantId,
        attributeId,
      },
      select: {
        id: true,
        valueId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Цей атрибут ще не доданий до варіанту",
        },
        { status: 404 }
      );
    }

    /**
     * -------------------------------------------------------
     * Якщо value той самий
     * -------------------------------------------------------
     */

    if (existing.valueId === valueId) {
      const current = await db.variantValue.findUnique({
        where: {
          id: existing.id,
        },

        include: {
          attribute: true,
          value: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Значення вже встановлено",
        data: current,
      });
    }

    /**
     * -------------------------------------------------------
     * Оновлюємо
     * -------------------------------------------------------
     */

    const updated = await db.variantValue.update({
      where: {
        id: existing.id,
      },

      data: {
        valueId,
      },

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
            attributeId: true,
            value: true,
            slug: true,
            colorHex: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Значення атрибута оновлено",
      data: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/products/[id]/variants/[variantId]/values error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Цей атрибут уже використовується у варіанті",
          },
          { status: 409 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Невірний зв'язок з атрибутом або його значенням",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося оновити значення атрибута",
      },
      { status: 500 }
    );
  }
}

/**
 * =========================================================
 * DELETE
 *
 * /api/products/[id]/variants/[variantId]/values
 *
 * Body:
 *
 * {
 *   "attributeId": "..."
 * }
 *
 * Видаляє значення конкретного атрибута
 * з конкретного ProductVariant.
 *
 * =========================================================
 */

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: productId, variantId } = await params;

    let body: {
      attributeId?: unknown;
    } = {};

    /**
     * DELETE може прийти без body,
     * тому JSON обробляємо без падіння.
     */

    try {
      body = await request.json();
    } catch {
      // body відсутній
    }

    const { attributeId } = body;

    if (!isNonEmptyString(attributeId)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Для видалення потрібно передати attributeId",
        },
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * Перевіряємо Variant
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
     * Знаходимо VariantValue
     * -------------------------------------------------------
     */

    const existing = await db.variantValue.findFirst({
      where: {
        variantId,
        attributeId,
      },
      select: {
        id: true,
        attributeId: true,
        valueId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення цього атрибута у варіанті не знайдено",
        },
        { status: 404 }
      );
    }

    /**
     * -------------------------------------------------------
     * Видаляємо
     * -------------------------------------------------------
     */

    await db.variantValue.delete({
      where: {
        id: existing.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Значення атрибута видалено з варіанту",
      data: {
        variantId,
        attributeId: existing.attributeId,
        valueId: existing.valueId,
      },
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id]/variants/[variantId]/values error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Значення варіанту вже було видалено",
          },
          { status: 404 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Не вдалося видалити пов'язане значення",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося видалити значення атрибута",
      },
      { status: 500 }
    );
  }
}