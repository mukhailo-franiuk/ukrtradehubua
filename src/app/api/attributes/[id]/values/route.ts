import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// HELPERS
// =====================================================

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateSlug(value: string) {
  return normalizeSlug(value) || `value-${Date.now()}`;
}

function isValidColorHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// =====================================================
// GET
// GET /api/attributes/[id]/values
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID атрибута є обов'язковим",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // CHECK ATTRIBUTE
    // -------------------------------------------------

    const attribute = await db.attribute.findUnique({
      where: {
        id,
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

    // -------------------------------------------------
    // QUERY
    // -------------------------------------------------

    const { searchParams } = new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const page = Math.max(
      Number(searchParams.get("page") || "1"),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || "100"),
        1
      ),
      200
    );

    const skip = (page - 1) * limit;

    const where: Prisma.AttributeValueWhereInput = {
      attributeId: id,
    };

    if (search) {
      where.OR = [
        {
          value: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // -------------------------------------------------
    // FETCH
    // -------------------------------------------------

    const [values, total] = await Promise.all([
      db.attributeValue.findMany({
        where,
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            value: "asc",
          },
        ],
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              productValues: true,
              variantValues: true,
            },
          },
        },
      }),

      db.attributeValue.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,

      attribute,

      data: values,

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "GET /api/attributes/[id]/values error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося отримати значення атрибута",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST
// POST /api/attributes/[id]/values
// =====================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID атрибута є обов'язковим",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------
    // ADMIN
    // -------------------------------------------------

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // CHECK ATTRIBUTE
    // -------------------------------------------------

    const attribute = await db.attribute.findUnique({
      where: {
        id,
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

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: unknown;

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

    if (
      typeof body !== "object" ||
      body === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректні дані",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    // -------------------------------------------------
    // VALUE
    // -------------------------------------------------

    const value =
      typeof data.value === "string"
        ? data.value.trim()
        : "";

    if (!value) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення атрибута є обов'язковим",
        },
        { status: 400 }
      );
    }

    if (value.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення не може перевищувати 150 символів",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // SLUG
    // -------------------------------------------------

    const requestedSlug =
      typeof data.slug === "string"
        ? data.slug.trim()
        : "";

    const slug = generateSlug(
      requestedSlug || value
    );

    // -------------------------------------------------
    // COLOR
    // -------------------------------------------------

    const colorHex =
      typeof data.colorHex === "string"
        ? data.colorHex.trim()
        : null;

    if (
      colorHex &&
      !isValidColorHex(colorHex)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Некоректний HEX колір: ${colorHex}`,
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // SORT ORDER
    // -------------------------------------------------

    const sortOrder =
      typeof data.sortOrder === "number" &&
      Number.isInteger(data.sortOrder)
        ? data.sortOrder
        : 0;

    // -------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------

    const existingValue =
      await db.attributeValue.findFirst({
        where: {
          attributeId: id,
          slug,
        },
        select: {
          id: true,
        },
      });

    if (existingValue) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Таке значення вже існує для цього атрибута",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------
    // CREATE
    // -------------------------------------------------

    const createdValue =
      await db.attributeValue.create({
        data: {
          attributeId: id,
          value,
          slug,
          colorHex,
          sortOrder,
        },

        include: {
          _count: {
            select: {
              productValues: true,
              variantValues: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Значення успішно створено",
        data: createdValue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/attributes/[id]/values error:",
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
              "Таке значення вже існує для цього атрибута",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося створити значення атрибута",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH
// PATCH /api/attributes/[id]/values
//
// Масове оновлення значень
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID атрибута є обов'язковим",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------
    // ADMIN
    // -------------------------------------------------

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // ATTRIBUTE
    // -------------------------------------------------

    const attribute = await db.attribute.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
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

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: unknown;

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

    if (
      typeof body !== "object" ||
      body === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректні дані",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    if (!Array.isArray(data.values)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "values має бути масивом",
        },
        { status: 400 }
      );
    }

    const values = data.values as unknown[];

    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

    const normalized: {
      id?: string;
      value: string;
      slug: string;
      colorHex: string | null;
      sortOrder: number;
    }[] = [];

    for (
      let index = 0;
      index < values.length;
      index++
    ) {
      const item = values[index];

      if (
        typeof item !== "object" ||
        item === null
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Некоректний запис у позиції ${index}`,
          },
          { status: 400 }
        );
      }

      const itemData =
        item as Record<string, unknown>;

      const itemValue =
        typeof itemData.value === "string"
          ? itemData.value.trim()
          : "";

      if (!itemValue) {
        return NextResponse.json(
          {
            success: false,
            message:
              `value у позиції ${index} є обов'язковим`,
          },
          { status: 400 }
        );
      }

      const requestedSlug =
        typeof itemData.slug === "string"
          ? itemData.slug.trim()
          : "";

      const slug = generateSlug(
        requestedSlug || itemValue
      );

      const colorHex =
        typeof itemData.colorHex === "string"
          ? itemData.colorHex.trim()
          : null;

      if (
        colorHex &&
        !isValidColorHex(colorHex)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Некоректний HEX колір у позиції ${index}`,
          },
          { status: 400 }
        );
      }

      const sortOrder =
        typeof itemData.sortOrder === "number" &&
        Number.isInteger(itemData.sortOrder)
          ? itemData.sortOrder
          : index;

      const valueId =
        typeof itemData.id === "string"
          ? itemData.id
          : undefined;

      normalized.push({
        id: valueId,
        value: itemValue,
        slug,
        colorHex,
        sortOrder,
      });
    }

    // -------------------------------------------------
    // DUPLICATE SLUGS
    // -------------------------------------------------

    const slugs = normalized.map(
      (item) => item.slug
    );

    if (
      new Set(slugs).size !== slugs.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення не можуть мати однаковий slug",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // EXISTING VALUES
    // -------------------------------------------------

    const existingValues =
      await db.attributeValue.findMany({
        where: {
          attributeId: id,
        },
        select: {
          id: true,
          slug: true,
        },
      });

    const existingIds = new Set(
      existingValues.map(
        (item) => item.id
      )
    );

    // -------------------------------------------------
    // VALIDATE IDS
    // -------------------------------------------------

    for (const item of normalized) {
      if (
        item.id &&
        !existingIds.has(item.id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Значення ${item.id} не належить цьому атрибуту`,
          },
          { status: 400 }
        );
      }
    }

    // -------------------------------------------------
    // TRANSACTION
    // -------------------------------------------------

    const result = await db.$transaction(
      async (tx) => {
        // ---------------------------------------------
        // UPDATE / CREATE
        // ---------------------------------------------

        for (const item of normalized) {
          if (item.id) {
            await tx.attributeValue.update({
              where: {
                id: item.id,
              },
              data: {
                value: item.value,
                slug: item.slug,
                colorHex: item.colorHex,
                sortOrder: item.sortOrder,
              },
            });
          } else {
            await tx.attributeValue.create({
              data: {
                attributeId: id,
                value: item.value,
                slug: item.slug,
                colorHex: item.colorHex,
                sortOrder: item.sortOrder,
              },
            });
          }
        }

        // ---------------------------------------------
        // FETCH RESULT
        // ---------------------------------------------

        return tx.attributeValue.findMany({
          where: {
            attributeId: id,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              value: "asc",
            },
          ],
          include: {
            _count: {
              select: {
                productValues: true,
                variantValues: true,
              },
            },
          },
        });
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Значення атрибута успішно оновлено",
      data: result,
    });
  } catch (error) {
    console.error(
      "PATCH /api/attributes/[id]/values error:",
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
              "Значення з таким slug вже існує",
          },
          { status: 409 }
        );
      }

      if (error.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Значення не знайдено",
          },
          { status: 404 }
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

