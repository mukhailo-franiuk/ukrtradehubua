import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function assertCanManageProduct(productId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, allowed: false };
  }

  if (user.role === "ADMIN") {
    return { user, allowed: true };
  }

  if (user.role !== "SELLER") {
    return { user, allowed: false };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { shop: { select: { userId: true } } },
  });

  if (!product || product.shop.userId !== user.id) {
    return { user, allowed: false };
  }

  return { user, allowed: true };
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SeoBody = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  canonical?: string | null;
};

// =====================================================
// GET /api/products/[id]/seo
// =====================================================

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID товару є обов'язковим",
        },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        seo: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
        },
        seo: product.seo,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/products/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати SEO товару",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/products/[id]/seo
// =====================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const access = await assertCanManageProduct(id);

    if (!access.user) {
      return NextResponse.json(
        { success: false, error: "Необхідна авторизація" },
        { status: 401 }
      );
    }

    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: "Доступ заборонено" },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID товару є обов'язковим",
        },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    const existingSeo = await db.productSEO.findUnique({
      where: {
        productId: id,
      },
    });

    if (existingSeo) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO для цього товару вже існує",
        },
        { status: 409 }
      );
    }

    let body: SeoBody;

    try {
      body = (await request.json()) as SeoBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const seo = await db.productSEO.create({
      data: {
        productId: id,
        title: normalizeString(body.title),
        description: normalizeString(body.description),
        keywords: normalizeString(body.keywords),
        canonical: normalizeString(body.canonical),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "SEO товару створено",
        data: seo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/products/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити SEO товару",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT /api/products/[id]/seo
// =====================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const access = await assertCanManageProduct(id);

    if (!access.user) {
      return NextResponse.json(
        { success: false, error: "Необхідна авторизація" },
        { status: 401 }
      );
    }

    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: "Доступ заборонено" },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID товару є обов'язковим",
        },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    const existingSeo = await db.productSEO.findUnique({
      where: {
        productId: id,
      },
    });

    if (!existingSeo) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO для цього товару ще не створено",
        },
        { status: 404 }
      );
    }

    let body: SeoBody;

    try {
      body = (await request.json()) as SeoBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const data: {
      title?: string | null;
      description?: string | null;
      keywords?: string | null;
      canonical?: string | null;
    } = {};

    if ("title" in body) {
      data.title = normalizeString(body.title);
    }

    if ("description" in body) {
      data.description = normalizeString(
        body.description
      );
    }

    if ("keywords" in body) {
      data.keywords = normalizeString(body.keywords);
    }

    if ("canonical" in body) {
      data.canonical = normalizeString(
        body.canonical
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Немає даних для оновлення",
        },
        { status: 400 }
      );
    }

    const seo = await db.productSEO.update({
      where: {
        productId: id,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "SEO товару оновлено",
      data: seo,
    });
  } catch (error) {
    console.error(
      "PUT /api/products/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити SEO товару",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/products/[id]/seo
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const access = await assertCanManageProduct(id);

    if (!access.user) {
      return NextResponse.json(
        { success: false, error: "Необхідна авторизація" },
        { status: 401 }
      );
    }

    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: "Доступ заборонено" },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID товару є обов'язковим",
        },
        { status: 400 }
      );
    }

    const existingSeo = await db.productSEO.findUnique({
      where: {
        productId: id,
      },
      select: {
        id: true,
      },
    });

    if (!existingSeo) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO для цього товару не знайдено",
        },
        { status: 404 }
      );
    }

    await db.productSEO.delete({
      where: {
        productId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "SEO товару видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити SEO товару",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPERS
// =====================================================

function normalizeString(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}