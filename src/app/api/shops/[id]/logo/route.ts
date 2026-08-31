import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type LogoBody = {
  url?: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

// =====================================================
// HELPERS
// =====================================================

function isPrismaError(
  error: unknown,
  code: string
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isValidDimension(
  value: number | null | undefined
): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  return (
    Number.isInteger(value) &&
    value > 0 &&
    value <= 10000
  );
}

// =====================================================
// GET /api/shops/[id]/logo
// =====================================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // GET LOGO
    // =================================================

    const logo = await db.shopLogo.findUnique({
      where: {
        shopId: id,
      },
    });

    if (!logo) {
      return NextResponse.json(
        {
          success: false,
          error: "Логотип магазину не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: logo,
    });
  } catch (error) {
    console.error(
      "GET /api/shops/[id]/logo error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати логотип",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/shops/[id]/logo
// =====================================================
//
// Створює логотип.
//
// Якщо логотип вже існує — замінює його.
// Це дозволяє frontend просто викликати POST при
// завантаженні нового логотипа.
// =====================================================

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // PARSE JSON
    // =================================================

    let body: LogoBody;

    try {
      body = (await request.json()) as LogoBody;
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

    // =================================================
    // URL
    // =================================================

    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "URL логотипа є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Некоректний URL логотипа. Використовуйте http або https",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // DIMENSIONS
    // =================================================

    if (!isValidDimension(body.width)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ширина логотипа повинна бути цілим числом від 1 до 10000",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidDimension(body.height)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Висота логотипа повинна бути цілим числом від 1 до 10000",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // NORMALIZE ALT
    // =================================================

    const alt =
      body.alt === undefined
        ? null
        : body.alt?.trim() || null;

    // =================================================
    // UPSERT
    // =================================================

    const logo = await db.shopLogo.upsert({
      where: {
        shopId: id,
      },

      create: {
        shopId: id,
        url,
        alt,
        width: body.width ?? null,
        height: body.height ?? null,
      },

      update: {
        url,
        alt,
        width: body.width ?? null,
        height: body.height ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Логотип магазину успішно збережено",
        data: logo,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/shops/[id]/logo error:",
      error
    );

    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        {
          success: false,
          error: "Логотип для цього магазину вже існує",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося зберегти логотип",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/shops/[id]/logo
// =====================================================
//
// Часткове оновлення логотипа.
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // CHECK LOGO
    // =================================================

    const existingLogo = await db.shopLogo.findUnique({
      where: {
        shopId: id,
      },
    });

    if (!existingLogo) {
      return NextResponse.json(
        {
          success: false,
          error: "Логотип магазину не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // PARSE JSON
    // =================================================

    let body: LogoBody;

    try {
      body = (await request.json()) as LogoBody;
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

    // =================================================
    // URL
    // =================================================

    let url: string | undefined;

    if (body.url !== undefined) {
      url = body.url.trim();

      if (!url) {
        return NextResponse.json(
          {
            success: false,
            error: "URL логотипа не може бути порожнім",
          },
          {
            status: 400,
          }
        );
      }

      if (!isValidUrl(url)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Некоректний URL логотипа. Використовуйте http або https",
          },
          {
            status: 400,
          }
        );
      }
    }

    // =================================================
    // DIMENSIONS
    // =================================================

    if (!isValidDimension(body.width)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ширина логотипа повинна бути цілим числом від 1 до 10000",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidDimension(body.height)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Висота логотипа повинна бути цілим числом від 1 до 10000",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // UPDATE
    // =================================================

    const logo = await db.shopLogo.update({
      where: {
        shopId: id,
      },

      data: {
        ...(url !== undefined
          ? {
              url,
            }
          : {}),

        ...(body.alt !== undefined
          ? {
              alt: body.alt?.trim() || null,
            }
          : {}),

        ...(body.width !== undefined
          ? {
              width: body.width,
            }
          : {}),

        ...(body.height !== undefined
          ? {
              height: body.height,
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Логотип успішно оновлено",
      data: logo,
    });
  } catch (error) {
    console.error(
      "PATCH /api/shops/[id]/logo error:",
      error
    );

    if (isPrismaError(error, "P2025")) {
      return NextResponse.json(
        {
          success: false,
          error: "Логотип магазину не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити логотип",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/shops/[id]/logo
// =====================================================

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID магазину є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK SHOP
    // =================================================

    const shop = await db.shop.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =================================================
    // DELETE LOGO
    // =================================================

    const logo = await db.shopLogo.findUnique({
      where: {
        shopId: id,
      },
      select: {
        id: true,
      },
    });

    if (!logo) {
      return NextResponse.json(
        {
          success: false,
          error: "Логотип магазину не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    await db.shopLogo.delete({
      where: {
        shopId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Логотип магазину успішно видалено",
    });
  } catch (error) {
    console.error(
      "DELETE /api/shops/[id]/logo error:",
      error
    );

    if (isPrismaError(error, "P2025")) {
      return NextResponse.json(
        {
          success: false,
          error: "Логотип магазину не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося видалити логотип",
      },
      {
        status: 500,
      }
    );
  }
}