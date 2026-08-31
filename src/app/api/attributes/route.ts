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
  const slug = normalizeSlug(value);

  return slug || `attribute-${Date.now()}`;
}

// =====================================================
// GET /api/attributes
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type");
    const filterable = searchParams.get("filterable");
    const includeValues =
      searchParams.get("includeValues") !== "false";

    const page = Math.max(
      Number(searchParams.get("page") || "1"),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || "50"),
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const where: Prisma.AttributeWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
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

    if (type && isAttributeType(type)) {
      where.type = type;
    }

    if (filterable === "true") {
      where.isFilterable = true;
    }

    if (filterable === "false") {
      where.isFilterable = false;
    }

    const [attributes, total] = await Promise.all([
      db.attribute.findMany({
        where,
        orderBy: [
          {
            name: "asc",
          },
        ],
        skip,
        take: limit,
        include: includeValues
          ? {
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
            }
          : undefined,
      }),

      db.attribute.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: attributes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "GET /api/attributes error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати атрибути",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/attributes
// =====================================================

export async function POST(request: NextRequest) {
  try {
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
        {
          status: 401,
        }
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
        {
          status: 403,
        }
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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
      );
    }

    const data = body as Record<string, unknown>;

    // -------------------------------------------------
    // NAME
    // -------------------------------------------------

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Назва атрибута є обов'язковою",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Назва атрибута не може перевищувати 100 символів",
        },
        {
          status: 400,
        }
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
      requestedSlug || name
    );

    // -------------------------------------------------
    // TYPE
    // -------------------------------------------------

    const type =
      data.type === undefined
        ? "TEXT"
        : data.type;

    if (!isAttributeType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректний тип атрибута",
          allowedTypes: ATTRIBUTE_TYPES,
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // OPTIONS
    // -------------------------------------------------

    const isFilterable =
      typeof data.isFilterable === "boolean"
        ? data.isFilterable
        : true;

    const isRequired =
      typeof data.isRequired === "boolean"
        ? data.isRequired
        : false;

    // -------------------------------------------------
    // CHECK SLUG
    // -------------------------------------------------

    const existingAttribute =
      await db.attribute.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

    if (existingAttribute) {
      return NextResponse.json(
        {
          success: false,
          message: `Атрибут зі slug "${slug}" вже існує`,
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // VALUES
    // -------------------------------------------------

    const rawValues = Array.isArray(data.values)
      ? data.values
      : [];

    const values = rawValues
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" &&
          item !== null
      )
      .map((item, index) => {
        const value =
          typeof item.value === "string"
            ? item.value.trim()
            : "";

        const valueSlug =
          typeof item.slug === "string"
            ? item.slug.trim()
            : "";

        const colorHex =
          typeof item.colorHex === "string"
            ? item.colorHex.trim()
            : null;

        const sortOrder =
          typeof item.sortOrder === "number"
            ? item.sortOrder
            : index;

        return {
          value,
          slug: generateSlug(
            valueSlug || value
          ),
          colorHex,
          sortOrder,
        };
      })
      .filter((item) => item.value.length > 0);

    // -------------------------------------------------
    // VALIDATE COLOR
    // -------------------------------------------------

    if (type === "COLOR") {
      for (const value of values) {
        if (
          value.colorHex &&
          !/^#[0-9A-Fa-f]{6}$/.test(
            value.colorHex
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Некоректний HEX колір: ${value.colorHex}`,
            },
            {
              status: 400,
            }
          );
        }
      }
    }

    // -------------------------------------------------
    // CHECK DUPLICATE VALUE SLUGS
    // -------------------------------------------------

    const valueSlugs = values.map(
      (value) => value.slug
    );

    if (
      new Set(valueSlugs).size !==
      valueSlugs.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Значення атрибута не можуть мати однаковий slug",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // CREATE
    // -------------------------------------------------

    const attribute =
      await db.attribute.create({
        data: {
          name,
          slug,
          type,
          isFilterable,
          isRequired,

          values:
            values.length > 0
              ? {
                  create: values,
                }
              : undefined,
        },

        include: {
          values: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Атрибут успішно створено",
        data: attribute,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/attributes error:",
      error
    );

    // -------------------------------------------------
    // PRISMA UNIQUE ERROR
    // -------------------------------------------------

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Атрибут або його значення з таким ідентифікатором вже існує",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося створити атрибут",
      },
      {
        status: 500,
      }
    );
  }
}