
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DeliveryBody = {
  method?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  city?: string | null;
  warehouse?: string | null;
  address?: string | null;
};

// =====================================================
// AUTH
// =====================================================

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return null;
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
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (
    session.user.isBlocked ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  return session.user;
}

// =====================================================
// DELIVERY INCLUDE
// =====================================================

const deliveryInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      userId: true,
      shippingMethod: true,
    },
  },
};

// =====================================================
// GET /api/orders/[id]/delivery
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ===================================================
    // AUTH
    // ===================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // ORDER
    // ===================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      select: {
        id: true,
        orderNumber: true,
        shippingMethod: true,
        delivery: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // NO DELIVERY
    // ===================================================

    if (!order.delivery) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json({
      success: true,
      data: order.delivery,
    });
  } catch (error) {
    console.error(
      "GET /api/orders/[id]/delivery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати інформацію про доставку",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/orders/[id]/delivery
// =====================================================

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ===================================================
    // AUTH
    // ===================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // ORDER
    // ===================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippingMethod: true,
        delivery: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // CHECK EXISTING DELIVERY
    // ===================================================

    if (order.delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Для цього замовлення доставка вже створена",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // BODY
    // ===================================================

    let body: DeliveryBody;

    try {
      body = (await request.json()) as DeliveryBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // METHOD
    // ===================================================

    const method = body.method?.trim();

    const allowedMethods = [
      "NOVA_POSHTA",
      "UKRPOSHTA",
      "MIST",
      "COURIER",
      "PICKUP",
    ] as const;

    if (
      !method ||
      !allowedMethods.includes(
        method as (typeof allowedMethods)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний метод доставки",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // CONSISTENCY WITH ORDER
    // ===================================================

    if (
      order.shippingMethod &&
      order.shippingMethod !== method
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Метод доставки не відповідає методу, вказаному в замовленні",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // NORMALIZE DATA
    // ===================================================

    const trackingNumber =
      body.trackingNumber?.trim() || null;

    const carrier =
      body.carrier?.trim() || null;

    const city =
      body.city?.trim() || null;

    const warehouse =
      body.warehouse?.trim() || null;

    const address =
      body.address?.trim() || null;

    // ===================================================
    // CREATE DELIVERY
    // ===================================================

    const delivery = await db.delivery.create({
      data: {
        orderId: order.id,

        method:
          method as
            | "NOVA_POSHTA"
            | "UKRPOSHTA"
            | "MIST"
            | "COURIER"
            | "PICKUP",

        status: "PENDING",

        trackingNumber,
        carrier,
        city,
        warehouse,
        address,
      },

      include: deliveryInclude,
    });

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json(
      {
        success: true,
        message: "Доставку створено",
        data: delivery,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/orders/[id]/delivery error:",
      error
    );

    // Prisma unique constraint
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього замовлення доставка вже існує",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити доставку",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/orders/[id]/delivery
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ===================================================
    // AUTH
    // ===================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // ORDER + DELIVERY
    // ===================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      select: {
        id: true,
        shippingMethod: true,
        delivery: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (!order.delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Для цього замовлення доставка ще не створена",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // BODY
    // ===================================================

    let body: DeliveryBody;

    try {
      body = (await request.json()) as DeliveryBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // DATA
    // ===================================================

    const data: {
      method?: 
        | "NOVA_POSHTA"
        | "UKRPOSHTA"
        | "MIST"
        | "COURIER"
        | "PICKUP";

      trackingNumber?: string | null;
      carrier?: string | null;
      city?: string | null;
      warehouse?: string | null;
      address?: string | null;
    } = {};

    // ---------------------------------------------------
    // METHOD
    // ---------------------------------------------------

    if (body.method !== undefined) {
      const method = body.method.trim();

      const allowedMethods = [
        "NOVA_POSHTA",
        "UKRPOSHTA",
        "MIST",
        "COURIER",
        "PICKUP",
      ] as const;

      if (
        !allowedMethods.includes(
          method as (typeof allowedMethods)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректний метод доставки",
          },
          {
            status: 400,
          }
        );
      }

      if (
        order.shippingMethod &&
        order.shippingMethod !== method
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Метод доставки не відповідає методу замовлення",
          },
          {
            status: 409,
          }
        );
      }

      data.method =
        method as (typeof data.method);
    }

    // ---------------------------------------------------
    // TRACKING NUMBER
    // ---------------------------------------------------

    if (body.trackingNumber !== undefined) {
      data.trackingNumber =
        body.trackingNumber?.trim() || null;
    }

    // ---------------------------------------------------
    // CARRIER
    // ---------------------------------------------------

    if (body.carrier !== undefined) {
      data.carrier =
        body.carrier?.trim() || null;
    }

    // ---------------------------------------------------
    // CITY
    // ---------------------------------------------------

    if (body.city !== undefined) {
      data.city =
        body.city?.trim() || null;
    }

    // ---------------------------------------------------
    // WAREHOUSE
    // ---------------------------------------------------

    if (body.warehouse !== undefined) {
      data.warehouse =
        body.warehouse?.trim() || null;
    }

    // ---------------------------------------------------
    // ADDRESS
    // ---------------------------------------------------

    if (body.address !== undefined) {
      data.address =
        body.address?.trim() || null;
    }

    // ===================================================
    // NOTHING TO UPDATE
    // ===================================================

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Немає даних для оновлення",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // UPDATE
    // ===================================================

    const delivery = await db.delivery.update({
      where: {
        id: order.delivery.id,
      },

      data,

      include: deliveryInclude,
    });

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json({
      success: true,
      message: "Доставку оновлено",
      data: delivery,
    });
  } catch (error) {
    console.error(
      "PATCH /api/orders/[id]/delivery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити доставку",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/orders/[id]/delivery
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // ===================================================
    // AUTH
    // ===================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // FIND ORDER
    // ===================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      select: {
        id: true,
        status: true,
        delivery: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (!order.delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Доставку не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // PROTECT ACTIVE DELIVERY
    // ===================================================

    const protectedStatuses = [
      "SHIPPED",
      "IN_TRANSIT",
      "DELIVERED",
    ];

    const delivery = await db.delivery.findUnique({
      where: {
        id: order.delivery.id,
      },

      select: {
        status: true,
      },
    });

    if (
      delivery &&
      protectedStatuses.includes(delivery.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Не можна видалити доставку, яка вже передана в доставку або доставлена",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // DELETE
    // ===================================================

    await db.delivery.delete({
      where: {
        id: order.delivery.id,
      },
    });

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json({
      success: true,
      message: "Доставку видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/orders/[id]/delivery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити доставку",
      },
      {
        status: 500,
      }
    );
  }
}

