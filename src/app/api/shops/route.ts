import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { SellerStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

// =====================================================
// TYPES
// =====================================================

type CreateShopBody = {
  userId?: string;

  name?: string;
  slug?: string;

  description?: string;
  shortDescription?: string;

  phone?: string;
  email?: string;
  website?: string;
};

// =====================================================
// GET /api/shops
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") ?? "1");
    const limit = Math.min(
      Number(searchParams.get("limit") ?? "20"),
      100
    );

    const search =
      searchParams.get("search")?.trim() ?? "";

    const sellerStatus = searchParams.get(
      "status"
    ) as SellerStatus | null;

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

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

    if (
      sellerStatus &&
      Object.values(SellerStatus).includes(
        sellerStatus
      )
    ) {
      where.sellerStatus = sellerStatus;
    }

    const [shops, total] = await Promise.all([
      db.shop.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          logo: true,
          cover: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          _count: {
            select: {
              products: true,
              followers: true,
              reviews: true,
            },
          },
        },
      }),

      db.shop.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,

      data: shops,

      pagination: {
        page,
        limit,
        total,

        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/shops", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати магазини",
      },

      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/shops
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as CreateShopBody;

    // Магазин завжди створюється для поточного залогіненого
    // користувача — userId з тіла запиту ігнорується, щоб
    // ніхто не міг створити магазин від імені чужого акаунта.
    // ADMIN може вказати userId явно (напр. для офіційного
    // магазину маркетплейсу).
    const targetUserId =
      currentUser.role === "ADMIN" && body.userId
        ? body.userId
        : currentUser.id;

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно вказати користувача",
        },

        {
          status: 400,
        }
      );
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть назву магазину",
        },

        {
          status: 400,
        }
      );
    }

    if (!body.slug?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть slug магазину",
        },

        {
          status: 400,
        }
      );
    }

    //--------------------------------------------------
    // USER
    //--------------------------------------------------

    const user = await db.user.findUnique({
      where: {
        id: targetUserId,
      },

      include: {
        shop: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Користувача не знайдено",
        },

        {
          status: 404,
        }
      );
    }

    if (user.shop) {
      return NextResponse.json(
        {
          success: false,
          error:
            "У цього користувача вже існує магазин",
        },

        {
          status: 409,
        }
      );
    }

    //--------------------------------------------------
    // SLUG
    //--------------------------------------------------

    const slug = body.slug
      .trim()
      .toLowerCase();

    const slugExists = await db.shop.findUnique({
      where: {
        slug,
      },
    });

    if (slugExists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Магазин з таким slug вже існує",
        },

        {
          status: 409,
        }
      );
    }

    //--------------------------------------------------
    // CREATE
    //--------------------------------------------------

    const shop = await db.shop.create({
      data: {
        userId: targetUserId,

        name: body.name.trim(),
        slug,

        description:
          body.description?.trim() || null,

        shortDescription:
          body.shortDescription?.trim() ||
          null,

        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,

        website:
          body.website?.trim() || null,
      },

      include: {
        logo: true,
        cover: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,

        message:
          "Магазин успішно створено",

        data: shop,
      },

      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/shops", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося створити магазин",
      },

      {
        status: 500,
      }
    );
  }
}