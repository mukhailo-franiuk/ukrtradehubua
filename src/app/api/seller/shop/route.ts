
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type CreateShopBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  shortDescription?: string | null;
  phone?: string | null;
  email?: string | null;
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
// SHOP INCLUDE
// =====================================================

const shopInclude = {
  logo: true,
  cover: true,

  _count: {
    select: {
      products: true,
      orderSellers: true,
      reviews: true,
      followers: true,
    },
  },
} as const;

// =====================================================
// GET /api/seller/shop
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

    const shop = await db.shop.findUnique({
      where: {
        userId: user.id,
      },
      include: shopInclude,
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин ще не створено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error(
      "GET /api/seller/shop error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати магазин",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/seller/shop
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

    // =================================================
    // SELLER ACCESS
    // =================================================

    if (user.role !== "SELLER") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Створити магазин може лише користувач зі статусом продавця",
        },
        { status: 403 }
      );
    }

    // =================================================
    // BODY
    // =================================================

    let body: CreateShopBody;

    try {
      body =
        (await request.json()) as CreateShopBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const name = body.name?.trim();

    const slug = body.slug
      ?.trim()
      .toLowerCase();

    const description =
      body.description?.trim() || null;

    const shortDescription =
      body.shortDescription?.trim() || null;

    const phone =
      body.phone?.trim() || null;

    const email =
      body.email?.trim().toLowerCase() || null;

    const website =
      body.website?.trim() || null;

    // =================================================
    // VALIDATION
    // =================================================

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Назва магазину є обов'язковою",
        },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Slug магазину є обов'язковим",
        },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Назва магазину повинна містити мінімум 2 символи",
        },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Slug може містити лише латинські літери, цифри та дефіси",
        },
        { status: 400 }
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
        },
      });

    if (existingShop) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього користувача вже створено магазин",
        },
        { status: 409 }
      );
    }

    // =================================================
    // CHECK SELLER APPLICATION
    // =================================================

    const sellerApplication =
      await db.sellerApplication.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          status: true,
        },
      });

    if (
      !sellerApplication ||
      sellerApplication.status !== "APPROVED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ваша заявка продавця ще не схвалена",
        },
        { status: 403 }
      );
    }

    // =================================================
    // CHECK SLUG
    // =================================================

    const slugExists =
      await db.shop.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

    if (slugExists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Магазин з таким slug вже існує",
        },
        { status: 409 }
      );
    }

    // =================================================
    // CREATE SHOP
    // =================================================

    const shop = await db.shop.create({
      data: {
        userId: user.id,

        name,
        slug,

        description,
        shortDescription,

        sellerStatus: "ACTIVE",
        isActive: true,

        phone,
        email,
        website,
      },

      include: shopInclude,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Магазин успішно створено",
        data: shop,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/seller/shop error:",
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
              "Магазин або slug з такими даними вже існує",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити магазин",
      },
      { status: 500 }
    );
  }
}