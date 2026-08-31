import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { db } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteProps
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Не авторизовано",
        },
        { status: 401 }
      );
    }

    const session = await db.session.findUnique({
      where: {
        token: sessionToken,
      },
      include: {
        user: true,
      },
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.role !== "ADMIN" ||
      session.user.isBlocked ||
      session.user.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Доступ заборонено",
        },
        { status: 403 }
      );
    }

    let body: {
      adminNote?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      // body може бути порожнім
    }

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    const application = await db.sellerApplication.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
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

    if (application.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Цю заявку вже розглянуто",
        },
        { status: 409 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.sellerApplication.update({
        where: {
          id,
        },
        data: {
          status: "APPROVED",
          adminNote: adminNote || null,
          reviewedAt: new Date(),
          reviewedById: session.user.id,
          rejectionReason: null,
        },
      });

      await tx.user.update({
        where: {
          id: application.userId,
        },
        data: {
          role: "SELLER",
          status: "ACTIVE",
          isBlocked: false,
          blockedAt: null,
          blockedReason: null,
        },
      });

      const shop = await tx.shop.findUnique({
        where: {
          userId: application.userId,
        },
      });

      if (shop) {
        await tx.shop.update({
          where: {
            id: shop.id,
          },
          data: {
            sellerStatus: "ACTIVE",
            isActive: true,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Заявку схвалено",
    });
  } catch (error) {
    console.error("SELLER APPLICATION APPROVE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося схвалити заявку",
      },
      { status: 500 }
    );
  }
}