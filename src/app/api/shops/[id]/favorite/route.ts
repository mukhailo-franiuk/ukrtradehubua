import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// GET /api/shops/[id]/favorite
// Перевірити, чи магазин в обраному
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: shopId } = await context.params;

    if (!shopId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // SESSION
    // =================================================

    const token =
      request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json({
        success: true,
        data: {
          isFavorite: false,
          authenticated: false,
        },
      });
    }

    const session = await db.session.findUnique({
      where: {
        token,
      },
      select: {
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            status: true,
            isBlocked: true,
          },
        },
      },
    });

    if (
      !session ||
      session.expiresAt <= new Date()
    ) {
      return NextResponse.json({
        success: true,
        data: {
          isFavorite: false,
          authenticated: false,
        },
      });
    }

    if (
      session.user.status !== "ACTIVE" ||
      session.user.isBlocked
    ) {
      return NextResponse.json({
        success: true,
        data: {
          isFavorite: false,
          authenticated: false,
        },
      });
    }

    // =================================================
    // SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id: shopId,
      },
      select: {
        id: true,
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
    // FAVORITE
    // =================================================

    const favorite = await db.favoriteShop.findUnique({
      where: {
        userId_shopId: {
          userId: session.userId,
          shopId,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isFavorite: Boolean(favorite),
        authenticated: true,
        createdAt: favorite?.createdAt ?? null,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/favorite error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося перевірити обране",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/shops/[id]/favorite
// Додати магазин в обране
// =====================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: shopId } = await context.params;

    if (!shopId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // SESSION
    // =================================================

    const token =
      request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно авторизуватися",
        },
        { status: 401 }
      );
    }

    const session = await db.session.findUnique({
      where: {
        token,
      },
      select: {
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            status: true,
            isBlocked: true,
          },
        },
      },
    });

    if (
      !session ||
      session.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Сесія недійсна або закінчилася",
        },
        { status: 401 }
      );
    }

    if (
      session.user.status !== "ACTIVE" ||
      session.user.isBlocked
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ваш акаунт заблокований або неактивний",
        },
        { status: 403 }
      );
    }

    // =================================================
    // SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id: shopId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
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

    if (
      !shop.isActive ||
      shop.sellerStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин зараз неактивний",
        },
        { status: 400 }
      );
    }

    // =================================================
    // SELF SHOP
    // =================================================

    if (shop.userId === session.userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Не можна додати власний магазин в обране",
        },
        { status: 400 }
      );
    }

    // =================================================
    // EXISTING FAVORITE
    // =================================================

    const existing =
      await db.favoriteShop.findUnique({
        where: {
          userId_shopId: {
            userId: session.userId,
            shopId,
          },
        },
      });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Магазин вже знаходиться в обраному",
        data: {
          isFavorite: true,
          favoriteId: existing.id,
        },
      });
    }

    // =================================================
    // CREATE
    // =================================================

    const favorite = await db.favoriteShop.create({
      data: {
        userId: session.userId,
        shopId,
      },
      select: {
        id: true,
        userId: true,
        shopId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Магазин додано в обране",
        data: {
          isFavorite: true,
          favorite,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/shops/[id]/favorite error:",
      error
    );

    // Prisma unique constraint
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({
        success: true,
        message: "Магазин вже знаходиться в обраному",
        data: {
          isFavorite: true,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося додати магазин в обране",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/shops/[id]/favorite
// Видалити магазин з обраного
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: shopId } = await context.params;

    if (!shopId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // SESSION
    // =================================================

    const token =
      request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідно авторизуватися",
        },
        { status: 401 }
      );
    }

    const session = await db.session.findUnique({
      where: {
        token,
      },
      select: {
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            status: true,
            isBlocked: true,
          },
        },
      },
    });

    if (
      !session ||
      session.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Сесія недійсна або закінчилася",
        },
        { status: 401 }
      );
    }

    if (
      session.user.status !== "ACTIVE" ||
      session.user.isBlocked
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ваш акаунт заблокований або неактивний",
        },
        { status: 403 }
      );
    }

    // =================================================
    // SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id: shopId,
      },
      select: {
        id: true,
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
    // DELETE
    // =================================================

    const deleted =
      await db.favoriteShop.deleteMany({
        where: {
          userId: session.userId,
          shopId,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        deleted.count > 0
          ? "Магазин видалено з обраного"
          : "Магазину не було в обраному",
      data: {
        isFavorite: false,
      },
    });
  } catch (error) {
    console.error(
      "DELETE /api/shops/[id]/favorite error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося видалити магазин з обраного",
      },
      { status: 500 }
    );
  }
}