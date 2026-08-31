
import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { getSessionToken } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    /* ============================================================
       ADMIN AUTH
    ============================================================ */

    const token = await getSessionToken();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідна авторизація",
        },
        { status: 401 }
      );
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
      return NextResponse.json(
        {
          success: false,
          message: "Сесію не знайдено",
        },
        { status: 401 }
      );
    }

    if (session.expiresAt < new Date()) {
      await db.session.delete({
        where: {
          id: session.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Сесія закінчилась",
        },
        { status: 401 }
      );
    }

    if (
      session.user.status !== "ACTIVE" ||
      session.user.isBlocked
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Обліковий запис недоступний",
        },
        { status: 403 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    /* ============================================================
       PARAMS
    ============================================================ */

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID заявки не вказано",
        },
        { status: 400 }
      );
    }

    /* ============================================================
       BODY
    ============================================================ */

    let body: {
      adminNote?: unknown;
    } = {};

    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim()
        : null;

    /* ============================================================
       FIND APPLICATION
    ============================================================ */

    const application =
      await db.sellerApplication.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "Заявку не знайдено",
        },
        { status: 404 }
      );
    }

    /* ============================================================
       STATUS CHECK
    ============================================================ */

    if (application.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Цю заявку вже було оброблено",
        },
        { status: 409 }
      );
    }

    /* ============================================================
       REJECT
    ============================================================ */

    const updatedApplication =
      await db.sellerApplication.update({
        where: {
          id: application.id,
        },
        data: {
          status: "REJECTED",

          ...(adminNote !== null
            ? {
                adminNote,
              }
            : {}),
        },
        select: {
          id: true,
          status: true,
          adminNote: true,
          updatedAt: true,
        },
      });

    /* ============================================================
       RESPONSE
    ============================================================ */

    return NextResponse.json({
      success: true,
      message: "Заявку відхилено",
      application: updatedApplication,
    });
  } catch (error) {
    console.error(
      "ADMIN SELLER APPLICATION REJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Помилка під час відхилення заявки",
      },
      { status: 500 }
    );
  }
}