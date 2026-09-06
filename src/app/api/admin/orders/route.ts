import { NextRequest, NextResponse } from "next/server";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const orderInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },

  shippingAddress: true,

  items: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
        },
      },

      variant: {
        select: {
          id: true,
          title: true,
        },
      },

      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },

    orderBy: {
      createdAt: "asc" as const,
    },
  },

  sellers: {
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },

  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      provider: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },

    orderBy: {
      createdAt: "desc" as const,
    },
  },
} satisfies Prisma.OrderInclude;

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // ADMIN AUTH
    // =====================================================

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // =====================================================
    // QUERY
    // =====================================================

    const searchParams = request.nextUrl.searchParams;

    const rawPage = Number(
      searchParams.get("page") ?? "1",
    );

    const rawLimit = Number(
      searchParams.get("limit") ?? "20",
    );

    const page =
      Number.isFinite(rawPage) && rawPage > 0
        ? Math.floor(rawPage)
        : 1;

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 20;

    const search =
      searchParams.get("search")?.trim() ?? "";

    const status =
      searchParams.get("status")?.trim().toUpperCase() ?? "";

    const paymentStatus =
      searchParams
        .get("paymentStatus")
        ?.trim()
        .toUpperCase() ?? "";

    const skip = (page - 1) * limit;

    // =====================================================
    // WHERE
    // =====================================================

    const where: Prisma.OrderWhereInput = {};

    // -----------------------------------------------------
    // ORDER STATUS
    // -----------------------------------------------------

    if (status) {
      const validStatuses = Object.values(OrderStatus);

      if (
        validStatuses.includes(
          status as OrderStatus,
        )
      ) {
        where.status = status as OrderStatus;
      }
    }

    // -----------------------------------------------------
    // SEARCH
    // -----------------------------------------------------

    if (search) {
      where.OR = [
        {
          id: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          orderNumber: {
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

        {
          user: {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // -----------------------------------------------------
    // PAYMENT STATUS
    // -----------------------------------------------------

    if (paymentStatus) {
      const validPaymentStatuses =
        Object.values(PaymentStatus);

      if (
        validPaymentStatuses.includes(
          paymentStatus as PaymentStatus,
        )
      ) {
        where.payments = {
          some: {
            status:
              paymentStatus as PaymentStatus,
          },
        };
      }
    }

    // =====================================================
    // DATABASE
    // =====================================================

    const [orders, total] =
      await db.$transaction([
        db.order.findMany({
          where,

          include: orderInclude,

          orderBy: {
            createdAt: "desc",
          },

          skip,
          take: limit,
        }),

        db.order.count({
          where,
        }),
      ]);

    // =====================================================
    // PAGINATION
    // =====================================================

    const pages = Math.max(
      1,
      Math.ceil(total / limit),
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      orders,

      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error(
      "[ADMIN_ORDERS_GET]",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to load orders",
      },
      {
        status: 500,
      },
    );
  }
}