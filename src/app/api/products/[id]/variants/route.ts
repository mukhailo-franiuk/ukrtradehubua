import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type VariantValueInput = {
  attributeId: string;
  valueId: string;
};

type VariantInput = {
  variantId?: string;
  sku?: string;
  title?: string | null;
  price?: number | string | null;
  oldPrice?: number | string | null;
  stock?: number;
  reservedStock?: number;
  weight?: number | string | null;
  isActive?: boolean;
  values?: VariantValueInput[];
};

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
      user: {
        include: {
          shop: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await db.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (
    session.user.status !== "ACTIVE" ||
    session.user.isBlocked
  ) {
    return null;
  }

  return session.user;
}

async function checkProductAccess(
  userId: string,
  role: string,
  productId: string
) {
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      shopId: true,
      shop: {
        select: {
          userId: true,
          sellerStatus: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) {
    return {
      allowed: false,
      product: null,
    };
  }

  if (role === "ADMIN") {
    return {
      allowed: true,
      product,
    };
  }

  if (role !== "SELLER") {
    return {
      allowed: false,
      product,
    };
  }

  if (product.shop.userId !== userId) {
    return {
      allowed: false,
      product,
    };
  }

  if (
    product.shop.sellerStatus !== "ACTIVE" ||
    !product.shop.isActive
  ) {
    return {
      allowed: false,
      product,
    };
  }

  return {
    allowed: true,
    product,
  };
}

function normalizeDecimal(
  value: number | string | null | undefined
) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (numberValue < 0) {
    return null;
  }

  return numberValue;
}

function validateInteger(
  value: number | undefined,
  name: string
) {
  if (value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    return `${name} повинен бути цілим числом >= 0`;
  }

  return null;
}

async function validateVariantValues(
  values: VariantValueInput[]
) {
  if (!values.length) {
    return {
      valid: true,
      message: null,
    };
  }

  const attributeIds = values.map(
    (item) => item.attributeId
  );

  const valueIds = values.map(
    (item) => item.valueId
  );

  if (
    new Set(attributeIds).size !== attributeIds.length
  ) {
    return {
      valid: false,
      message:
        "Один і той самий атрибут не можна додати двічі",
    };
  }

  const attributes = await db.attribute.findMany({
    where: {
      id: {
        in: attributeIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (attributes.length !== attributeIds.length) {
    return {
      valid: false,
      message: "Один або декілька атрибутів не знайдено",
    };
  }

  const attributeValues =
    await db.attributeValue.findMany({
      where: {
        id: {
          in: valueIds,
        },
      },
      select: {
        id: true,
        attributeId: true,
      },
    });

  if (attributeValues.length !== valueIds.length) {
    return {
      valid: false,
      message:
        "Один або декілька значень атрибутів не знайдено",
    };
  }

  for (const item of values) {
    const value = attributeValues.find(
      (v) => v.id === item.valueId
    );

    if (!value) {
      return {
        valid: false,
        message: "Значення атрибута не знайдено",
      };
    }

    if (value.attributeId !== item.attributeId) {
      return {
        valid: false,
        message:
          "Значення атрибута не відповідає вибраному атрибуту",
      };
    }
  }

  return {
    valid: true,
    message: null,
  };
}

/**
 * =========================================================
 * GET
 * =========================================================
 */

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const product = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        variants: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            values: {
              include: {
                attribute: true,
                value: true,
              },
            },
            images: {
              include: {
                image: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      variants: product.variants,
    });
  } catch (error) {
    console.error(
      "GET /api/products/[id]/variants:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати варіанти товару",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідно авторизуватися",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const access = await checkProductAccess(
      user.id,
      user.role,
      id
    );

    if (!access.product) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "У вас немає прав для керування варіантами цього товару",
        },
        {
          status: 403,
        }
      );
    }

    const body = (await request.json()) as VariantInput;

    const sku = body.sku?.trim();

    if (!sku) {
      return NextResponse.json(
        {
          success: false,
          message: "SKU є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const stockError = validateInteger(
      body.stock,
      "stock"
    );

    if (stockError) {
      return NextResponse.json(
        {
          success: false,
          message: stockError,
        },
        {
          status: 400,
        }
      );
    }

    const reservedError = validateInteger(
      body.reservedStock,
      "reservedStock"
    );

    if (reservedError) {
      return NextResponse.json(
        {
          success: false,
          message: reservedError,
        },
        {
          status: 400,
        }
      );
    }

    const price = normalizeDecimal(body.price);
    const oldPrice = normalizeDecimal(body.oldPrice);
    const weight = normalizeDecimal(body.weight);

    if (
      body.price !== undefined &&
      body.price !== null &&
      price === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректна ціна",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.oldPrice !== undefined &&
      body.oldPrice !== null &&
      oldPrice === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректна стара ціна",
        },
        {
          status: 400,
        }
      );
    }

    const values = body.values ?? [];

    const valuesValidation =
      await validateVariantValues(values);

    if (!valuesValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: valuesValidation.message,
        },
        {
          status: 400,
        }
      );
    }

    const existingSku =
      await db.productVariant.findUnique({
        where: {
          sku,
        },
      });

    if (existingSku) {
      return NextResponse.json(
        {
          success: false,
          message: "Варіант з таким SKU вже існує",
        },
        {
          status: 409,
        }
      );
    }

    const variant = await db.$transaction(
      async (tx) => {
        const created =
          await tx.productVariant.create({
            data: {
              productId: id,
              sku,
              title: body.title?.trim() || null,
              price,
              oldPrice,
              stock: body.stock ?? 0,
              reservedStock: body.reservedStock ?? 0,
              weight,
              isActive:
                body.isActive !== undefined
                  ? body.isActive
                  : true,
            },
          });

        if (values.length > 0) {
          await tx.variantValue.createMany({
            data: values.map((item) => ({
              variantId: created.id,
              attributeId: item.attributeId,
              valueId: item.valueId,
            })),
          });
        }

        return tx.productVariant.findUnique({
          where: {
            id: created.id,
          },
          include: {
            values: {
              include: {
                attribute: true,
                value: true,
              },
            },
            images: {
              include: {
                image: true,
              },
            },
          },
        });
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Варіант успішно створено",
        variant,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/products/[id]/variants:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося створити варіант",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * =========================================================
 * PATCH
 * =========================================================
 */

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
          message: "Необхідно авторизуватися",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const access = await checkProductAccess(
      user.id,
      user.role,
      id
    );

    if (!access.product) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "У вас немає прав для редагування варіантів",
        },
        {
          status: 403,
        }
      );
    }

    const body = (await request.json()) as VariantInput;

    const variantId = body.variantId?.trim();

    if (!variantId) {
      return NextResponse.json(
        {
          success: false,
          message: "variantId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await db.productVariant.findFirst({
        where: {
          id: variantId,
          productId: id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Варіант не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    const data: {
      sku?: string;
      title?: string | null;
      price?: number | null;
      oldPrice?: number | null;
      stock?: number;
      reservedStock?: number;
      weight?: number | null;
      isActive?: boolean;
    } = {};

    if (body.sku !== undefined) {
      const sku = body.sku.trim();

      if (!sku) {
        return NextResponse.json(
          {
            success: false,
            message: "SKU не може бути порожнім",
          },
          {
            status: 400,
          }
        );
      }

      const duplicate =
        await db.productVariant.findFirst({
          where: {
            sku,
            id: {
              not: variantId,
            },
          },
        });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "Такий SKU вже використовується",
          },
          {
            status: 409,
          }
        );
      }

      data.sku = sku;
    }

    if (body.title !== undefined) {
      data.title = body.title?.trim() || null;
    }

    if (body.price !== undefined) {
      const price = normalizeDecimal(body.price);

      if (
        body.price !== null &&
        price === null
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна ціна",
          },
          {
            status: 400,
          }
        );
      }

      data.price = price;
    }

    if (body.oldPrice !== undefined) {
      const oldPrice =
        normalizeDecimal(body.oldPrice);

      if (
        body.oldPrice !== null &&
        oldPrice === null
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна стара ціна",
          },
          {
            status: 400,
          }
        );
      }

      data.oldPrice = oldPrice;
    }

    if (body.weight !== undefined) {
      const weight = normalizeDecimal(body.weight);

      if (
        body.weight !== null &&
        weight === null
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна вага",
          },
          {
            status: 400,
          }
        );
      }

      data.weight = weight;
    }

    if (body.stock !== undefined) {
      const error = validateInteger(
        body.stock,
        "stock"
      );

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: error,
          },
          {
            status: 400,
          }
        );
      }

      data.stock = body.stock;
    }

    if (body.reservedStock !== undefined) {
      const error = validateInteger(
        body.reservedStock,
        "reservedStock"
      );

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: error,
          },
          {
            status: 400,
          }
        );
      }

      data.reservedStock = body.reservedStock;
    }

    if (body.isActive !== undefined) {
      data.isActive = body.isActive;
    }

    const variant = await db.$transaction(
      async (tx) => {
        await tx.productVariant.update({
          where: {
            id: variantId,
          },
          data,
        });

        if (body.values !== undefined) {
          const valuesValidation =
            await validateVariantValues(body.values);

          if (!valuesValidation.valid) {
            throw new Error(
              valuesValidation.message ??
                "Некоректні значення атрибутів"
            );
          }

          await tx.variantValue.deleteMany({
            where: {
              variantId,
            },
          });

          if (body.values.length > 0) {
            await tx.variantValue.createMany({
              data: body.values.map((item) => ({
                variantId,
                attributeId: item.attributeId,
                valueId: item.valueId,
              })),
            });
          }
        }

        return tx.productVariant.findUnique({
          where: {
            id: variantId,
          },
          include: {
            values: {
              include: {
                attribute: true,
                value: true,
              },
            },
            images: {
              include: {
                image: true,
              },
            },
          },
        });
      }
    );

    return NextResponse.json({
      success: true,
      message: "Варіант успішно оновлено",
      variant,
    });
  } catch (error) {
    console.error(
      "PATCH /api/products/[id]/variants:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Не вдалося оновити варіант",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * =========================================================
 * DELETE
 * =========================================================
 */

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
          message: "Необхідно авторизуватися",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const access = await checkProductAccess(
      user.id,
      user.role,
      id
    );

    if (!access.product) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "У вас немає прав для видалення варіантів",
        },
        {
          status: 403,
        }
      );
    }

    let body: {
      variantId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    const variantId = body.variantId?.trim();

    if (!variantId) {
      return NextResponse.json(
        {
          success: false,
          message: "variantId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const variant =
      await db.productVariant.findFirst({
        where: {
          id: variantId,
          productId: id,
        },
        include: {
          orderItems: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Варіант не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (variant.orderItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Варіант не можна видалити, оскільки він вже використовувався у замовленнях",
        },
        {
          status: 409,
        }
      );
    }

    await db.productVariant.delete({
      where: {
        id: variantId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Варіант успішно видалено",
      deletedVariantId: variantId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id]/variants:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося видалити варіант",
      },
      {
        status: 500,
      }
    );
  }
}