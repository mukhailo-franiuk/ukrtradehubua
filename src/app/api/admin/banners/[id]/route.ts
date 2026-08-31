import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* ============================================================
   GET /api/admin/banners/[id]
   Отримання одного банера
============================================================ */

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID банера не вказано",
        },
        { status: 400 }
      );
    }

    const banner = await db.banner.findUnique({
      where: {
        id,
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

    if (!banner) {
      return NextResponse.json(
        {
          success: false,
          error: "Банер не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/banners/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати банер",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH /api/admin/banners/[id]
   Оновлення банера
============================================================ */

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID банера не вказано",
        },
        { status: 400 }
      );
    }

    const existingBanner = await db.banner.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingBanner) {
      return NextResponse.json(
        {
          success: false,
          error: "Банер не знайдено",
        },
        { status: 404 }
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
       UPDATE DATA
    ======================================================== */

    const updateData: {
      title?: string | null;
      subtitle?: string | null;
      imageUrl?: string;
      mobileImageUrl?: string | null;
      linkUrl?: string | null;
      position?: never;
      sortOrder?: number;
      startsAt?: Date | null;
      endsAt?: Date | null;
      isActive?: boolean;
      shopId?: string | null;
      categoryId?: string | null;
    } = {};

    /* ========================================================
       TITLE
    ======================================================== */

    if ("title" in data) {
      if (
        data.title !== null &&
        typeof data.title !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "title має бути рядком або null",
          },
          { status: 400 }
        );
      }

      updateData.title =
        typeof data.title === "string"
          ? data.title.trim() || null
          : null;
    }

    /* ========================================================
       SUBTITLE
    ======================================================== */

    if ("subtitle" in data) {
      if (
        data.subtitle !== null &&
        typeof data.subtitle !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "subtitle має бути рядком або null",
          },
          { status: 400 }
        );
      }

      updateData.subtitle =
        typeof data.subtitle === "string"
          ? data.subtitle.trim() || null
          : null;
    }

    /* ========================================================
       IMAGE URL
    ======================================================== */

    if ("imageUrl" in data) {
      if (
        typeof data.imageUrl !== "string" ||
        !data.imageUrl.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "imageUrl має бути непорожнім рядком",
          },
          { status: 400 }
        );
      }

      updateData.imageUrl = data.imageUrl.trim();
    }

    /* ========================================================
       MOBILE IMAGE URL
    ======================================================== */

    if ("mobileImageUrl" in data) {
      if (
        data.mobileImageUrl !== null &&
        typeof data.mobileImageUrl !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "mobileImageUrl має бути рядком або null",
          },
          { status: 400 }
        );
      }

      updateData.mobileImageUrl =
        typeof data.mobileImageUrl === "string"
          ? data.mobileImageUrl.trim() || null
          : null;
    }

    /* ========================================================
       LINK URL
    ======================================================== */

    if ("linkUrl" in data) {
      if (
        data.linkUrl !== null &&
        typeof data.linkUrl !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "linkUrl має бути рядком або null",
          },
          { status: 400 }
        );
      }

      updateData.linkUrl =
        typeof data.linkUrl === "string"
          ? data.linkUrl.trim() || null
          : null;
    }

    /* ========================================================
       POSITION
    ======================================================== */

    if ("position" in data) {
      if (
        typeof data.position !== "string" ||
        !data.position.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "position має бути непорожнім рядком",
          },
          { status: 400 }
        );
      }

      /*
       * Не вигадуємо значення BannerPosition.
       * Prisma перевірить реальне enum-значення
       * під час update.
       */

      updateData.position =
        data.position.trim() as never;
    }

    /* ========================================================
       SORT ORDER
    ======================================================== */

    if ("sortOrder" in data) {
      const parsed =
        typeof data.sortOrder === "number"
          ? data.sortOrder
          : Number(data.sortOrder);

      if (
        !Number.isInteger(parsed) ||
        parsed < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "sortOrder має бути цілим числом не менше 0",
          },
          { status: 400 }
        );
      }

      updateData.sortOrder = parsed;
    }

    /* ========================================================
       ACTIVE
    ======================================================== */

    if ("isActive" in data) {
      if (typeof data.isActive !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: "isActive має бути boolean",
          },
          { status: 400 }
        );
      }

      updateData.isActive = data.isActive;
    }

    /* ========================================================
       START DATE
    ======================================================== */

    if ("startsAt" in data) {
      if (
        data.startsAt !== null &&
        data.startsAt !== "" &&
        typeof data.startsAt !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректне значення startsAt",
          },
          { status: 400 }
        );
      }

      if (
        data.startsAt === null ||
        data.startsAt === ""
      ) {
        updateData.startsAt = null;
      } else {
        const date = new Date(
          data.startsAt as string
        );

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            {
              success: false,
              error: "Некоректна дата startsAt",
            },
            { status: 400 }
          );
        }

        updateData.startsAt = date;
      }
    }

    /* ========================================================
       END DATE
    ======================================================== */

    if ("endsAt" in data) {
      if (
        data.endsAt !== null &&
        data.endsAt !== "" &&
        typeof data.endsAt !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректне значення endsAt",
          },
          { status: 400 }
        );
      }

      if (
        data.endsAt === null ||
        data.endsAt === ""
      ) {
        updateData.endsAt = null;
      } else {
        const date = new Date(
          data.endsAt as string
        );

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            {
              success: false,
              error: "Некоректна дата endsAt",
            },
            { status: 400 }
          );
        }

        updateData.endsAt = date;
      }
    }

    /* ========================================================
       RELATION: SHOP
    ======================================================== */

    if ("shopId" in data) {
      if (
        data.shopId !== null &&
        typeof data.shopId !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "shopId має бути рядком або null",
          },
          { status: 400 }
        );
      }

      const shopId =
        typeof data.shopId === "string"
          ? data.shopId.trim() || null
          : null;

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

      updateData.shopId = shopId;
    }

    /* ========================================================
       RELATION: CATEGORY
    ======================================================== */

    if ("categoryId" in data) {
      if (
        data.categoryId !== null &&
        typeof data.categoryId !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "categoryId має бути рядком або null",
          },
          { status: 400 }
        );
      }

      const categoryId =
        typeof data.categoryId === "string"
          ? data.categoryId.trim() || null
          : null;

      if (categoryId) {
        const category =
          await db.category.findUnique({
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

      updateData.categoryId = categoryId;
    }

    /* ========================================================
       DATE VALIDATION
    ======================================================== */

    if (
      updateData.startsAt !== undefined &&
      updateData.endsAt !== undefined &&
      updateData.startsAt &&
      updateData.endsAt &&
      updateData.endsAt <= updateData.startsAt
    ) {
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
       IF ONLY ONE DATE IS UPDATED
       Перевіряємо її з поточною датою
    ======================================================== */

    if (
      updateData.startsAt !== undefined ||
      updateData.endsAt !== undefined
    ) {
      const current = await db.banner.findUnique({
        where: {
          id,
        },
        select: {
          startsAt: true,
          endsAt: true,
        },
      });

      if (!current) {
        return NextResponse.json(
          {
            success: false,
            error: "Банер не знайдено",
          },
          { status: 404 }
        );
      }

      const finalStartsAt =
        updateData.startsAt !== undefined
          ? updateData.startsAt
          : current.startsAt;

      const finalEndsAt =
        updateData.endsAt !== undefined
          ? updateData.endsAt
          : current.endsAt;

      if (
        finalStartsAt &&
        finalEndsAt &&
        finalEndsAt <= finalStartsAt
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Дата завершення має бути пізніше дати початку",
          },
          { status: 400 }
        );
      }
    }

    /* ========================================================
       NOTHING TO UPDATE
    ======================================================== */

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Немає даних для оновлення",
        },
        { status: 400 }
      );
    }

    /* ========================================================
       UPDATE
    ======================================================== */

    const banner = await db.banner.update({
      where: {
        id,
      },
      data: updateData,
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
      message: "Банер успішно оновлено",
      banner,
    });
  } catch (error) {
    console.error(
      "PATCH /api/admin/banners/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити банер",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE /api/admin/banners/[id]
   Видалення банера
============================================================ */

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID банера не вказано",
        },
        { status: 400 }
      );
    }

    const banner = await db.banner.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!banner) {
      return NextResponse.json(
        {
          success: false,
          error: "Банер не знайдено",
        },
        { status: 404 }
      );
    }

    await db.banner.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Банер успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/banners/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити банер",
      },
      { status: 500 }
    );
  }
}