
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const products = await db.product.findMany({
      where: {
        status: "DRAFT",
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            sellerStatus: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            alt: true,
            sortOrder: true,
            isPrimary: true,
          },
        },
      },
    });

    return NextResponse.json({
      products,
      total: products.length,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/products/moderation error:",
      error
    );

    return NextResponse.json(
      {
        error: "Не вдалося отримати товари на модерацію",
      },
      { status: 500 }
    );
  }
}
