
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    // --------------------------------------------------
    // 1. Перевірка адміністратора
    // --------------------------------------------------
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Доступ дозволено лише адміністратору.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. ID товару
    // --------------------------------------------------
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Не вказано ID товару.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Завантажуємо товар + продавця + магазин
    // --------------------------------------------------
    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
        status: true,

        shop: {
          select: {
            id: true,
            userId: true,
            name: true,
            slug: true,
            sellerStatus: true,

            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                isBlocked: true,
              },
            },
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },

        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: "Товар не знайдено.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 4. Товар повинен бути саме DRAFT
    // --------------------------------------------------
    if (product.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: "Invalid Status",
          message: `Товар не можна затвердити. Поточний статус: ${product.status}.`,
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // 5. Перевірка магазину
    // --------------------------------------------------
    if (!product.shop) {
      return NextResponse.json(
        {
          error: "Seller Error",
          message:
            "Неможливо затвердити товар: магазин не знайдено.",
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 6. Перевірка продавця
    // --------------------------------------------------
    const seller = product.shop.user;

    if (!seller) {
      return NextResponse.json(
        {
          error: "Seller Error",
          message:
            "Неможливо затвердити товар: власника магазину не знайдено.",
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 7. Роль продавця
    // --------------------------------------------------
    if (seller.role !== "SELLER") {
      return NextResponse.json(
        {
          error: "Seller Error",
          message:
            "Власник магазину не має ролі SELLER.",
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 8. Seller account не повинен бути заблокований
    // --------------------------------------------------
    if (seller.isBlocked) {
      return NextResponse.json(
        {
          error: "Seller Blocked",
          message:
            "Продавець заблокований і не може продавати.",
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 9. User.status повинен бути ACTIVE
    // --------------------------------------------------
    if (seller.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Seller Inactive",
          message:
            `Акаунт продавця має статус ${seller.status}. Необхідний статус ACTIVE.`,
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 10. Shop.sellerStatus повинен бути ACTIVE
    // --------------------------------------------------
    if (product.shop.sellerStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Shop Inactive",
          message:
            `Магазин має статус ${product.shop.sellerStatus}. Необхідний статус ACTIVE.`,
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 11. Категорія повинна існувати та бути активною
    // --------------------------------------------------
    if (!product.category) {
      return NextResponse.json(
        {
          error: "Category Error",
          message:
            "Неможливо затвердити товар: категорію не знайдено.",
        },
        { status: 422 }
      );
    }

    if (!product.category.isActive) {
      return NextResponse.json(
        {
          error: "Category Inactive",
          message:
            "Категорія товару неактивна.",
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 12. Перевірка зображень
    // --------------------------------------------------
    if (!product.images.length) {
      return NextResponse.json(
        {
          error: "Images Error",
          message:
            "Неможливо затвердити товар без зображень.",
        },
        { status: 422 }
      );
    }

    const hasPrimaryImage = product.images.some(
      (image) => image.isPrimary
    );

    if (!hasPrimaryImage) {
      return NextResponse.json(
        {
          error: "Images Error",
          message:
            "У товару повинно бути основне зображення.",
        },
        { status: 422 }
      );
    }

    // --------------------------------------------------
    // 13. Усі перевірки пройдені
    // --------------------------------------------------
    const updatedProduct =
      await db.product.update({
        where: {
          id: product.id,
        },
        data: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

    // --------------------------------------------------
    // 14. Відповідь
    // --------------------------------------------------
    return NextResponse.json({
      success: true,
      message: "Товар успішно затверджено.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/products/[id]/moderation/approve error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          "Внутрішня помилка сервера.",
      },
      { status: 500 }
    );
  }
}