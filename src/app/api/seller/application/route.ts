
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
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
      select: {
        id: true,
        userId: true,
        businessName: true,
        description: true,
        phone: true,
        taxNumber: true,
        website: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      application,
    });
  } catch (error) {
    console.error("GET /api/seller/application:", error);

    return NextResponse.json(
      { error: "Не вдалося отримати заявку" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необхідно увійти в акаунт" },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Ваш акаунт заблокований" },
        { status: 403 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Ваш акаунт неактивний" },
        { status: 403 }
      );
    }

    if (user.role === "SELLER") {
      return NextResponse.json(
        { error: "Ви вже є продавцем" },
        { status: 400 }
      );
    }

    const existing = await db.sellerApplication.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (existing) {
      if (existing.status === "PENDING") {
        return NextResponse.json(
          { error: "У вас вже є заявка, яка очікує перевірки" },
          { status: 409 }
        );
      }

      if (existing.status === "APPROVED") {
        return NextResponse.json(
          { error: "Ваша заявка вже схвалена" },
          { status: 409 }
        );
      }
    }

    const body = await request.json();

    const businessName =
      typeof body.businessName === "string"
        ? body.businessName.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const taxNumber =
      typeof body.taxNumber === "string"
        ? body.taxNumber.trim()
        : "";

    const website =
      typeof body.website === "string"
        ? body.website.trim()
        : "";

    if (!businessName) {
      return NextResponse.json(
        { error: "Вкажіть назву бізнесу або магазину" },
        { status: 400 }
      );
    }

    if (businessName.length < 2) {
      return NextResponse.json(
        { error: "Назва бізнесу занадто коротка" },
        { status: 400 }
      );
    }

    if (businessName.length > 200) {
      return NextResponse.json(
        { error: "Назва бізнесу занадто довга" },
        { status: 400 }
      );
    }

    const application = await db.sellerApplication.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        businessName,
        description: description || null,
        phone: phone || null,
        taxNumber: taxNumber || null,
        website: website || null,
        status: "PENDING",
      },
      update: {
        businessName,
        description: description || null,
        phone: phone || null,
        taxNumber: taxNumber || null,
        website: website || null,
        status: "PENDING",
        adminNote: null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Заявку успішно подано",
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/seller/application:", error);

    return NextResponse.json(
      { error: "Не вдалося створити заявку" },
      { status: 500 }
    );
  }
}