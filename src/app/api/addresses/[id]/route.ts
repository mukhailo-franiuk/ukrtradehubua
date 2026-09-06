import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ADDRESS_TYPES = ["SHIPPING", "BILLING", "BOTH"] as const;

type AddressType = (typeof ADDRESS_TYPES)[number];

function isAddressType(value: unknown): value is AddressType {
  return (
    typeof value === "string" &&
    ADDRESS_TYPES.includes(value as AddressType)
  );
}

function normalizeNullable(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function serializeAddress(address: any) {
  return {
    id: address.id,
    userId: address.userId,
    type: address.type,
    title: address.title,
    firstName: address.firstName,
    lastName: address.lastName,
    phone: address.phone,
    country: address.country,
    region: address.region,
    city: address.city,
    postalCode: address.postalCode,
    street: address.street,
    building: address.building,
    apartment: address.apartment,
    novaPoshtaWarehouse: address.novaPoshtaWarehouse,
    novaPoshtaRef: address.novaPoshtaRef,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

// =====================================================
// GET /api/addresses/[id]
// =====================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getCurrentUser();

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

    const address = await db.address.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: "Адресу не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeAddress(address),
    });
  } catch (error) {
    console.error("GET /api/addresses/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося завантажити адресу",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/addresses/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getCurrentUser();

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

    const existing = await db.address.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Адресу не знайдено",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};

    if ("type" in body) {
      if (!isAddressType(body.type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректний тип адреси",
          },
          { status: 400 }
        );
      }

      data.type = body.type;
    }

    const stringFields = [
      "title",
      "firstName",
      "lastName",
      "phone",
      "country",
      "region",
      "city",
      "postalCode",
      "street",
      "building",
      "apartment",
      "novaPoshtaWarehouse",
      "novaPoshtaRef",
    ] as const;

    for (const field of stringFields) {
      if (field in body) {
        data[field] = normalizeNullable(body[field]);
      }
    }

    if ("isDefault" in body) {
      data.isDefault = Boolean(body.isDefault);
    }

    if ("city" in body && !data.city) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть місто",
        },
        { status: 400 }
      );
    }

    const makeDefault = data.isDefault === true;

    const address = await db.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: {
            userId: user.id,
            id: {
              not: id,
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
          id,
        },
        data,
      });
    });

    return NextResponse.json({
      success: true,
      data: serializeAddress(address),
    });
  } catch (error) {
    console.error("PATCH /api/addresses/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити адресу",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/addresses/[id]
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const user = await getCurrentUser();

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

    const address = await db.address.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: "Адресу не знайдено",
        },
        { status: 404 }
      );
    }

    // Адреса вже використовується в замовленні.
    const usedByOrders = await db.order.count({
      where: {
        userId: user.id,
        shippingAddressId: id,
      },
    });

    if (usedByOrders > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Цю адресу не можна видалити, оскільки вона використовується в історії замовлень.",
        },
        { status: 409 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.address.delete({
        where: {
          id,
        },
      });

      // Якщо видалили основну адресу —
      // автоматично призначаємо іншу основною.
      if (address.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (nextAddress) {
          await tx.address.update({
            where: {
              id: nextAddress.id,
            },
            data: {
              isDefault: true,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Адресу видалено",
    });
  } catch (error) {
    console.error("DELETE /api/addresses/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити адресу",
      },
      { status: 500 }
    );
  }
}