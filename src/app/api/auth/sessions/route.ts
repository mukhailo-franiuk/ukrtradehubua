import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentUser,
  getSessionToken,
} from "@/lib/auth";

import { db } from "@/lib/prisma";

/* ============================================================
   GET SESSIONS
============================================================ */

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Необхідна авторизація.",
        },
        { status: 401 }
      );
    }

    const currentToken =
      await getSessionToken();

    /* ========================================================
       REMOVE EXPIRED SESSIONS
    ======================================================== */

    await db.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    /* ========================================================
       FIND ACTIVE SESSIONS
    ======================================================== */

    const sessions =
      await db.session.findMany({
        where: {
          userId: user.id,
          expiresAt: {
            gt: new Date(),
          },
        },

        orderBy: {
          updatedAt: "desc",
        },

        select: {
          id: true,
          token: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,

      sessions: sessions.map(
        (session) => ({
          id: session.id,

          isCurrent:
            session.token ===
            currentToken,

          expiresAt:
            session.expiresAt,

          ipAddress:
            session.ipAddress,

          userAgent:
            session.userAgent,

          createdAt:
            session.createdAt,

          updatedAt:
            session.updatedAt,
        })
      ),
    });
  } catch (error) {
    console.error(
      "GET SESSIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося отримати сесії.",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE SESSION
============================================================ */

export async function DELETE(
  request: NextRequest
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Необхідна авторизація.",
        },
        { status: 401 }
      );
    }

    const currentToken =
      await getSessionToken();

    if (!currentToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Поточна сесія не знайдена.",
        },
        { status: 401 }
      );
    }

    /* ========================================================
       BODY
    ======================================================== */

    let body: {
      sessionId?: string;
      allOther?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    /* ========================================================
       DELETE ALL OTHER SESSIONS
    ======================================================== */

    if (body.allOther === true) {
      const result =
        await db.session.deleteMany({
          where: {
            userId: user.id,

            token: {
              not: currentToken,
            },
          },
        });

      return NextResponse.json({
        success: true,

        message:
          "Усі інші сесії завершено.",

        deletedCount:
          result.count,
      });
    }

    /* ========================================================
       DELETE ONE SESSION
    ======================================================== */

    const sessionId =
      body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Не вказано сесію.",
        },
        { status: 400 }
      );
    }

    const session =
      await db.session.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },

        select: {
          id: true,
          token: true,
        },
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Сесію не знайдено.",
        },
        { status: 404 }
      );
    }

    /* ========================================================
       PROTECT CURRENT SESSION
    ======================================================== */

    if (
      session.token === currentToken
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Не можна завершити поточну сесію.",
        },
        { status: 400 }
      );
    }

    /* ========================================================
       DELETE
    ======================================================== */

    await db.session.delete({
      where: {
        id: session.id,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Сесію завершено.",
    });
  } catch (error) {
    console.error(
      "DELETE SESSION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Не вдалося завершити сесію.",
      },
      { status: 500 }
    );
  }
}