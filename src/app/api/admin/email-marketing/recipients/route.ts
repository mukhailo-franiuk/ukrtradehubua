import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Не авторизовано" },
        { status: 401 }
      );
    }

    const users = await db.user.findMany({
      where: {
        isBlocked: false,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        email: "asc",
      },
    });

    const recipients = users.filter(
      (user) =>
        typeof user.email === "string" &&
        user.email.trim().length > 0
    );

    return NextResponse.json({
      success: true,
      count: recipients.length,
      recipients,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/email-marketing/recipients:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати список отримувачів",
      },
      { status: 500 }
    );
  }
}