
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type SearchBody = {
  query?: string;
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
// GET /api/search
// =====================================================
// Повертає історію пошуку поточного користувача.
//
// ?limit=20
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

    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");

    const parsedLimit = Number.parseInt(
      limitParam ?? "20",
      10
    );

    const limit = Math.min(
      Math.max(
        Number.isFinite(parsedLimit)
          ? parsedLimit
          : 20,
        1
      ),
      100
    );

    const history = await db.searchHistory.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: history,
      total: history.length,
    });
  } catch (error) {
    console.error(
      "GET /api/search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати історію пошуку",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/search
// =====================================================
// Додає пошуковий запит в історію.
//
// Body:
// {
//   "query": "iPhone 15"
// }
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

    let body: SearchBody;

    try {
      body = (await request.json()) as SearchBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "query є обов'язковим",
        },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Пошуковий запит не може перевищувати 500 символів",
        },
        { status: 400 }
      );
    }

    const searchHistory =
      await db.searchHistory.create({
        data: {
          userId: user.id,
          query,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Пошуковий запит збережено",
        data: searchHistory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося зберегти пошуковий запит",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/search
// =====================================================
// Видаляє всю історію пошуку поточного користувача.
// =====================================================

export async function DELETE(request: NextRequest) {
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

    const result =
      await db.searchHistory.deleteMany({
        where: {
          userId: user.id,
        },
      });

    return NextResponse.json({
      success: true,
      message: "Історію пошуку очищено",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error(
      "DELETE /api/search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося очистити історію пошуку",
      },
      { status: 500 }
    );
  }
}