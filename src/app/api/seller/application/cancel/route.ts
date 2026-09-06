
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необхідно увійти в акаунт" },
        { status: 401 }
      );
    }

    const application = await db.sellerApplication.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Заявку не знайдено" },
        { status: 404 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Скасувати можна тільки заявку, яка очікує перевірки",
        },
        { status: 409 }
      );
    }

    const updated = await db.sellerApplication.update({
      where: {
        id: application.id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Заявку скасовано",
      application: updated,
    });
  } catch (error) {
    console.error(
      "POST /api/seller/application/cancel:",
      error
    );

    return NextResponse.json(
      { error: "Не вдалося скасувати заявку" },
      { status: 500 }
    );
  }
}