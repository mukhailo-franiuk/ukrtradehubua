
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type NotificationType =
  | "ORDER"
  | "PAYMENT"
  | "DELIVERY"
  | "PROMOTION"
  | "SYSTEM"
  | "REVIEW"
  | "SELLER";

type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "SMS"
  | "TELEGRAM";

type CreateNotificationBody = {
  type?: NotificationType;
  channel?: NotificationChannel;
  title?: string;
  message?: string;
  link?: string | null;
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
// GET /api/notifications
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

    // -------------------------------------------------
    // FILTER: unread
    // -------------------------------------------------

    const unreadParam = searchParams.get("unread")?.trim();

    let unread: boolean | undefined;

    if (unreadParam !== undefined) {
      if (
        unreadParam !== "true" &&
        unreadParam !== "false"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Параметр unread повинен бути true або false",
          },
          { status: 400 }
        );
      }

      unread = unreadParam === "true";
    }

    // -------------------------------------------------
    // PAGINATION
    // -------------------------------------------------

    const rawLimit = Number.parseInt(
      searchParams.get("limit") ?? "20",
      10
    );

    const rawPage = Number.parseInt(
      searchParams.get("page") ?? "1",
      10
    );

    const limit = Math.min(
      Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1),
      100
    );

    const page = Math.max(
      Number.isFinite(rawPage) ? rawPage : 1,
      1
    );

    const skip = (page - 1) * limit;

    // -------------------------------------------------
    // WHERE
    // -------------------------------------------------

    const where = {
      userId: user.id,

      ...(unread !== undefined
        ? {
            isRead: !unread,
          }
        : {}),
    };

    // -------------------------------------------------
    // QUERY
    // -------------------------------------------------

    const [notifications, total, unreadCount] =
      await Promise.all([
        db.notification.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        db.notification.count({
          where,
        }),

        db.notification.count({
          where: {
            userId: user.id,
            isRead: false,
          },
        }),
      ]);

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error(
      "GET /api/notifications error:",
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
// POST /api/notifications
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

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: CreateNotificationBody;

    try {
      body = (await request.json()) as CreateNotificationBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const type = body.type;
    const channel = body.channel ?? "IN_APP";

    const title = body.title?.trim();
    const message = body.message?.trim();

    const link =
      typeof body.link === "string"
        ? body.link.trim() || null
        : null;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    const allowedTypes: NotificationType[] = [
      "ORDER",
      "PAYMENT",
      "DELIVERY",
      "PROMOTION",
      "SYSTEM",
      "REVIEW",
      "SELLER",
    ];

    const allowedChannels: NotificationChannel[] = [
      "IN_APP",
      "EMAIL",
      "SMS",
      "TELEGRAM",
    ];

    if (
      !type ||
      !allowedTypes.includes(type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний тип сповіщення",
        },
        { status: 400 }
      );
    }

    if (!allowedChannels.includes(channel)) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний канал сповіщення",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "title є обов'язковим",
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "message є обов'язковим",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // CREATE
    // -------------------------------------------------

    const notification =
      await db.notification.create({
        data: {
          userId: user.id,
          type,
          channel,
          title,
          message,
          link,
        },
      });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Сповіщення створено",
        data: notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/notifications error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити сповіщення",
      },
      { status: 500 }
    );
  }
}
