// src/app/api/admin/products/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// =====================================================
// HELPERS
// =====================================================

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();

  return result || null;
}

function toNumber(
  value: unknown,
  fallback = 0
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toNullableNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

const ALLOWED_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
  "ARCHIVED",
] as const;

function isAllowedStatus(
  value: unknown
): value is (typeof ALLOWED_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (
      ALLOWED_STATUSES as readonly string[]
    ).includes(value)
  );
}

// =====================================================
// GET /api/admin/products/[id]
// =====================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID товару не вказано",
        },
        { status: 400 }
      );
    }

    const product =
      await db.product.findUnique({
        where: {
          id,
        },

        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              sellerStatus: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
            },
          },

          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          images: {
            select: {
              id: true,
              url: true,
              thumbnailUrl: true,
              alt: true,
              width: true,
              height: true,
              sortOrder: true,
              isPrimary: true,
            },

            orderBy: [
              {
                isPrimary: "desc",
              },
              {
                sortOrder: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
          },

          seo: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/products/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося завантажити товар",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/admin/products/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID товару не вказано",
        },
        { status: 400 }
      );
    }

    // ===================================================
    // CHECK PRODUCT
    // ===================================================

    const existingProduct =
      await db.product.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // JSON
    // ===================================================

    let body: any;

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
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректні дані",
        },
        { status: 400 }
      );
    }

    const {
      shopId,
      categoryId,
      brandId,
      title,
      slug,
      description,
      shortDescription,
      sku,
      price,
      oldPrice,
      stock,
      reservedStock,
      status,
      isFeatured,
      isNew,
      weight,
      length,
      width,
      height,
      seo,
      images,
    } = body;

    // ===================================================
    // REQUIRED
    // ===================================================

    const normalizedShopId =
      toNullableString(shopId);

    const normalizedCategoryId =
      toNullableString(categoryId);

    const normalizedTitle =
      toNullableString(title);

    const normalizedSlug =
      toNullableString(slug);

    if (!normalizedShopId) {
      return NextResponse.json(
        {
          success: false,
          message: "Оберіть магазин",
        },
        { status: 400 }
      );
    }

    if (!normalizedCategoryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Оберіть категорію",
        },
        { status: 400 }
      );
    }

    if (!normalizedTitle) {
      return NextResponse.json(
        {
          success: false,
          message: "Введіть назву товару",
        },
        { status: 400 }
      );
    }

    if (!normalizedSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Введіть slug товару",
        },
        { status: 400 }
      );
    }

    // ===================================================
    // SHOP
    // ===================================================

    const shop =
      await db.shop.findUnique({
        where: {
          id: normalizedShopId,
        },

        select: {
          id: true,
        },
      });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          message: "Магазин не знайдено",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // CATEGORY
    // ===================================================

    const category =
      await db.category.findUnique({
        where: {
          id: normalizedCategoryId,
        },

        select: {
          id: true,
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // SLUG
    // ===================================================

    const slugExists =
      await db.product.findFirst({
        where: {
          slug: normalizedSlug,

          NOT: {
            id,
          },
        },

        select: {
          id: true,
        },
      });

    if (slugExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Товар з таким slug вже існує",
        },
        { status: 409 }
      );
    }

    // ===================================================
    // SKU
    // ===================================================

    const normalizedSku =
      toNullableString(sku);

    if (normalizedSku) {
      const skuExists =
        await db.product.findFirst({
          where: {
            sku: normalizedSku,

            NOT: {
              id,
            },
          },

          select: {
            id: true,
          },
        });

      if (skuExists) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Товар з таким SKU вже існує",
          },
          { status: 409 }
        );
      }
    }

    // ===================================================
    // NUMBERS
    // ===================================================

    const normalizedPrice =
      toNumber(price, NaN);

    if (
      !Number.isFinite(
        normalizedPrice
      ) ||
      normalizedPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректна ціна",
        },
        { status: 400 }
      );
    }

    const normalizedOldPrice =
      toNullableNumber(oldPrice);

    const normalizedStock =
      Math.max(
        0,
        Math.floor(
          toNumber(stock, 0)
        )
      );

    const normalizedReservedStock =
      Math.max(
        0,
        Math.floor(
          toNumber(
            reservedStock,
            0
          )
        )
      );

    const normalizedWeight =
      toNullableNumber(weight);

    const normalizedLength =
      toNullableNumber(length);

    const normalizedWidth =
      toNullableNumber(width);

    const normalizedHeight =
      toNullableNumber(height);

    // ===================================================
    // STATUS
    // ===================================================

    const normalizedStatus =
      isAllowedStatus(status)
        ? status
        : "DRAFT";

    // ===================================================
    // IMAGES
    // ===================================================

    let imageData:
      | {
          url: string;
          thumbnailUrl: string | null;
          alt: string | null;
          width: number | null;
          height: number | null;
          sortOrder: number;
          isPrimary: boolean;
        }[]
      | undefined;

    if (Array.isArray(images)) {
      const validImages =
        images
          .filter(
            (image) =>
              image &&
              typeof image.url ===
                "string" &&
              image.url.trim()
          )
          .map(
            (
              image,
              index
            ) => ({
              url:
                image.url.trim(),

              thumbnailUrl:
                toNullableString(
                  image.thumbnailUrl
                ),

              alt:
                toNullableString(
                  image.alt
                ),

              width:
                image.width !==
                  undefined &&
                image.width !==
                  null
                  ? Math.floor(
                      toNumber(
                        image.width,
                        0
                      )
                    )
                  : null,

              height:
                image.height !==
                  undefined &&
                image.height !==
                  null
                  ? Math.floor(
                      toNumber(
                        image.height,
                        0
                      )
                    )
                  : null,

              sortOrder:
                index,

              isPrimary:
                Boolean(
                  image.isPrimary
                ),
            })
          );

      if (
        validImages.length > 0
      ) {
        const primaryIndex =
          validImages.findIndex(
            (image) =>
              image.isPrimary
          );

        imageData =
          validImages.map(
            (
              image,
              index
            ) => ({
              ...image,

              isPrimary:
                primaryIndex === -1
                  ? index === 0
                  : index ===
                    primaryIndex,
            })
          );
      } else {
        imageData = [];
      }
    }

    // ===================================================
    // SEO
    // ===================================================

    const hasSeo =
      seo &&
      typeof seo === "object" &&
      !Array.isArray(seo);

    const seoData = hasSeo
      ? {
          title:
            toNullableString(
              seo.title
            ),

          description:
            toNullableString(
              seo.description
            ),

          keywords:
            toNullableString(
              seo.keywords
            ),

          canonical:
            toNullableString(
              seo.canonical
            ),
        }
      : null;

    // ===================================================
    // UPDATE
    // ===================================================

    const product =
      await db.product.update({
        where: {
          id,
        },

        data: {
          shopId:
            normalizedShopId,

          categoryId:
            normalizedCategoryId,

          brandId:
            toNullableString(
              brandId
            ),

          title:
            normalizedTitle,

          slug:
            normalizedSlug,

          description:
            toNullableString(
              description
            ),

          shortDescription:
            toNullableString(
              shortDescription
            ),

          sku:
            normalizedSku,

          price:
            normalizedPrice,

          oldPrice:
            normalizedOldPrice,

          stock:
            normalizedStock,

          reservedStock:
            normalizedReservedStock,

          status:
            normalizedStatus as any,

          isFeatured:
            Boolean(
              isFeatured
            ),

          isNew:
            Boolean(isNew),

          weight:
            normalizedWeight,

          length:
            normalizedLength,

          width:
            normalizedWidth,

          height:
            normalizedHeight,

          ...(imageData !==
          undefined
            ? {
                images: {
                  deleteMany: {},

                  ...(imageData.length >
                  0
                    ? {
                        create:
                          imageData,
                      }
                    : {}),
                },
              }
            : {}),

          ...(seoData
            ? {
                seo: {
                  upsert: {
                    create:
                      seoData,

                    update:
                      seoData,
                  },
                },
              }
            : {}),
        },

        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          images: {
            orderBy: [
              {
                isPrimary:
                  "desc",
              },
              {
                sortOrder:
                  "asc",
              },
            ],
          },

          seo: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Товар успішно оновлено",
      product,
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/products/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося оновити товар",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/admin/products/[id]
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID товару не вказано",
        },
        { status: 400 }
      );
    }

    const product =
      await db.product.findUnique({
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
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    await db.product.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        `Товар «${product.title}» успішно видалено`,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/products/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося видалити товар. Можливо, він має пов'язані записи.",
      },
      { status: 500 }
    );
  }
}