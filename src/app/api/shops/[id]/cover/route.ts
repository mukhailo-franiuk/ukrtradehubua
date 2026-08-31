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

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status");
    const pageParam = Number(searchParams.get("page") || "1");
    const limitParam = Number(searchParams.get("limit") || "20");

    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : 1;

    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(Math.floor(limitParam), 100)
        : 20;

    const skip = (page - 1) * limit;

    // =================================================
    // CHECK SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sellerStatus: true,
        isActive: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // WHERE
    // =================================================

    const where = {
      shopId: id,

      ...(status &&
      ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"].includes(
        status
      )
        ? {
            status: status as
              | "DRAFT"
              | "ACTIVE"
              | "OUT_OF_STOCK"
              | "ARCHIVED",
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
                slug: {
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
    };

    // =================================================
    // QUERY
    // =================================================

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
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

          _count: {
            select: {
              reviews: true,
              favorites: true,
              views: true,
              variants: true,
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

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,

      data: {
        shop,

        products,

        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
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
      {
        status: 500,
      }
    );
  }
}