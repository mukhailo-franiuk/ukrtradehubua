import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// GET /api/shops/[id]/products
// =====================================================

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    // =================================================
    // VALIDATE SHOP ID
    // =================================================

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    // =================================================
    // QUERY PARAMETERS
    // =================================================

    const search = searchParams.get("search")?.trim() || "";

    const categoryId =
      searchParams.get("categoryId")?.trim() || "";

    const brandId =
      searchParams.get("brandId")?.trim() || "";

    const statusParam =
      searchParams.get("status")?.trim() || "";

    const minPriceParam =
      searchParams.get("minPrice")?.trim();

    const maxPriceParam =
      searchParams.get("maxPrice")?.trim();

    const featuredParam =
      searchParams.get("featured");

    const newParam =
      searchParams.get("new");

    const includeInactiveParam =
      searchParams.get("includeInactive");

    const pageParam =
      searchParams.get("page");

    const limitParam =
      searchParams.get("limit");

    const sort =
      searchParams.get("sort")?.trim() || "newest";

    // =================================================
    // PAGINATION
    // =================================================

    const parsedPage = Number(pageParam);

    const page =
      Number.isInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const parsedLimit = Number(limitParam);

    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 24;

    const skip = (page - 1) * limit;

    // =================================================
    // PRICE FILTERS
    // =================================================

    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    if (minPriceParam) {
      const parsed = Number(minPriceParam);

      if (Number.isFinite(parsed) && parsed >= 0) {
        minPrice = parsed;
      }
    }

    if (maxPriceParam) {
      const parsed = Number(maxPriceParam);

      if (Number.isFinite(parsed) && parsed >= 0) {
        maxPrice = parsed;
      }
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Мінімальна ціна не може бути більшою за максимальну",
        },
        { status: 400 }
      );
    }

    // =================================================
    // BOOLEAN PARAMETERS
    // =================================================

    const featured =
      featuredParam === "true"
        ? true
        : featuredParam === "false"
          ? false
          : undefined;

    const isNew =
      newParam === "true"
        ? true
        : newParam === "false"
          ? false
          : undefined;

    const includeInactive =
      includeInactiveParam === "true";

    // =================================================
    // VALID STATUS
    // =================================================

    const validStatuses = [
      "DRAFT",
      "ACTIVE",
      "OUT_OF_STOCK",
      "ARCHIVED",
    ] as const;

    type ProductStatusValue =
      (typeof validStatuses)[number];

    let productStatus:
      | ProductStatusValue
      | undefined;

    if (statusParam) {
      if (
        !validStatuses.includes(
          statusParam as ProductStatusValue
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректний статус товару",
          },
          { status: 400 }
        );
      }

      productStatus =
        statusParam as ProductStatusValue;
    }

    // =================================================
    // SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sellerStatus: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        { status: 404 }
      );
    }

    // =================================================
    // DEFAULT PUBLIC FILTER
    // =================================================

    /*
     * Для звичайного публічного запиту показуємо
     * тільки ACTIVE товари.
     *
     * includeInactive=true дозволяє отримувати
     * товари інших статусів.
     */

    const where = {
      shopId: id,

      ...(productStatus
        ? {
            status: productStatus,
          }
        : includeInactive
          ? {}
          : {
              status: "ACTIVE" as const,
            }),

      ...(categoryId
        ? {
            categoryId,
          }
        : {}),

      ...(brandId
        ? {
            brandId,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                shortDescription: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                sku: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(minPrice !== undefined ||
      maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined
                ? {
                    gte: minPrice,
                  }
                : {}),

              ...(maxPrice !== undefined
                ? {
                    lte: maxPrice,
                  }
                : {}),
            },
          }
        : {}),

      ...(featured !== undefined
        ? {
            isFeatured: featured,
          }
        : {}),

      ...(isNew !== undefined
        ? {
            isNew,
          }
        : {}),
    };

    // =================================================
    // SORTING
    // =================================================

    let orderBy:
      | { createdAt: "asc" | "desc" }
      | { price: "asc" | "desc" }
      | { rating: "asc" | "desc" }
      | { viewsCount: "asc" | "desc" }
      | { salesCount: "asc" | "desc" }
      | { favoritesCount: "asc" | "desc" };

    switch (sort) {
      case "oldest":
        orderBy = {
          createdAt: "asc",
        };
        break;

      case "price_asc":
        orderBy = {
          price: "asc",
        };
        break;

      case "price_desc":
        orderBy = {
          price: "desc",
        };
        break;

      case "rating":
        orderBy = {
          rating: "desc",
        };
        break;

      case "views":
        orderBy = {
          viewsCount: "desc",
        };
        break;

      case "sales":
        orderBy = {
          salesCount: "desc",
        };
        break;

      case "favorites":
        orderBy = {
          favoritesCount: "desc",
        };
        break;

      case "newest":
      default:
        orderBy = {
          createdAt: "desc",
        };
        break;
    }

    // =================================================
    // DATABASE
    // =================================================

    const [products, total] =
      await Promise.all([
        db.product.findMany({
          where,

          orderBy,

          skip,
          take: limit,

          include: {
            images: {
              where: {
                isPrimary: true,
              },

              orderBy: {
                sortOrder: "asc",
              },

              take: 1,

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
                logoUrl: true,
              },
            },

            variants: {
              where: {
                isActive: true,
              },

              orderBy: {
                createdAt: "asc",
              },

              select: {
                id: true,
                sku: true,
                title: true,
                price: true,
                oldPrice: true,
                stock: true,
                reservedStock: true,
                weight: true,
                isActive: true,
              },
            },

            _count: {
              select: {
                reviews: true,
                favorites: true,
                views: true,
                orderItems: true,
                cartItems: true,
              },
            },
          },
        }),

        db.product.count({
          where,
        }),
      ]);

    // =================================================
    // RESPONSE
    // =================================================

    const totalPages =
      Math.ceil(total / limit);

    return NextResponse.json({
      success: true,

      data: products,

      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        isActive: shop.isActive,
        sellerStatus: shop.sellerStatus,
      },

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },

      filters: {
        search: search || null,
        categoryId: categoryId || null,
        brandId: brandId || null,
        status: productStatus || null,
        minPrice:
          minPrice ?? null,
        maxPrice:
          maxPrice ?? null,
        featured:
          featured ?? null,
        new:
          isNew ?? null,
        sort,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати товари магазину",
      },
      { status: 500 }
    );
  }
}