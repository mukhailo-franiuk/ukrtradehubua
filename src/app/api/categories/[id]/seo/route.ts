import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

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
// GET /api/categories/[id]/seo
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
          error: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        seo: true,
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

    return NextResponse.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
        },
        seo: category.seo,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/categories/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати SEO категорії",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/categories/[id]/seo
// =====================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({
      where: {
        id,
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

    const existingSeo = await db.categorySEO.findUnique({
      where: {
        categoryId: id,
      },
    });

    if (existingSeo) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO для цієї категорії вже існує",
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

    const seo = await db.categorySEO.create({
      data: {
        categoryId: id,
        title: normalizeString(body.title),
        description: normalizeString(body.description),
        keywords: normalizeString(body.keywords),
        canonical: normalizeString(body.canonical),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "SEO категорії створено",
        data: seo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/categories/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити SEO категорії",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT /api/categories/[id]/seo
// =====================================================

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({
      where: {
        id,
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

    const existingSeo = await db.categorySEO.findUnique({
      where: {
        categoryId: id,
      },
    });

    if (!existingSeo) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO для цієї категорії ще не створено",
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

    const seo = await db.categorySEO.update({
      where: {
        categoryId: id,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "SEO категорії оновлено",
      data: seo,
    });
  } catch (error) {
    console.error(
      "PUT /api/categories/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити SEO категорії",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/categories/[id]/seo
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID категорії є обов'язковим",
        },
        { status: 400 }
      );
    }

    const existingSeo = await db.categorySEO.findUnique({
      where: {
        categoryId: id,
      },
      select: {
        id: true,
      },
    });

    if (!existingSeo) {
      return NextResponse.json(
        {
          success: false,
          error: "SEO для цієї категорії не знайдено",
        },
        { status: 404 }
      );
    }

    await db.categorySEO.delete({
      where: {
        categoryId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "SEO категорії видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/categories/[id]/seo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити SEO категорії",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER
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