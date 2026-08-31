
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

type UpdateNotificationBody = {
  isRead?: boolean;
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
// GET /api/notifications/[id]
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
          error: "Некоректний ID сповіщення",
        },
        { status: 400 }
      );
    }

    const notification =
      await db.notification.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: "Сповіщення не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error(
      "GET /api/notifications/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати сповіщення",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/notifications/[id]
// =====================================================

export async function PATCH(
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
          error: "Некоректний ID сповіщення",
        },
        { status: 400 }
      );
    }

    const notification =
      await db.notification.findFirst({
        where: {
          id,
          userId: user.id,
        },
        select: {
          id: true,
          isRead: true,
        },
      });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: "Сповіщення не знайдено",
        },
        { status: 404 }
      );
    }

    let body: UpdateNotificationBody;

    try {
      body = (await request.json()) as UpdateNotificationBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    if (typeof body.isRead !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error:
            "isRead повинен мати значення true або false",
        },
        { status: 400 }
      );
    }

    const updatedNotification =
      await db.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          isRead: body.isRead,
          readAt: body.isRead
            ? new Date()
            : null,
        },
      });

    return NextResponse.json({
      success: true,
      message: body.isRead
        ? "Сповіщення позначено як прочитане"
        : "Сповіщення позначено як непрочитане",
      data: updatedNotification,
    });
  } catch (error) {
    console.error(
      "PATCH /api/notifications/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося оновити сповіщення",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/notifications/[id]
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
          error: "Некоректний ID сповіщення",
        },
        { status: 400 }
      );
    }

    const notification =
      await db.notification.findFirst({
        where: {
          id,
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: "Сповіщення не знайдено",
        },
        { status: 404 }
      );
    }

    await db.notification.delete({
      where: {
        id: notification.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Сповіщення видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/notifications/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити сповіщення",
      },
      { status: 500 }
    );
  }
}
