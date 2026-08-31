
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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
// GET /api/search/[id]
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
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

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний ID пошукового запису",
        },
        { status: 400 }
      );
    }

    const searchHistory =
      await db.searchHistory.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!searchHistory) {
      return NextResponse.json(
        {
          success: false,
          error: "Запис історії пошуку не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: searchHistory,
    });
  } catch (error) {
    console.error(
      "GET /api/search/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати запис історії пошуку",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/search/[id]
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
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

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний ID пошукового запису",
        },
        { status: 400 }
      );
    }

    const searchHistory =
      await db.searchHistory.findFirst({
        where: {
          id,
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

    if (!searchHistory) {
      return NextResponse.json(
        {
          success: false,
          error: "Запис історії пошуку не знайдено",
        },
        { status: 404 }
      );
    }

    await db.searchHistory.delete({
      where: {
        id: searchHistory.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Запис історії пошуку видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/search/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити запис історії пошуку",
      },
      { status: 500 }
    );
  }
}