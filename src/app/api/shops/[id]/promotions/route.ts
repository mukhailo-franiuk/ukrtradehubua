import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type CreatePromotionBody = {
  name?: string;
  description?: string | null;
  type?: string;
  value?: number | string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

// =====================================================
// GET /api/shops/[id]/promotions
// =====================================================

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
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

    const { searchParams } = new URL(request.url);

    const activeParam = searchParams.get("active");

    const promotions = await db.promotion.findMany({
      where: {
        shopId,

        ...(activeParam === "true"
          ? {
              isActive: true,
            }
          : activeParam === "false"
            ? {
                isActive: false,
              }
            : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        products: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: promotions,
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/promotions error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати акції магазину",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/shops/[id]/promotions
// =====================================================

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
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
    // AUTH
    // =================================================

    const sessionToken = request.cookies.get(
      "session_token"
    )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    const session = await db.session.findUnique({
      where: {
        token: sessionToken,
      },

      select: {
        userId: true,
        expiresAt: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Недійсна сесія",
        },
        { status: 401 }
      );
    }

    if (session.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Сесія завершилася",
        },
        { status: 401 }
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
        { status: 404 }
      );
    }

    // =================================================
    // OWNER
    // =================================================

    if (shop.userId !== session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "У вас немає доступу до цього магазину",
        },
        { status: 403 }
      );
    }

    // =================================================
    // SELLER STATUS
    // =================================================

    if (!shop.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин неактивний",
        },
        { status: 403 }
      );
    }

    if (shop.sellerStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не має активного статусу продавця",
        },
        { status: 403 }
      );
    }

    // =================================================
    // BODY
    // =================================================

    let body: CreatePromotionBody;

    try {
      body = (await request.json()) as CreatePromotionBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    // =================================================
    // NAME
    // =================================================

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Назва акції є обов'язковою",
        },
        { status: 400 }
      );
    }

    // =================================================
    // TYPE
    // =================================================

    if (!body.type) {
      return NextResponse.json(
        {
          success: false,
          error: "Тип акції є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // VALUE
    // =================================================

    if (
      body.value === undefined ||
      body.value === null ||
      body.value === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Значення акції є обов'язковим",
        },
        { status: 400 }
      );
    }

    const value = Number(body.value);

    if (!Number.isFinite(value)) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректне значення акції",
        },
        { status: 400 }
      );
    }

    if (value <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Значення акції повинно бути більшим за 0",
        },
        { status: 400 }
      );
    }

    // =================================================
    // DATES
    // =================================================

    if (!body.startsAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Дата початку акції є обов'язковою",
        },
        { status: 400 }
      );
    }

    if (!body.endsAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Дата завершення акції є обов'язковою",
        },
        { status: 400 }
      );
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректна дата початку акції",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(endsAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректна дата завершення акції",
        },
        { status: 400 }
      );
    }

    if (endsAt <= startsAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Дата завершення повинна бути пізніше дати початку",
        },
        { status: 400 }
      );
    }

    // =================================================
    // CREATE
    // =================================================

    const promotion = await db.promotion.create({
      data: {
        shopId,
        createdById: session.userId,

        name,

        description:
          body.description?.trim() || null,

        type: body.type as never,

        value,

        startsAt,
        endsAt,

        isActive: body.isActive ?? true,
      },

      include: {
        products: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Акцію успішно створено",
        data: promotion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/shops/[id]/promotions error:",
      error
    );

    // =================================================
    // PRISMA ERRORS
    // =================================================

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      const prismaError = error as {
        code?: string;
      };

      if (prismaError.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            error: "Така акція вже існує",
          },
          { status: 409 }
        );
      }

      if (prismaError.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            error: "Пов'язаний запис не знайдено",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити акцію",
      },
      { status: 500 }
    );
  }
}