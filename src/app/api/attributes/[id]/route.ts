import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// =====================================================
// TYPES
// =====================================================

const ATTRIBUTE_TYPES = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "COLOR",
  "SELECT",
  "MULTISELECT",
] as const;

type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// HELPERS
// =====================================================

function isAttributeType(value: unknown): value is AttributeType {
  return (
    typeof value === "string" &&
    ATTRIBUTE_TYPES.includes(value as AttributeType)
  );
}

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
  return normalizeSlug(value) || `attribute-${Date.now()}`;
}

function isValidColorHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// =====================================================
// GET /api/attributes/[id]
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

    const attribute = await db.attribute.findUnique({
      where: {
        id,
      },
      include: {
        values: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        _count: {
          select: {
            productValues: true,
            variantValues: true,
          },
        },
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

    return NextResponse.json({
      success: true,
      data: attribute,
    });
  } catch (error) {
    console.error(
      "GET /api/attributes/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати атрибут",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/attributes/[id]
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

    // =================================================
    // AUTH
    // =================================================

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

    // =================================================
    // ADMIN
    // =================================================

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // =================================================
    // EXISTING ATTRIBUTE
    // =================================================

    const existingAttribute =
      await db.attribute.findUnique({
        where: {
          id,
        },
        include: {
          values: true,
        },
      });

    if (!existingAttribute) {
      return NextResponse.json(
        {
          success: false,
          message: "Атрибут не знайдено",
        },
        { status: 404 }
      );
    }

    // =================================================
    // BODY
    // =================================================

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

    // =================================================
    // ATTRIBUTE DATA
    // =================================================

    const updateData: Prisma.AttributeUpdateInput = {};

    // -------------------------------------------------
    // NAME
    // -------------------------------------------------

    if (data.name !== undefined) {
      if (typeof data.name !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "name має бути рядком",
          },
          { status: 400 }
        );
      }

      const name = data.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Назва атрибута не може бути порожньою",
          },
          { status: 400 }
        );
      }

      if (name.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Назва атрибута не може перевищувати 100 символів",
          },
          { status: 400 }
        );
      }

      updateData.name = name;
    }

    // -------------------------------------------------
    // SLUG
    // -------------------------------------------------

    if (data.slug !== undefined) {
      if (typeof data.slug !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "slug має бути рядком",
          },
          { status: 400 }
        );
      }

      const slug = generateSlug(data.slug);

      const duplicate =
        await db.attribute.findFirst({
          where: {
            slug,
            NOT: {
              id,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: `Атрибут зі slug "${slug}" вже існує`,
          },
          { status: 409 }
        );
      }

      updateData.slug = slug;
    }

    // -------------------------------------------------
    // TYPE
    // -------------------------------------------------

    if (data.type !== undefined) {
      if (!isAttributeType(data.type)) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректний тип атрибута",
            allowedTypes: ATTRIBUTE_TYPES,
          },
          { status: 400 }
        );
      }

      updateData.type = data.type;
    }

    // -------------------------------------------------
    // IS FILTERABLE
    // -------------------------------------------------

    if (data.isFilterable !== undefined) {
      if (
        typeof data.isFilterable !== "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "isFilterable має бути boolean",
          },
          { status: 400 }
        );
      }

      updateData.isFilterable =
        data.isFilterable;
    }

    // -------------------------------------------------
    // IS REQUIRED
    // -------------------------------------------------

    if (data.isRequired !== undefined) {
      if (
        typeof data.isRequired !== "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "isRequired має бути boolean",
          },
          { status: 400 }
        );
      }

      updateData.isRequired =
        data.isRequired;
    }

    // =================================================
    // VALUES
    // =================================================

    const hasValuesUpdate =
      Array.isArray(data.values);

    if (hasValuesUpdate) {
      const rawValues = data.values as unknown[];

      const normalizedValues: {
        id?: string;
        value: string;
        slug: string;
        colorHex: string | null;
        sortOrder: number;
      }[] = [];

      for (
        let index = 0;
        index < rawValues.length;
        index++
      ) {
        const item = rawValues[index];

        if (
          typeof item !== "object" ||
          item === null
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Некоректне значення атрибута у позиції ${index}`,
            },
            { status: 400 }
          );
        }

        const valueData =
          item as Record<string, unknown>;

        const value =
          typeof valueData.value === "string"
            ? valueData.value.trim()
            : "";

        if (!value) {
          return NextResponse.json(
            {
              success: false,
              message: `Значення у позиції ${index} не може бути порожнім`,
            },
            { status: 400 }
          );
        }

        const customSlug =
          typeof valueData.slug === "string"
            ? valueData.slug.trim()
            : "";

        const slug = generateSlug(
          customSlug || value
        );

        const colorHex =
          typeof valueData.colorHex === "string"
            ? valueData.colorHex.trim()
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

        const sortOrder =
          typeof valueData.sortOrder ===
            "number" &&
          Number.isInteger(
            valueData.sortOrder
          )
            ? valueData.sortOrder
            : index;

        const valueId =
          typeof valueData.id === "string"
            ? valueData.id
            : undefined;

        normalizedValues.push({
          id: valueId,
          value,
          slug,
          colorHex,
          sortOrder,
        });
      }

      // -----------------------------------------------
      // DUPLICATE SLUGS
      // -----------------------------------------------

      const slugs = normalizedValues.map(
        (item) => item.slug
      );

      if (
        new Set(slugs).size !== slugs.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Значення атрибута не можуть мати однаковий slug",
          },
          { status: 400 }
        );
      }

      // -----------------------------------------------
      // VALIDATE EXISTING IDS
      // -----------------------------------------------

      const existingIds =
        existingAttribute.values.map(
          (item) => item.id
        );

      for (const item of normalizedValues) {
        if (
          item.id &&
          !existingIds.includes(item.id)
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Значення ${item.id} не належить цьому атрибуту`,
            },
            { status: 400 }
          );
        }
      }

      // -----------------------------------------------
      // CHECK DUPLICATE SLUG IN DATABASE
      // -----------------------------------------------

      for (const item of normalizedValues) {
        const duplicate =
          await db.attributeValue.findFirst({
            where: {
              attributeId: id,
              slug: item.slug,
              ...(item.id
                ? {
                    NOT: {
                      id: item.id,
                    },
                  }
                : {}),
            },
            select: {
              id: true,
            },
          });

        if (duplicate) {
          return NextResponse.json(
            {
              success: false,
              message: `Значення зі slug "${item.slug}" вже існує`,
            },
            { status: 409 }
          );
        }
      }

      // -----------------------------------------------
      // TRANSACTION
      // -----------------------------------------------

      const result = await db.$transaction(
        async (tx) => {
          // ===========================================
          // ATTRIBUTE
          // ===========================================

          const attribute =
            await tx.attribute.update({
              where: {
                id,
              },
              data: updateData,
            });

          // ===========================================
          // DELETE REMOVED VALUES
          // ===========================================

          const incomingIds =
            normalizedValues
              .map((item) => item.id)
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(value)
              );

          const valuesToDelete =
            existingAttribute.values
              .filter(
                (existing) =>
                  !incomingIds.includes(
                    existing.id
                  )
              )
              .map(
                (existing) => existing.id
              );

          if (
            valuesToDelete.length > 0
          ) {
            // Не видаляємо значення, які
            // використовуються товарами/варіантами.
            const usedValues =
              await tx.attributeValue.findMany({
                where: {
                  id: {
                    in: valuesToDelete,
                  },
                  OR: [
                    {
                      productValues: {
                        some: {},
                      },
                    },
                    {
                      variantValues: {
                        some: {},
                      },
                    },
                  ],
                },
                select: {
                  id: true,
                },
              });

            const usedIds = new Set(
              usedValues.map(
                (item) => item.id
              )
            );

            const deletableIds =
              valuesToDelete.filter(
                (valueId) =>
                  !usedIds.has(valueId)
              );

            if (
              deletableIds.length > 0
            ) {
              await tx.attributeValue.deleteMany(
                {
                  where: {
                    id: {
                      in: deletableIds,
                    },
                  },
                }
              );
            }
          }

          // ===========================================
          // UPSERT VALUES
          // ===========================================

          for (const item of normalizedValues) {
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

          // ===========================================
          // RETURN FULL ATTRIBUTE
          // ===========================================

          return tx.attribute.findUniqueOrThrow({
            where: {
              id,
            },
            include: {
              values: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
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
        message: "Атрибут успішно оновлено",
        data: result,
      });
    }

    // =================================================
    // UPDATE WITHOUT VALUES
    // =================================================

    if (
      Object.keys(updateData).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Немає даних для оновлення",
        },
        { status: 400 }
      );
    }

    const updatedAttribute =
      await db.attribute.update({
        where: {
          id,
        },
        data: updateData,
        include: {
          values: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          _count: {
            select: {
              productValues: true,
              variantValues: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message: "Атрибут успішно оновлено",
      data: updatedAttribute,
    });
  } catch (error) {
    console.error(
      "PATCH /api/attributes/[id] error:",
      error
    );

    // =================================================
    // PRISMA ERRORS
    // =================================================

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Атрибут або значення з таким slug вже існує",
          },
          { status: 409 }
        );
      }

      if (error.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Атрибут або значення не знайдено",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося оновити атрибут",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/attributes/[id]
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

    // =================================================
    // AUTH
    // =================================================

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

    // =================================================
    // ADMIN
    // =================================================

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // =================================================
    // FIND ATTRIBUTE
    // =================================================

    const attribute =
      await db.attribute.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              productValues: true,
              variantValues: true,
              values: true,
            },
          },
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

    // =================================================
    // PROTECT USED ATTRIBUTE
    // =================================================

    if (
      attribute._count.productValues > 0 ||
      attribute._count.variantValues > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Атрибут не можна видалити, оскільки він використовується товарами або варіантами",
          usage: {
            products:
              attribute._count.productValues,
            variants:
              attribute._count.variantValues,
          },
        },
        { status: 409 }
      );
    }

    // =================================================
    // DELETE
    // =================================================

    await db.attribute.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Атрибут успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/attributes/[id] error:",
      error
    );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            message: "Атрибут не знайдено",
          },
          { status: 404 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Атрибут не можна видалити, оскільки він використовується в інших записах",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося видалити атрибут",
      },
      { status: 500 }
    );
  }
}