import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();

  return result || null;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toNullableNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яіїєґ]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

// =====================================================
// GET /api/admin/products
// =====================================================

export async function GET() {
  try {
    const [categories, brands, shops] =
      await Promise.all([
        db.category.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              name: "asc",
            },
          ],
        }),

        db.brand.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: {
            name: "asc",
          },
        }),

        db.shop.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            sellerStatus: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      categories,
      brands,
      shops,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося завантажити дані",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/admin/products
// =====================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

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

    if (!normalizedShopId) {
      return NextResponse.json(
        {
          success: false,
          message: "Оберіть магазин",
        },
        {
          status: 400,
        }
      );
    }

    if (!normalizedCategoryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Оберіть категорію",
        },
        {
          status: 400,
        }
      );
    }

    if (!normalizedTitle) {
      return NextResponse.json(
        {
          success: false,
          message: "Введіть назву товару",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedSlug =
      toNullableString(slug) ||
      slugify(normalizedTitle);

    if (!normalizedSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Не вдалося сформувати slug",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // CHECK SHOP
    // ===================================================

    const shop = await db.shop.findUnique({
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
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // CHECK CATEGORY
    // ===================================================

    const category =
      await db.category.findUnique({
        where: {
          id: normalizedCategoryId,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // CHECK SLUG
    // ===================================================

    const slugExists =
      await db.product.findUnique({
        where: {
          slug: normalizedSlug,
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
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // CHECK SKU
    // ===================================================

    const normalizedSku =
      toNullableString(sku);

    if (normalizedSku) {
      const skuExists =
        await db.product.findUnique({
          where: {
            sku: normalizedSku,
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
          {
            status: 409,
          }
        );
      }
    }

    // ===================================================
    // NUMBERS
    // ===================================================

    const normalizedPrice =
      toNumber(price, NaN);

    if (
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректна ціна",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedOldPrice =
      toNullableNumber(oldPrice);

    const normalizedStock = Math.max(
      0,
      Math.floor(toNumber(stock, 0))
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

    const allowedStatuses = [
      "DRAFT",
      "ACTIVE",
      "INACTIVE",
      "OUT_OF_STOCK",
      "ARCHIVED",
    ];

    const normalizedStatus =
      typeof status === "string" &&
      allowedStatuses.includes(status)
        ? status
        : "DRAFT";

    // ===================================================
    // CREATE
    // ===================================================

    const product =
      await db.product.create({
        data: {
          shopId: normalizedShopId,
          categoryId: normalizedCategoryId,

          brandId:
            toNullableString(brandId),

          title: normalizedTitle,

          slug: normalizedSlug,

          description:
            toNullableString(description),

          shortDescription:
            toNullableString(shortDescription),

          sku: normalizedSku,

          price: normalizedPrice,

          oldPrice:
            normalizedOldPrice,

          stock:
            normalizedStock,

          reservedStock: 0,

          status:
            normalizedStatus as any,

          isFeatured:
            Boolean(isFeatured),

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

          ...(seo &&
          typeof seo === "object"
            ? {
                seo: {
                  create: {
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
                  },
                },
              }
            : {}),
        },

        include: {
          seo: true,
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    // ===================================================
    // IMAGES
    // ===================================================

    if (Array.isArray(images) && images.length > 0) {
      const validImages = images
        .filter(
          (image) =>
            image &&
            typeof image.url === "string" &&
            image.url.trim()
        )
        .map((image, index) => ({
          productId: product.id,

          url: image.url.trim(),

          thumbnailUrl:
            toNullableString(
              image.thumbnailUrl
            ),

          alt:
            toNullableString(image.alt),

          width:
            image.width !== undefined
              ? Math.floor(
                  toNumber(image.width, 0)
                )
              : null,

          height:
            image.height !== undefined
              ? Math.floor(
                  toNumber(image.height, 0)
                )
              : null,

          sortOrder:
            typeof image.sortOrder ===
            "number"
              ? image.sortOrder
              : index,

          isPrimary:
            Boolean(image.isPrimary),
        }));

      if (validImages.length > 0) {
        const hasPrimary = validImages.some(
          (image) => image.isPrimary
        );

        if (!hasPrimary) {
          validImages[0].isPrimary = true;
        }

        await db.productImage.createMany({
          data: validImages,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Товар успішно створено",
        product,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося створити товар",
      },
      {
        status: 500,
      }
    );
  }
}