import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// =====================================================
// TYPES
// =====================================================

type CreateBrandBody = {
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
};

// =====================================================
// GET /api/brands
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");

    // -------------------------------------------------
    // WHERE
    // -------------------------------------------------

    const where: {
      isActive?: boolean;
      OR?: Array<{
        name?: {
          contains: string;
          mode: "insensitive";
        };
        slug?: {
          contains: string;
          mode: "insensitive";
        };
      }>;
    } = {};

    // -------------------------------------------------
    // ACTIVE FILTER
    // -------------------------------------------------

    if (active === "true") {
      where.isActive = true;
    }

    if (active === "false") {
      where.isActive = false;
    }

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // -------------------------------------------------
    // DATABASE
    // -------------------------------------------------

    const brands = await db.brand.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error("GET /api/brands error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати бренди",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/brands
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // PARSE BODY
    // -------------------------------------------------

    let body: CreateBrandBody;

    try {
      body = (await request.json()) as CreateBrandBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

    const name = body.name?.trim();
    const slug = body.slug?.trim().toLowerCase();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Назва бренду є обов'язковою",
        },
        {
          status: 400,
        }
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Slug бренду є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // CHECK SLUG
    // -------------------------------------------------

    const existingBrand = await db.brand.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (existingBrand) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд з таким slug вже існує",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // CREATE
    // -------------------------------------------------

    const brand = await db.brand.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
        logoUrl: body.logoUrl?.trim() || null,
        isActive: body.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Бренд успішно створено",
        data: brand,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/brands error:", error);

    // -------------------------------------------------
    // PRISMA UNIQUE ERROR
    // -------------------------------------------------

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Бренд з таким значенням вже існує",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // SERVER ERROR
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити бренд",
      },
      {
        status: 500,
      }
    );
  }
}