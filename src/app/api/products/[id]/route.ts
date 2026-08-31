import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// HELPERS
// =====================================================

async function getSession(request: NextRequest) {
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

  return session;
}

function isBlocked(user: {
  isBlocked: boolean;
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED";
}) {
  return (
    user.isBlocked ||
    user.status === "BLOCKED" ||
    user.status === "SUSPENDED"
  );
}

// =====================================================
// GET /api/products/[id]
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID товару не вказано",
        },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: {
        id,
      },

      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            shortDescription: true,
            sellerStatus: true,
            isActive: true,
            rating: true,
            productsCount: true,
            salesCount: true,
            ordersCount: true,

            logo: {
              select: {
                id: true,
                url: true,
                alt: true,
                width: true,
                height: true,
              },
            },

            cover: {
              select: {
                id: true,
                url: true,
                alt: true,
                width: true,
                height: true,
              },
            },
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            icon: true,
          },
        },

        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
          },
        },

        variants: {
          where: {
            isActive: true,
          },

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

        attributes: {
          include: {
            attribute: true,
            value: true,
          },
        },

        seo: true,

        reviews: {
          where: {
            status: "APPROVED",
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 20,

          include: {
            user: {
              select: {
                id: true,
                name: true,

                avatar: {
                  select: {
                    url: true,
                    alt: true,
                  },
                },
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
        { status: 404 }
      );
    }

    // -------------------------------------------------
    // Публічно показуємо тільки активний магазин/товар
    // -------------------------------------------------

    if (
      product.status !== "ACTIVE" ||
      !product.shop.isActive ||
      product.shop.sellerStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар недоступний",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------
    // VIEW COUNTER
    // -------------------------------------------------

    await db.product.update({
      where: {
        id: product.id,
      },
      data: {
        viewsCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати товар",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/products/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID товару не вказано",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідно увійти в систему",
        },
        { status: 401 }
      );
    }

    const user = session.user;

    if (isBlocked(user)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ваш акаунт заблокований або призупинений",
        },
        { status: 403 }
      );
    }

    if (
      user.role !== "SELLER" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // PRODUCT
    // -------------------------------------------------

    const existingProduct = await db.product.findUnique({
      where: {
        id,
      },
      include: {
        shop: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------
    // SELLER OWNERSHIP
    // -------------------------------------------------

    if (
      user.role === "SELLER" &&
      existingProduct.shop.userId !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ви не можете редагувати цей товар",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // SELLER SHOP STATUS
    // -------------------------------------------------

    if (
      user.role === "SELLER" &&
      (
        !user.shop ||
        user.shop.sellerStatus !== "ACTIVE" ||
        !user.shop.isActive
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ваш магазин неактивний",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    const body = await request.json();

    const {
      title,
      slug,
      description,
      shortDescription,

      categoryId,
      brandId,

      sku,

      price,
      oldPrice,

      stock,
      reservedStock,

      status,

      weight,
      length,
      width,
      height,

      isFeatured,
      isNew,
    } = body;

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (
      title !== undefined &&
      (typeof title !== "string" || !title.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректна назва товару",
        },
        { status: 400 }
      );
    }

    if (
      slug !== undefined &&
      (typeof slug !== "string" || !slug.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректний slug",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // SLUG UNIQUE
    // -------------------------------------------------

    if (
      slug !== undefined &&
      slug !== existingProduct.slug
    ) {
      const slugExists = await db.product.findFirst({
        where: {
          slug,
          NOT: {
            id,
          },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          {
            success: false,
            message: "Такий slug вже використовується",
          },
          { status: 409 }
        );
      }
    }

    // -------------------------------------------------
    // SKU UNIQUE
    // -------------------------------------------------

    if (
      sku !== undefined &&
      sku !== null &&
      sku !== existingProduct.sku
    ) {
      const skuExists = await db.product.findFirst({
        where: {
          sku,
          NOT: {
            id,
          },
        },
      });

      if (skuExists) {
        return NextResponse.json(
          {
            success: false,
            message: "Такий SKU вже використовується",
          },
          { status: 409 }
        );
      }
    }

    // -------------------------------------------------
    // CATEGORY
    // -------------------------------------------------

    if (categoryId !== undefined) {
      const category = await db.category.findUnique({
        where: {
          id: categoryId,
        },
      });

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message: "Категорію не знайдено",
          },
          { status: 404 }
        );
      }
    }

    // -------------------------------------------------
    // BRAND
    // -------------------------------------------------

    if (brandId !== undefined && brandId !== null) {
      const brand = await db.brand.findUnique({
        where: {
          id: brandId,
        },
      });

      if (!brand) {
        return NextResponse.json(
          {
            success: false,
            message: "Бренд не знайдено",
          },
          { status: 404 }
        );
      }
    }

    // -------------------------------------------------
    // UPDATE DATA
    // -------------------------------------------------

    const data: any = {};

    if (title !== undefined) {
      data.title = title.trim();
    }

    if (slug !== undefined) {
      data.slug = slug.trim();
    }

    if (description !== undefined) {
      data.description = description || null;
    }

    if (shortDescription !== undefined) {
      data.shortDescription =
        shortDescription || null;
    }

    if (categoryId !== undefined) {
      data.categoryId = categoryId;
    }

    if (brandId !== undefined) {
      data.brandId = brandId || null;
    }

    if (sku !== undefined) {
      data.sku = sku || null;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);

      if (
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна ціна",
          },
          { status: 400 }
        );
      }

      data.price = parsedPrice;
    }

    if (oldPrice !== undefined) {
      data.oldPrice =
        oldPrice === null || oldPrice === ""
          ? null
          : Number(oldPrice);
    }

    if (stock !== undefined) {
      const parsedStock = Number(stock);

      if (
        !Number.isInteger(parsedStock) ||
        parsedStock < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна кількість товару",
          },
          { status: 400 }
        );
      }

      data.stock = parsedStock;
    }

    if (reservedStock !== undefined) {
      const parsedReservedStock =
        Number(reservedStock);

      if (
        !Number.isInteger(parsedReservedStock) ||
        parsedReservedStock < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректна зарезервована кількість",
          },
          { status: 400 }
        );
      }

      data.reservedStock = parsedReservedStock;
    }

    if (status !== undefined) {
      const allowedStatuses = [
        "DRAFT",
        "ACTIVE",
        "OUT_OF_STOCK",
        "ARCHIVED",
      ];

      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректний статус товару",
          },
          { status: 400 }
        );
      }

      data.status = status;
    }

    if (weight !== undefined) {
      data.weight =
        weight === null || weight === ""
          ? null
          : Number(weight);
    }

    if (length !== undefined) {
      data.length =
        length === null || length === ""
          ? null
          : Number(length);
    }

    if (width !== undefined) {
      data.width =
        width === null || width === ""
          ? null
          : Number(width);
    }

    if (height !== undefined) {
      data.height =
        height === null || height === ""
          ? null
          : Number(height);
    }

    if (isFeatured !== undefined) {
      data.isFeatured = Boolean(isFeatured);
    }

    if (isNew !== undefined) {
      data.isNew = Boolean(isNew);
    }

    // -------------------------------------------------
    // UPDATE
    // -------------------------------------------------

    const product = await db.product.update({
      where: {
        id,
      },

      data,

      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            rating: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },

        seo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Товар успішно оновлено",
      data: product,
    });
  } catch (error: any) {
    console.error(
      "PATCH /api/products/[id] error:",
      error
    );

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Товар з такими унікальними даними вже існує",
        },
        { status: 409 }
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося оновити товар",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/products/[id]
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID товару не вказано",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідно увійти в систему",
        },
        { status: 401 }
      );
    }

    const user = session.user;

    if (isBlocked(user)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ваш акаунт заблокований або призупинений",
        },
        { status: 403 }
      );
    }

    if (
      user.role !== "SELLER" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // PRODUCT
    // -------------------------------------------------

    const product = await db.product.findUnique({
      where: {
        id,
      },

      include: {
        shop: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------
    // SELLER OWNERSHIP
    // -------------------------------------------------

    if (
      user.role === "SELLER" &&
      product.shop.userId !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ви не можете видалити цей товар",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------

    await db.$transaction(async (tx) => {
      await tx.product.delete({
        where: {
          id,
        },
      });

      await tx.shop.update({
        where: {
          id: product.shopId,
        },

        data: {
          productsCount: {
            decrement: 1,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Товар успішно видалено",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/products/[id] error:",
      error
    );

    // -------------------------------------------------
    // FOREIGN KEY / RELATED DATA
    // -------------------------------------------------

    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Товар не можна фізично видалити, оскільки він пов'язаний із замовленнями або іншими даними",
        },
        { status: 409 }
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: "Товар не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося видалити товар",
      },
      { status: 500 }
    );
  }
}