// =====================================================
// DELETE
// DELETE /api/attributes/[id]/values?valueId=...
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID атрибута є обов'язковим",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------
    // ADMIN
    // -------------------------------------------------

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // VALUE ID
    // -------------------------------------------------

    const { searchParams } =
      new URL(request.url);

    const valueId =
      searchParams.get("valueId")?.trim();

    if (!valueId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "valueId є обов'язковим",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // FIND VALUE
    // -------------------------------------------------

    const value =
      await db.attributeValue.findFirst({
        where: {
          id: valueId,
          attributeId: id,
        },
        include: {
          _count: {
            select: {
              productValues: true,
              variantValues: true,
            },
          },
        },
      });

    if (!value) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення не знайдено або воно не належить цьому атрибуту",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------
    // PROTECT USED VALUE
    // -------------------------------------------------

    if (
      value._count.productValues > 0 ||
      value._count.variantValues > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення не можна видалити, оскільки воно використовується товарами або варіантами",

          usage: {
            products:
              value._count.productValues,

            variants:
              value._count.variantValues,
          },
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------

    await db.attributeValue.delete({
      where: {
        id: valueId,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Значення атрибута успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/attributes/[id]/values error:",
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
              "Значення не знайдено",
          },
          { status: 404 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Значення не можна видалити через існуючі зв'язки",
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