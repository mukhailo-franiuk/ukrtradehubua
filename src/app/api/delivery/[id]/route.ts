
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateDeliveryBody = {
  method?:
    | "NOVA_POSHTA"
    | "UKRPOSHTA"
    | "MIST"
    | "COURIER"
    | "PICKUP";
  status?:
    | "PENDING"
    | "PROCESSING"
    | "SHIPPED"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "FAILED"
    | "RETURNED";
  trackingNumber?: string | null;
  carrier?: string | null;
  city?: string | null;
  warehouse?: string | null;
  address?: string | null;
};

const deliveryMethods = [
  "NOVA_POSHTA",
  "UKRPOSHTA",
  "MIST",
  "COURIER",
  "PICKUP",
] as const;

const deliveryStatuses = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "RETURNED",
] as const;

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

const deliveryInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      discountAmount: true,
      deliveryAmount: true,
      total: true,
      customerNote: true,
      shippingAddressId: true,
      shippingMethod: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID доставки є обов'язковим",
        },
        { status: 400 }
      );
    }

    const delivery = await db.delivery.findFirst({
      where: {
        id,
        order: {
          userId: user.id,
        },
      },
      include: deliveryInclude,
    });

    if (!delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Доставку не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error(
      "GET /api/delivery/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати доставку",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID доставки є обов'язковим",
        },
        { status: 400 }
      );
    }

    let body: UpdateDeliveryBody;

    try {
      body = (await request.json()) as UpdateDeliveryBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    const delivery = await db.delivery.findFirst({
      where: {
        id,
        order: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        orderId: true,
        method: true,
        status: true,
        trackingNumber: true,
        carrier: true,
        city: true,
        warehouse: true,
        address: true,
        shippedAt: true,
        deliveredAt: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Доставку не знайдено",
        },
        { status: 404 }
      );
    }

    if (
      body.method !== undefined &&
      !deliveryMethods.includes(body.method)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний метод доставки",
        },
        { status: 400 }
      );
    }

    if (
      body.status !== undefined &&
      !deliveryStatuses.includes(body.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний статус доставки",
        },
        { status: 400 }
      );
    }

    /*
     * Покупець може оновлювати лише дані,
     * які він ввів для доставки.
     *
     * Системні поля:
     * - status
     * - shippedAt
     * - deliveredAt
     *
     * змінюються серверною логікою / продавцем.
     */

    const data: {
      method?: UpdateDeliveryBody["method"];
      trackingNumber?: string | null;
      carrier?: string | null;
      city?: string | null;
      warehouse?: string | null;
      address?: string | null;
    } = {};

    if (body.method !== undefined) {
      data.method = body.method;
    }

    if (body.trackingNumber !== undefined) {
      data.trackingNumber =
        body.trackingNumber?.trim() || null;
    }

    if (body.carrier !== undefined) {
      data.carrier =
        body.carrier?.trim() || null;
    }

    if (body.city !== undefined) {
      data.city =
        body.city?.trim() || null;
    }

    if (body.warehouse !== undefined) {
      data.warehouse =
        body.warehouse?.trim() || null;
    }

    if (body.address !== undefined) {
      data.address =
        body.address?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Немає даних для оновлення",
        },
        { status: 400 }
      );
    }

    const updatedDelivery =
      await db.delivery.update({
        where: {
          id: delivery.id,
        },
        data,
        include: deliveryInclude,
      });

    return NextResponse.json({
      success: true,
      message: "Доставку оновлено",
      data: updatedDelivery,
    });
  } catch (error) {
    console.error(
      "PATCH /api/delivery/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити доставку",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID доставки є обов'язковим",
        },
        { status: 400 }
      );
    }

    const delivery = await db.delivery.findFirst({
      where: {
        id,
        order: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        orderId: true,
        status: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Доставку не знайдено",
        },
        { status: 404 }
      );
    }

    if (
      delivery.status !== "PENDING" &&
      delivery.status !== "PROCESSING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Цю доставку вже не можна скасувати",
        },
        { status: 409 }
      );
    }

    await db.delivery.delete({
      where: {
        id: delivery.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Доставку видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/delivery/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити доставку",
      },
      { status: 500 }
    );
  }
}

