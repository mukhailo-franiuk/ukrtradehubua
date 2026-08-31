import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type UpdatePromotionBody = {
  name?: string;
  description?: string | null;
  type?: string;
  value?: number | string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

// =====================================================
// GET
// /api/shops/[id]/promotions/[promotionId]
// =====================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
      promotionId: string;
    }>;
  }
) {
  try {
    const { id: shopId, promotionId } = await context.params;

    if (!shopId || !promotionId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину та акції є обов'язковими",
        },
        { status: 400 }
      );
    }

    const promotion = await db.promotion.findFirst({
      where: {
        id: promotionId,
        shopId,
      },
      include: {
        products: true,
        shop: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          error: "Акцію не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/promotions/[promotionId] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати акцію",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH
// /api/shops/[id]/promotions/[promotionId]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
      promotionId: string;
    }>;
  }
) {
  try {
    const { id: shopId, promotionId } = await context.params;

    if (!shopId || !promotionId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину та акції є обов'язковими",
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
    // PROMOTION
    // =================================================

    const existingPromotion =
      await db.promotion.findFirst({
        where: {
          id: promotionId,
          shopId,
        },
      });

    if (!existingPromotion) {
      return NextResponse.json(
        {
          success: false,
          error: "Акцію не знайдено",
        },
        { status: 404 }
      );
    }

    // =================================================
    // BODY
    // =================================================

    let body: UpdatePromotionBody;

    try {
      body = (await request.json()) as UpdatePromotionBody;
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
    // DATA
    // =================================================

    const data: {
      name?: string;
      description?: string | null;
      type?: never;
      value?: number;
      startsAt?: Date;
      endsAt?: Date;
      isActive?: boolean;
    } = {};

    // =================================================
    // NAME
    // =================================================

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Назва акції не може бути порожньою",
          },
          { status: 400 }
        );
      }

      data.name = name;
    }

    // =================================================
    // DESCRIPTION
    // =================================================

    if (body.description !== undefined) {
      data.description =
        body.description?.trim() || null;
    }

    // =================================================
    // TYPE
    // =================================================

    if (body.type !== undefined) {
      /*
       * PromotionType залежить від твоєї Prisma-схеми.
       * Тут значення передається далі в Prisma.
       *
       * Після того як enum PromotionType буде відомий,
       * цей блок можна зробити зі строгою перевіркою.
       */

      data.type = body.type as never;
    }

    // =================================================
    // VALUE
    // =================================================

    if (body.value !== undefined) {
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
            error:
              "Значення акції повинно бути більшим за 0",
          },
          { status: 400 }
        );
      }

      data.value = value;
    }

    // =================================================
    // START DATE
    // =================================================

    if (body.startsAt !== undefined) {
      const startsAt = new Date(body.startsAt);

      if (Number.isNaN(startsAt.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректна дата початку акції",
          },
          { status: 400 }
        );
      }

      data.startsAt = startsAt;
    }

    // =================================================
    // END DATE
    // =================================================

    if (body.endsAt !== undefined) {
      const endsAt = new Date(body.endsAt);

      if (Number.isNaN(endsAt.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректна дата завершення акції",
          },
          { status: 400 }
        );
      }

      data.endsAt = endsAt;
    }

    // =================================================
    // VALIDATE DATE RANGE
    // =================================================

    const finalStartsAt =
      data.startsAt ?? existingPromotion.startsAt;

    const finalEndsAt =
      data.endsAt ?? existingPromotion.endsAt;

    if (finalEndsAt <= finalStartsAt) {
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
    // ACTIVE
    // =================================================

    if (body.isActive !== undefined) {
      data.isActive = body.isActive;
    }

    // =================================================
    // UPDATE
    // =================================================

    const promotion = await db.promotion.update({
      where: {
        id: promotionId,
      },

      data,

      include: {
        products: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Акцію успішно оновлено",
      data: promotion,
    });
  } catch (error) {
    console.error(
      "PATCH /api/shops/[id]/promotions/[promotionId] error:",
      error
    );

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      const prismaError = error as {
        code?: string;
      };

      if (prismaError.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            error: "Акцію не знайдено",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити акцію",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE
// /api/shops/[id]/promotions/[promotionId]
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
      promotionId: string;
    }>;
  }
) {
  try {
    const { id: shopId, promotionId } = await context.params;

    if (!shopId || !promotionId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину та акції є обов'язковими",
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
    // PROMOTION
    // =================================================

    const promotion =
      await db.promotion.findFirst({
        where: {
          id: promotionId,
          shopId,
        },
        select: {
          id: true,
        },
      });

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          error: "Акцію не знайдено",
        },
        { status: 404 }
      );
    }

    // =================================================
    // DELETE
    // =================================================

    await db.promotion.delete({
      where: {
        id: promotionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Акцію успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/shops/[id]/promotions/[promotionId] error:",
      error
    );

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      const prismaError = error as {
        code?: string;
      };

      if (prismaError.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            error: "Акцію не знайдено",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити акцію",
      },
      { status: 500 }
    );
  }
}