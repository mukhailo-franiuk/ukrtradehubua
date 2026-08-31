import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type AddressType = "SHIPPING" | "BILLING" | "BOTH";

type CreateAddressBody = {
  type?: AddressType;

  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;

  country?: string | null;
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
// GET /api/addresses
// =====================================================

export async function GET(request: NextRequest) {
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
      data: addresses,
      total: addresses.length,
    });
  } catch (error) {
    console.error(
      "GET /api/addresses error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати адреси",
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

    let body: CreateAddressBody;

    try {
      body = (await request.json()) as CreateAddressBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    // =================================================
    // NORMALIZE
    // =================================================

    const type = body.type ?? "SHIPPING";

    const title =
      body.title?.trim() || null;

    const firstName =
      body.firstName?.trim() || null;

    const lastName =
      body.lastName?.trim() || null;

    const phone =
      body.phone?.trim() || null;

    const country =
      body.country?.trim() || "Україна";

    const region =
      body.region?.trim() || null;

    const city =
      body.city?.trim() || null;

    const postalCode =
      body.postalCode?.trim() || null;

    const street =
      body.street?.trim() || null;

    const building =
      body.building?.trim() || null;

    const apartment =
      body.apartment?.trim() || null;

    const novaPoshtaWarehouse =
      body.novaPoshtaWarehouse?.trim() || null;

    const novaPoshtaRef =
      body.novaPoshtaRef?.trim() || null;

    const isDefault =
      body.isDefault === true;

    // =================================================
    // VALIDATE TYPE
    // =================================================

    const allowedTypes: AddressType[] = [
      "SHIPPING",
      "BILLING",
      "BOTH",
    ];

    if (
      !allowedTypes.includes(type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний тип адреси",
        },
        { status: 400 }
      );
    }

    // =================================================
    // VALIDATE BASIC ADDRESS
    // =================================================

    if (!city) {
      return NextResponse.json(
        {
          success: false,
          error: "Місто є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // CREATE
    // =================================================

    const address = await db.$transaction(
      async (tx) => {
        // Якщо користувач створює першу адресу —
        // автоматично робимо її основною
        const addressesCount =
          await tx.address.count({
            where: {
              userId: user.id,
            },
          });

        const shouldBeDefault =
          isDefault ||
          addressesCount === 0;

        // =================================================
        // RESET DEFAULT
        // =================================================

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

        // =================================================
        // CREATE ADDRESS
        // =================================================

        return tx.address.create({
          data: {
            userId: user.id,

            type,

            title,
            firstName,
            lastName,
            phone,

            country,
            region,
            city,
            postalCode,
            street,
            building,
            apartment,

            novaPoshtaWarehouse,
            novaPoshtaRef,

            isDefault: shouldBeDefault,
          },
        });
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Адресу успішно створено",
        data: address,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/addresses error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити адресу",
      },
      { status: 500 }
    );
  }
}