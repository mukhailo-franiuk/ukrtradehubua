import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/prisma";

const MARKETPLACE_SHOP = {
  name: "UkrTradeHub",
  slug: "ukrtradehub",
  description:
    "Офіційний магазин маркетплейсу UkrTradeHub.",
};

// =====================================================
// GET
// Перевірка офіційного магазину
// =====================================================

export async function GET(_request: NextRequest) {
  try {
    const shop = await db.shop.findUnique({
      where: {
        slug: MARKETPLACE_SHOP.slug,
      },
      select: {
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
      },
    });

    if (!shop) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: "Магазин UkrTradeHub ще не створений",
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      message: "Магазин UkrTradeHub вже існує",
      shop,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/marketplace-shop error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося перевірити магазин маркетплейсу",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST
// Створення офіційного магазину маркетплейсу
// =====================================================

export async function POST(_request: NextRequest) {
  try {
    // -------------------------------------------------
    // Перевіряємо, чи магазин уже існує
    // -------------------------------------------------

    const existingShop = await db.shop.findUnique({
      where: {
        slug: MARKETPLACE_SHOP.slug,
      },
    });

    if (existingShop) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Офіційний магазин UkrTradeHub вже існує",
          shop: existingShop,
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // Знаходимо ADMIN
    // -------------------------------------------------

    const admin = await db.user.findFirst({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Адміністратора не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // Перевіряємо, чи ADMIN вже має магазин
    // -------------------------------------------------

    const adminShop = await db.shop.findUnique({
      where: {
        userId: admin.id,
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
          message:
            "У вибраного адміністратора вже є магазин",
          shop: adminShop,
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // Створюємо офіційний магазин
    // -------------------------------------------------

    const shop = await db.shop.create({
      data: {
        userId: admin.id,

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
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Офіційний магазин UkrTradeHub успішно створено",
        shop,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/marketplace-shop error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося створити магазин маркетплейсу",
      },
      {
        status: 500,
      }
    );
  }
}