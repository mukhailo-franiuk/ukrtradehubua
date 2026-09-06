
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Доступ заборонено" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const application = await db.sellerApplication.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            isBlocked: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Заявку не знайдено" },
        { status: 404 }
      );
    }

    const shop = await db.shop.findUnique({
      where: {
        userId: application.userId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        sellerStatus: true,
        isActive: true,
        rating: true,
        productsCount: true,
        salesCount: true,
        ordersCount: true,
        phone: true,
        email: true,
        website: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const checks = {
      applicationExists: true,
      applicationPending: application.status === "PENDING",
      userExists: Boolean(application.user),
      userIsSeller: application.user.role === "SELLER",
      userActive: application.user.status === "ACTIVE",
      userBlocked: application.user.isBlocked,
      shopExists: Boolean(shop),
      shopActive: shop?.isActive ?? false,
      shopSellerStatus: shop?.sellerStatus ?? null,
    };

    return NextResponse.json({
      application,
      user: application.user,
      shop,
      checks,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/sellers/applications/[id]:",
      error
    );

    return NextResponse.json(
      { error: "Не вдалося завантажити заявку" },
      { status: 500 }
    );
  }
}