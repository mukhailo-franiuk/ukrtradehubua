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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Не вказано ID адреси",
        },
        { status: 400 }
      );
    }

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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Не вказано ID адреси",
        },
        { status: 400 }
      );
    }

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

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні дані запиту",
        },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    // -------------------------------------------------
    // Type
    // -------------------------------------------------

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

    // -------------------------------------------------
    // String fields
    // -------------------------------------------------

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

    // -------------------------------------------------
    // City validation
    // -------------------------------------------------

    if ("city" in body && !data.city) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть місто",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // isDefault
    // -------------------------------------------------

    if ("isDefault" in body) {
      if (typeof body.isDefault !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректне значення основної адреси",
          },
          { status: 400 }
        );
      }

      data.isDefault = body.isDefault;
    }

    // -------------------------------------------------
    // Не дозволяємо залишити користувача без
    // основної адреси.
    // -------------------------------------------------

    if ("isDefault" in body && body.isDefault === false) {
      const otherDefault = await db.address.findFirst({
        where: {
          userId: user.id,
          id: {
            not: id,
          },
          isDefault: true,
        },
        select: {
          id: true,
        },
      });

      // Якщо ця адреса є основною і іншої основної немає,
      // не дозволяємо її зняти.
      if (existing.isDefault && !otherDefault) {
        return NextResponse.json(
          {
            success: false,
            error:
              "У вас повинна залишатися хоча б одна основна адреса.",
          },
          { status: 400 }
        );
      }
    }

    const makeDefault = data.isDefault === true;

    // -------------------------------------------------
    // Оновлення
    // -------------------------------------------------

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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Не вказано ID адреси",
        },
        { status: 400 }
      );
    }

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

    // -------------------------------------------------
    // Перевіряємо, чи використовується адреса
    // в історії замовлень.
    // -------------------------------------------------

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

      // -------------------------------------------------
      // Якщо видалили основну адресу — вибираємо
      // найновішу адресу, що залишилася.
      // -------------------------------------------------

      if (address.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: {
            userId: user.id,
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
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