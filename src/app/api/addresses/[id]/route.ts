
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

type AddressType =
  | "SHIPPING"
  | "BILLING"
  | "BOTH";

type UpdateAddressBody = {
  type?: AddressType;

  title?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;

  country?: string;
  region?: string | null;
  city?: string | null;
  postalCode?: string | null;
  street?: string | null;
  building?: string | null;
  apartment?: string | null;

  novaPoshtaWarehouse?: string | null;
  novaPoshtaRef?: string | null;

  isDefault?: boolean;
};

// =====================================================
// AUTH
// =====================================================

async function getCurrentUser(request: NextRequest) {
  const token =
    request.cookies.get("session_token")?.value;

  if (!token) {
    return null;
  }

  const session =
    await db.session.findUnique({
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

  if (
    session.expiresAt <= new Date()
  ) {
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
// GET /api/addresses/[id]
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user =
      await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const addressId =
      id?.trim();

    if (!addressId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Некоректний ID адреси",
        },
        {
          status: 400,
        }
      );
    }

    const address =
      await db.address.findFirst({
        where: {
          id: addressId,
          userId: user.id,
        },
      });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Адресу не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: address,
    });
  } catch (error) {
    console.error(
      "GET /api/addresses/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося отримати адресу",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/addresses/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user =
      await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const addressId =
      id?.trim();

    if (!addressId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Некоректний ID адреси",
        },
        {
          status: 400,
        }
      );
    }

    const existingAddress =
      await db.address.findFirst({
        where: {
          id: addressId,
          userId: user.id,
        },
        select: {
          id: true,
          isDefault: true,
        },
      });

    if (!existingAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Адресу не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    let body: UpdateAddressBody;

    try {
      body =
        (await request.json()) as UpdateAddressBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // TYPE VALIDATION
    // =================================================

    const allowedTypes: AddressType[] = [
      "SHIPPING",
      "BILLING",
      "BOTH",
    ];

    if (
      body.type !== undefined &&
      !allowedTypes.includes(body.type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Некоректний тип адреси",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // BOOLEAN VALIDATION
    // =================================================

    if (
      body.isDefault !== undefined &&
      typeof body.isDefault !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "isDefault повинен мати значення true або false",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // PREPARE DATA
    // =================================================

    const data = {
      ...(body.type !== undefined
        ? {
            type: body.type,
          }
        : {}),

      ...(body.title !== undefined
        ? {
            title:
              body.title?.trim() || null,
          }
        : {}),

      ...(body.firstName !== undefined
        ? {
            firstName:
              body.firstName?.trim() || null,
          }
        : {}),

      ...(body.lastName !== undefined
        ? {
            lastName:
              body.lastName?.trim() || null,
          }
        : {}),

      ...(body.phone !== undefined
        ? {
            phone:
              body.phone?.trim() || null,
          }
        : {}),

      ...(body.country !== undefined
        ? {
            country:
              body.country.trim() ||
              "Україна",
          }
        : {}),

      ...(body.region !== undefined
        ? {
            region:
              body.region?.trim() || null,
          }
        : {}),

      ...(body.city !== undefined
        ? {
            city:
              body.city?.trim() || null,
          }
        : {}),

      ...(body.postalCode !== undefined
        ? {
            postalCode:
              body.postalCode?.trim() || null,
          }
        : {}),

      ...(body.street !== undefined
        ? {
            street:
              body.street?.trim() || null,
          }
        : {}),

      ...(body.building !== undefined
        ? {
            building:
              body.building?.trim() || null,
          }
        : {}),

      ...(body.apartment !== undefined
        ? {
            apartment:
              body.apartment?.trim() || null,
          }
        : {}),

      ...(body.novaPoshtaWarehouse !== undefined
        ? {
            novaPoshtaWarehouse:
              body.novaPoshtaWarehouse?.trim() ||
              null,
          }
        : {}),

      ...(body.novaPoshtaRef !== undefined
        ? {
            novaPoshtaRef:
              body.novaPoshtaRef?.trim() ||
              null,
          }
        : {}),

      ...(body.isDefault !== undefined
        ? {
            isDefault:
              body.isDefault,
          }
        : {}),
    };

    // =================================================
    // UPDATE
    // =================================================

    const address =
      await db.$transaction(
        async (tx) => {
          // Якщо ця адреса стає основною —
          // прибираємо основну адресу у всіх інших
          if (body.isDefault === true) {
            await tx.address.updateMany({
              where: {
                userId: user.id,
                id: {
                  not: existingAddress.id,
                },
                isDefault: true,
              },
              data: {
                isDefault: false,
              },
            });
          }

          return tx.address.update({
            where: {
              id: existingAddress.id,
            },
            data,
          });
        }
      );

    return NextResponse.json({
      success: true,
      message:
        "Адресу успішно оновлено",
      data: address,
    });
  } catch (error) {
    console.error(
      "PATCH /api/addresses/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося оновити адресу",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/addresses/[id]
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user =
      await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const addressId =
      id?.trim();

    if (!addressId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Некоректний ID адреси",
        },
        {
          status: 400,
        }
      );
    }

    const address =
      await db.address.findFirst({
        where: {
          id: addressId,
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Адресу не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // Перевіряємо чи адреса використовується
    // у замовленнях
    const ordersCount =
      await db.order.count({
        where: {
          shippingAddressId:
            address.id,
        },
      });

    if (ordersCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Неможливо видалити адресу, яка вже використовується в замовленні",
        },
        {
          status: 409,
        }
      );
    }

    await db.address.delete({
      where: {
        id: address.id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Адресу успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/addresses/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося видалити адресу",
      },
      {
        status: 500,
      }
    );
  }
}

