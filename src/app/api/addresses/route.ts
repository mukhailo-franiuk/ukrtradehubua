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
// GET /api/addresses
// =====================================================

export async function GET() {
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

    const addresses = await db.address.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: addresses.map(serializeAddress),
    });
  } catch (error) {
    console.error("GET /api/addresses error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося завантажити адреси",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/addresses
// =====================================================

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const type: AddressType = isAddressType(body.type)
      ? body.type
      : "SHIPPING";

    const city = normalizeNullable(body.city);

    if (!city) {
      return NextResponse.json(
        {
          success: false,
          error: "Вкажіть місто",
        },
        { status: 400 }
      );
    }

    const requestedDefault = Boolean(body.isDefault);

    const existingCount = await db.address.count({
      where: {
        userId: user.id,
      },
    });

    // Перша адреса автоматично стає основною.
    const shouldBeDefault =
      existingCount === 0 || requestedDefault;

    const address = await db.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.address.create({
        data: {
          userId: user.id,

          type,

          title: normalizeNullable(body.title),

          firstName: normalizeNullable(body.firstName),
          lastName: normalizeNullable(body.lastName),
          phone: normalizeNullable(body.phone),

          country:
            normalizeNullable(body.country) ?? "Україна",

          region: normalizeNullable(body.region),
          city,

          postalCode: normalizeNullable(body.postalCode),

          street: normalizeNullable(body.street),
          building: normalizeNullable(body.building),
          apartment: normalizeNullable(body.apartment),

          novaPoshtaWarehouse: normalizeNullable(
            body.novaPoshtaWarehouse
          ),

          novaPoshtaRef: normalizeNullable(
            body.novaPoshtaRef
          ),

          isDefault: shouldBeDefault,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeAddress(address),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/addresses error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося зберегти адресу",
      },
      { status: 500 }
    );
  }
}