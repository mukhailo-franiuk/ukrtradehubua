import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// GET /api/categories
// Список категорій
// =====================================================

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      include: {
        seo: true,
        _count: {
          select: {
            products: true,
            children: true,
            banners: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("GET /api/categories error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати категорії",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/categories
// Створення категорії
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      slug,
      description,
      imageUrl,
      icon,
      parentId,
      isActive,
      sortOrder,
      seo,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Назва та slug є обов'язковими",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedName = String(name).trim();
    const normalizedSlug = String(slug).trim().toLowerCase();

    if (!normalizedName || !normalizedSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Назва та slug не можуть бути порожніми",
        },
        {
          status: 400,
        }
      );
    }

    // Перевіряємо slug
    const existing = await db.category.findUnique({
      where: {
        slug: normalizedSlug,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорія з таким slug вже існує",
        },
        {
          status: 409,
        }
      );
    }

    // Перевіряємо parent
    if (parentId) {
      const parent = await db.category.findUnique({
        where: {
          id: parentId,
        },
        select: {
          id: true,
        },
      });

      if (!parent) {
        return NextResponse.json(
          {
            success: false,
            message: "Батьківську категорію не знайдено",
          },
          {
            status: 404,
          }
        );
      }
    }

    const category = await db.category.create({
      data: {
        name: normalizedName,
        slug: normalizedSlug,
        description: description
          ? String(description).trim()
          : null,
        imageUrl: imageUrl
          ? String(imageUrl).trim()
          : null,
        icon: icon
          ? String(icon).trim()
          : null,
        parentId: parentId || null,
        isActive:
          typeof isActive === "boolean"
            ? isActive
            : true,
        sortOrder:
          typeof sortOrder === "number"
            ? sortOrder
            : 0,

        ...(seo
          ? {
              seo: {
                create: {
                  title: seo.title
                    ? String(seo.title).trim()
                    : null,
                  description: seo.description
                    ? String(seo.description).trim()
                    : null,
                  keywords: seo.keywords
                    ? String(seo.keywords).trim()
                    : null,
                  canonical: seo.canonical
                    ? String(seo.canonical).trim()
                    : null,
                },
              },
            }
          : {}),
      },
      include: {
        seo: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Категорію успішно створено",
        category,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/categories error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося створити категорію",
      },
      {
        status: 500,
      }
    );
  }
}