import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

const MARKETPLACE_SHOP = {
  name: "UkrTradeHub",
  slug: "ukrtradehub",
  description: "Офіційний магазин маркетплейсу UkrTradeHub.",
} as const;

const SHOP_SELECT = {
  id: true,
  userId: true,
  name: true,
  slug: true,
  description: true,
  sellerStatus: true,
  isActive: true,
  rating: true,
  productsCount: true,
  salesCount: true,
  ordersCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Доступ заборонено",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// =====================================================
// GET
// Перевірка офіційного магазину
// =====================================================

export async function GET() {
  try {
    const currentAdmin = await getAdmin();

    if (!currentAdmin) {
      return unauthorizedResponse();
    }

    const shop = await db.shop.findUnique({
      where: {
        slug: MARKETPLACE_SHOP.slug,
      },
      select: SHOP_SELECT,
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: true,
          exists: false,
          message: "Магазин UkrTradeHub ще не створений",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        exists: true,
        message: "Магазин UkrTradeHub вже існує",
        shop,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/admin/marketplace-shop error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося перевірити магазин маркетплейсу",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

// =====================================================
// POST
// Створення офіційного магазину маркетплейсу
// =====================================================

export async function POST() {
  try {
    const currentAdmin = await getAdmin();

    if (!currentAdmin) {
      return unauthorizedResponse();
    }

    const existingShop = await db.shop.findUnique({
      where: {
        slug: MARKETPLACE_SHOP.slug,
      },
      select: SHOP_SELECT,
    });

    if (existingShop) {
      return NextResponse.json(
        {
          success: false,
          message: "Офіційний магазин UkrTradeHub вже існує",
          shop: existingShop,
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * Магазин прив'язується до адміністратора,
     * який виконав поточний запит.
     */
    const adminShop = await db.shop.findUnique({
      where: {
        userId: currentAdmin.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (adminShop) {
      return NextResponse.json(
        {
          success: false,
          message: "У поточного адміністратора вже є магазин",
          shop: adminShop,
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const shop = await db.shop.create({
      data: {
        userId: currentAdmin.id,
        name: MARKETPLACE_SHOP.name,
        slug: MARKETPLACE_SHOP.slug,
        description: MARKETPLACE_SHOP.description,
        sellerStatus: "ACTIVE",
        isActive: true,
        rating: 0,
        productsCount: 0,
        salesCount: 0,
        ordersCount: 0,
      },
      select: SHOP_SELECT,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Офіційний магазин UkrTradeHub успішно створено",
        shop,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("POST /api/admin/marketplace-shop error:", error);

    /*
     * Захист від одночасних запитів:
     * якщо магазин уже створив інший запит,
     * Prisma поверне помилку P2002.
     */
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "Офіційний магазин UkrTradeHub вже існує",
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося створити магазин маркетплейсу",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}