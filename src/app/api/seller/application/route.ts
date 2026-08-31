
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type CreateSellerApplicationBody = {
  businessName?: string | null;
  description?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  website?: string | null;
};

// =====================================================
// AUTH
// =====================================================

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (
    session.user.isBlocked ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  return session.user;
}

// =====================================================
// GET /api/seller/application
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    const application =
      await db.sellerApplication.findUnique({
        where: {
          userId: user.id,
        },
      });

    return NextResponse.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error(
      "GET /api/seller/application error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося отримати заявку продавця",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/seller/application
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    if (
      user.role === "SELLER" ||
      user.role === "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Цей користувач вже має права продавця",
        },
        { status: 409 }
      );
    }

    let body: CreateSellerApplicationBody;

    try {
      body =
        (await request.json()) as CreateSellerApplicationBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const businessName =
      body.businessName?.trim() || null;

    const description =
      body.description?.trim() || null;

    const phone =
      body.phone?.trim() || null;

    const taxNumber =
      body.taxNumber?.trim() || null;

    const website =
      body.website?.trim() || null;

    // =================================================
    // CHECK EXISTING APPLICATION
    // =================================================

    const existingApplication =
      await db.sellerApplication.findUnique({
        where: {
          userId: user.id,
        },
      });

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Заявка на статус продавця вже існує",
          data: existingApplication,
        },
        { status: 409 }
      );
    }

    // =================================================
    // CHECK EXISTING SHOP
    // =================================================

    const existingShop =
      await db.shop.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          sellerStatus: true,
        },
      });

    if (existingShop) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього користувача вже існує магазин",
          shop: existingShop,
        },
        { status: 409 }
      );
    }

    // =================================================
    // CREATE APPLICATION
    // =================================================

    const application =
      await db.sellerApplication.create({
        data: {
          userId: user.id,
          businessName,
          description,
          phone,
          taxNumber,
          website,
          status: "PENDING",
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Заявку на отримання статусу продавця успішно створено",
        data: application,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/seller/application error:",
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

      if (prismaError.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Заявка продавця для цього користувача вже існує",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося створити заявку продавця",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/seller/application
// =====================================================

export async function DELETE(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    const application =
      await db.sellerApplication.findUnique({
        where: {
          userId: user.id,
        },
      });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          error: "Заявку не знайдено",
        },
        { status: 404 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Можна скасувати лише заявку зі статусом PENDING",
        },
        { status: 409 }
      );
    }

    await db.sellerApplication.update({
      where: {
        id: application.id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Заявку продавця скасовано",
    });
  } catch (error) {
    console.error(
      "DELETE /api/seller/application error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося скасувати заявку продавця",
      },
      { status: 500 }
    );
  }
}

