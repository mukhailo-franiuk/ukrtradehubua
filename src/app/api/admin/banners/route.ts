
// src/app/api/admin/banners/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

/* ============================================================
   GET /api/admin/banners
   Список банерів для адмін-панелі
============================================================ */

export async function GET() {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Доступ заборонено",
        },
        { status: 401 }
      );
    }

    const banners = await db.banner.findMany({
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error("GET /api/admin/banners error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати банери",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST /api/admin/banners
   Створення банера
============================================================ */

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Доступ заборонено",
        },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні дані",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    /* ========================================================
       REQUIRED
    ======================================================== */

    const imageUrl =
      typeof data.imageUrl === "string"
        ? data.imageUrl.trim()
        : "";

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть imageUrl",
        },
        { status: 400 }
      );
    }

    const position =
      typeof data.position === "string"
        ? data.position.trim()
        : "";

    if (!position) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть position",
        },
        { status: 400 }
      );
    }

    /* ========================================================
       OPTIONAL STRING FIELDS
    ======================================================== */

    const title =
      typeof data.title === "string"
        ? data.title.trim() || null
        : null;

    const subtitle =
      typeof data.subtitle === "string"
        ? data.subtitle.trim() || null
        : null;

    const mobileImageUrl =
      typeof data.mobileImageUrl === "string"
        ? data.mobileImageUrl.trim() || null
        : null;

    const linkUrl =
      typeof data.linkUrl === "string"
        ? data.linkUrl.trim() || null
        : null;

    /* ========================================================
       RELATIONS
    ======================================================== */

    const shopId =
      typeof data.shopId === "string"
        ? data.shopId.trim() || null
        : null;

    const categoryId =
      typeof data.categoryId === "string"
        ? data.categoryId.trim() || null
        : null;

    /* ========================================================
       SORT ORDER
    ======================================================== */

    let sortOrder = 0;

    if (data.sortOrder !== undefined) {
      const parsed =
        typeof data.sortOrder === "number"
          ? data.sortOrder
          : Number(data.sortOrder);

      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "sortOrder має бути цілим числом не менше 0",
          },
          { status: 400 }
        );
      }

      sortOrder = parsed;
    }

    /* ========================================================
       ACTIVE
    ======================================================== */

    let isActive = true;

    if (data.isActive !== undefined) {
      if (typeof data.isActive !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: "isActive має бути boolean",
          },
          { status: 400 }
        );
      }

      isActive = data.isActive;
    }

    /* ========================================================
       DATES
    ======================================================== */

    let startsAt: Date | null = null;
    let endsAt: Date | null = null;

    if (
      data.startsAt !== undefined &&
      data.startsAt !== null &&
      data.startsAt !== ""
    ) {
      if (typeof data.startsAt !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректне значення startsAt",
          },
          { status: 400 }
        );
      }

      const date = new Date(data.startsAt);

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректна дата startsAt",
          },
          { status: 400 }
        );
      }

      startsAt = date;
    }

    if (
      data.endsAt !== undefined &&
      data.endsAt !== null &&
      data.endsAt !== ""
    ) {
      if (typeof data.endsAt !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректне значення endsAt",
          },
          { status: 400 }
        );
      }

      const date = new Date(data.endsAt);

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректна дата endsAt",
          },
          { status: 400 }
        );
      }

      endsAt = date;
    }

    /* ========================================================
       DATE VALIDATION
    ======================================================== */

    if (startsAt && endsAt && endsAt <= startsAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Дата завершення має бути пізніше дати початку",
        },
        { status: 400 }
      );
    }

    /* ========================================================
       SHOP VALIDATION
    ======================================================== */

    if (shopId) {
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
    }

    /* ========================================================
       CATEGORY VALIDATION
    ======================================================== */

    if (categoryId) {
      const category = await db.category.findUnique({
        where: {
          id: categoryId,
        },

        select: {
          id: true,
        },
      });

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            error: "Категорію не знайдено",
          },
          { status: 404 }
        );
      }
    }

    /* ========================================================
       CREATE
    ======================================================== */

    const banner = await db.banner.create({
      data: {
        createdById: admin.id,

        shopId,
        categoryId,

        title,
        subtitle,

        imageUrl,
        mobileImageUrl,

        linkUrl,

        /*
         * BannerPosition — enum із твоєї Prisma-схеми.
         *
         * Тут передаємо значення, яке прийшло з форми.
         * Якщо форма використовує правильне значення enum,
         * Prisma збереже його нормально.
         */
        position: position as any,

        sortOrder,

        startsAt,
        endsAt,

        isActive,
      },

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Банер успішно створено",
        banner,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/banners error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити банер",
      },
      { status: 500 }
    );
  }
}