
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Доступ заборонено" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim() || "";

    const where: any = {};

    if (
      status === "PENDING" ||
      status === "APPROVED" ||
      status === "REJECTED" ||
      status === "CANCELLED"
    ) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          businessName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          taxNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [applications, total] = await Promise.all([
      db.sellerApplication.findMany({
        where,
        orderBy: {
          createdAt: "desc",
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              isBlocked: true,
            },
          },
        },
      }),

      db.sellerApplication.count({
        where,
      }),
    ]);

    return NextResponse.json({
      applications,
      total,
    });
  } catch (error) {
    console.error("GET /api/admin/sellers/applications:", error);

    return NextResponse.json(
      { error: "Не вдалося завантажити заявки" },
      { status: 500 }
    );
  }
}