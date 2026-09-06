
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Товар не знайдено" },
        { status: 404 }
      );
    }

    if (product.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: "Можна відхиляти тільки товар зі статусом DRAFT",
          currentStatus: product.status,
        },
        { status: 400 }
      );
    }

    const updatedProduct = await db.product.update({
      where: {
        id,
      },
      data: {
        status: "ARCHIVED",
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Товар відхилено",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/products/[id]/moderation/reject error:",
      error
    );

    return NextResponse.json(
      {
        error: "Не вдалося відхилити товар",
      },
      { status: 500 }
    );
  }
}