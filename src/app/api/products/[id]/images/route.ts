import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ImageBody = {
  url?: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  isPrimary?: boolean;
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

async function canManageProduct(
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

/**
 * =========================================================
 * GET
 * GET /api/products/[id]/images
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
        images: {
          orderBy: [
            {
              isPrimary: "desc",
            },
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
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
      images: product.images,
    });
  } catch (error) {
    console.error(
      "GET /api/products/[id]/images error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати зображення",
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
 * POST /api/products/[id]/images
 *
 * Add image
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

    const permission = await canManageProduct(
      user.id,
      user.role,
      id
    );

    if (!permission.product) {
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

    if (!permission.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "У вас немає прав для керування зображеннями цього товару",
        },
        {
          status: 403,
        }
      );
    }

    const body = (await request.json()) as ImageBody;

    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          message: "URL зображення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.sortOrder !== undefined &&
      (!Number.isInteger(body.sortOrder) ||
        body.sortOrder < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "sortOrder повинен бути цілим числом >= 0",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.width !== undefined &&
      body.width !== null &&
      (!Number.isInteger(body.width) || body.width <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "width повинен бути додатним цілим числом",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.height !== undefined &&
      body.height !== null &&
      (!Number.isInteger(body.height) || body.height <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "height повинен бути додатним цілим числом",
        },
        {
          status: 400,
        }
      );
    }

    const imageCount = await db.productImage.count({
      where: {
        productId: id,
      },
    });

    const shouldBePrimary =
      body.isPrimary === true || imageCount === 0;

    const image = await db.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.productImage.updateMany({
          where: {
            productId: id,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productImage.create({
        data: {
          productId: id,
          url,
          thumbnailUrl:
            body.thumbnailUrl?.trim() || null,
          alt: body.alt?.trim() || null,
          width: body.width ?? null,
          height: body.height ?? null,
          sortOrder:
            body.sortOrder !== undefined
              ? body.sortOrder
              : imageCount,
          isPrimary: shouldBePrimary,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Зображення успішно додано",
        image,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/products/[id]/images error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося додати зображення",
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
 * PATCH /api/products/[id]/images
 *
 * Edit image
 *
 * Body:
 * {
 *   imageId: string,
 *   url?: string,
 *   thumbnailUrl?: string | null,
 *   alt?: string | null,
 *   width?: number | null,
 *   height?: number | null,
 *   sortOrder?: number,
 *   isPrimary?: boolean
 * }
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

    const permission = await canManageProduct(
      user.id,
      user.role,
      id
    );

    if (!permission.product) {
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

    if (!permission.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "У вас немає прав для редагування зображень цього товару",
        },
        {
          status: 403,
        }
      );
    }

    const body = (await request.json()) as ImageBody & {
      imageId?: string;
    };

    const imageId = body.imageId?.trim();

    if (!imageId) {
      return NextResponse.json(
        {
          success: false,
          message: "imageId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const existingImage =
      await db.productImage.findFirst({
        where: {
          id: imageId,
          productId: id,
        },
      });

    if (!existingImage) {
      return NextResponse.json(
        {
          success: false,
          message: "Зображення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    if (
      body.sortOrder !== undefined &&
      (!Number.isInteger(body.sortOrder) ||
        body.sortOrder < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "sortOrder повинен бути цілим числом >= 0",
        },
        {
          status: 400,
        }
      );
    }

    const updateData: {
      url?: string;
      thumbnailUrl?: string | null;
      alt?: string | null;
      width?: number | null;
      height?: number | null;
      sortOrder?: number;
      isPrimary?: boolean;
    } = {};

    if (body.url !== undefined) {
      const url = body.url.trim();

      if (!url) {
        return NextResponse.json(
          {
            success: false,
            message: "URL не може бути порожнім",
          },
          {
            status: 400,
          }
        );
      }

      updateData.url = url;
    }

    if (body.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl =
        body.thumbnailUrl?.trim() || null;
    }

    if (body.alt !== undefined) {
      updateData.alt = body.alt?.trim() || null;
    }

    if (body.width !== undefined) {
      updateData.width = body.width;
    }

    if (body.height !== undefined) {
      updateData.height = body.height;
    }

    if (body.sortOrder !== undefined) {
      updateData.sortOrder = body.sortOrder;
    }

    if (body.isPrimary !== undefined) {
      updateData.isPrimary = body.isPrimary;
    }

    const image = await db.$transaction(async (tx) => {
      if (body.isPrimary === true) {
        await tx.productImage.updateMany({
          where: {
            productId: id,
            id: {
              not: imageId,
            },
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productImage.update({
        where: {
          id: imageId,
        },
        data: updateData,
      });
    });

    return NextResponse.json({
      success: true,
      message: "Зображення успішно оновлено",
      image,
    });
  } catch (error) {
    console.error(
      "PATCH /api/products/[id]/images error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося оновити зображення",
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
 * DELETE /api/products/[id]/images
 *
 * Body:
 * {
 *   imageId: string
 * }
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

    const permission = await canManageProduct(
      user.id,
      user.role,
      id
    );

    if (!permission.product) {
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

    if (!permission.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "У вас немає прав для видалення зображень цього товару",
        },
        {
          status: 403,
        }
      );
    }

    let body: { imageId?: string };

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

    const imageId = body.imageId?.trim();

    if (!imageId) {
      return NextResponse.json(
        {
          success: false,
          message: "imageId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const image = await db.productImage.findFirst({
      where: {
        id: imageId,
        productId: id,
      },
    });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "Зображення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    const remainingImages =
      await db.productImage.findMany({
        where: {
          productId: id,
          id: {
            not: imageId,
          },
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    await db.$transaction(async (tx) => {
      await tx.productImage.delete({
        where: {
          id: imageId,
        },
      });

      if (
        image.isPrimary &&
        remainingImages.length > 0
      ) {
        const newPrimary = remainingImages[0];

        await tx.productImage.update({
          where: {
            id: newPrimary.id,
          },
          data: {
            isPrimary: true,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Зображення успішно видалено",
      deletedImageId: imageId,
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id]/images error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося видалити зображення",
      },
      {
        status: 500,
      }
    );
  }
}