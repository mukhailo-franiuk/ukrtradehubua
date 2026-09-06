import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getAvailableStock(
  stock: number,
  reservedStock: number
): number {
  return Math.max(0, stock - reservedStock);
}

/*
 * ============================================================
 * PRODUCT SELECT
 * ============================================================
 */

const productSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  oldPrice: true,
  stock: true,
  reservedStock: true,
  status: true,

  images: {
    orderBy: {
      sortOrder: "asc" as const,
    },

    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      alt: true,
      sortOrder: true,
      isPrimary: true,
    },
  },

  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      sellerStatus: true,
    },
  },
};

/*
 * ============================================================
 * VARIANT SELECT
 * ============================================================
 */

const variantSelect = {
  id: true,
  productId: true,
  title: true,
  price: true,
  oldPrice: true,
  stock: true,
  reservedStock: true,
  isActive: true,
};

/*
 * ============================================================
 * CART INCLUDE
 * ============================================================
 */

const cartInclude = {
  items: {
    orderBy: {
      createdAt: "desc" as const,
    },

    include: {
      product: {
        select: productSelect,
      },

      variant: {
        select: variantSelect,
      },
    },
  },
};

/*
 * ============================================================
 * GET /api/cart
 * ============================================================
 */

export async function GET() {
  try {
    /*
     * ----------------------------------------------------------
     * AUTH
     * ----------------------------------------------------------
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Потрібно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    /*
     * ----------------------------------------------------------
     * FIND CART
     * ----------------------------------------------------------
     */

    let cart = await db.cart.findUnique({
      where: {
        userId: user.id,
      },

      include: cartInclude,
    });

    /*
     * ----------------------------------------------------------
     * CREATE CART
     * ----------------------------------------------------------
     */

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId: user.id,
        },

        include: cartInclude,
      });
    }

    /*
     * ==========================================================
     * VALIDATE CART ITEMS
     * ==========================================================
     */

    const itemsToDelete: string[] = [];

    const quantityUpdates: Array<{
      id: string;
      quantity: number;
    }> = [];

    for (const item of cart.items) {
      const product = item.product;
      const variant = item.variant;

      /*
       * --------------------------------------------------------
       * PRODUCT MUST EXIST
       * --------------------------------------------------------
       */

      if (!product) {
        itemsToDelete.push(item.id);
        continue;
      }

      /*
       * --------------------------------------------------------
       * PRODUCT STATUS
       * --------------------------------------------------------
       */

      if (product.status !== "ACTIVE") {
        itemsToDelete.push(item.id);
        continue;
      }

      /*
       * --------------------------------------------------------
       * SHOP
       * --------------------------------------------------------
       */

      if (
        !product.shop ||
        !product.shop.isActive ||
        product.shop.sellerStatus !== "ACTIVE"
      ) {
        itemsToDelete.push(item.id);
        continue;
      }

      /*
       * --------------------------------------------------------
       * VARIANT
       * --------------------------------------------------------
       *
       * Якщо CartItem має variantId:
       *
       * - variant повинен існувати;
       * - бути active;
       * - належати цьому product.
       */

      if (item.variantId !== null) {
        if (!variant) {
          itemsToDelete.push(item.id);
          continue;
        }

        if (!variant.isActive) {
          itemsToDelete.push(item.id);
          continue;
        }

        if (variant.productId !== product.id) {
          itemsToDelete.push(item.id);
          continue;
        }
      }

      /*
       * --------------------------------------------------------
       * AVAILABLE STOCK
       * --------------------------------------------------------
       */

      const availableStock = variant
        ? getAvailableStock(
            variant.stock,
            variant.reservedStock
          )
        : getAvailableStock(
            product.stock,
            product.reservedStock
          );

      /*
       * --------------------------------------------------------
       * OUT OF STOCK
       * --------------------------------------------------------
       */

      if (availableStock <= 0) {
        itemsToDelete.push(item.id);
        continue;
      }

      /*
       * --------------------------------------------------------
       * QUANTITY TOO LARGE
       * --------------------------------------------------------
       */

      if (item.quantity > availableStock) {
        quantityUpdates.push({
          id: item.id,
          quantity: availableStock,
        });
      }
    }

    /*
     * ==========================================================
     * APPLY CART CLEANUP
     * ==========================================================
     */

    if (
      itemsToDelete.length > 0 ||
      quantityUpdates.length > 0
    ) {
      await db.$transaction(async (tx) => {
        /*
         * DELETE INVALID ITEMS
         */

        if (itemsToDelete.length > 0) {
          await tx.cartItem.deleteMany({
            where: {
              cartId: cart!.id,

              id: {
                in: itemsToDelete,
              },
            },
          });
        }

        /*
         * UPDATE QUANTITIES
         */

        for (const update of quantityUpdates) {
          if (itemsToDelete.includes(update.id)) {
            continue;
          }

          await tx.cartItem.updateMany({
            where: {
              id: update.id,
              cartId: cart!.id,
            },

            data: {
              quantity: update.quantity,
            },
          });
        }
      });

      /*
       * --------------------------------------------------------
       * RELOAD CART
       * --------------------------------------------------------
       */

      cart = await db.cart.findUnique({
        where: {
          id: cart.id,
        },

        include: cartInclude,
      });

      /*
       * Теоретично cart не повинен стати null,
       * але залишаємо безпечну перевірку.
       */

      if (!cart) {
        return NextResponse.json({
          success: true,

          cart: {
            id: "",
            userId: user.id,
            items: [],
            itemsCount: 0,
            subtotal: 0,
            oldSubtotal: 0,
            discount: 0,
            total: 0,
          },
        });
      }
    }

    /*
     * ==========================================================
     * FORMAT FRONTEND ITEMS
     * ==========================================================
     */

    const items = cart.items.map((item) => {
      const product = item.product;
      const variant = item.variant;

      /*
       * --------------------------------------------------------
       * ACTIVE PRICE
       * --------------------------------------------------------
       *
       * Якщо variant має власну ціну —
       * використовуємо її.
       *
       * Інакше product.price.
       */

      const variantPrice = decimalToNumber(
        variant?.price
      );

      const productPrice =
        decimalToNumber(product.price) ?? 0;

      const activePrice =
        variantPrice !== null
          ? variantPrice
          : productPrice;

      /*
       * --------------------------------------------------------
       * ACTIVE OLD PRICE
       * --------------------------------------------------------
       */

      const variantOldPrice = decimalToNumber(
        variant?.oldPrice
      );

      const productOldPrice = decimalToNumber(
        product.oldPrice
      );

      const activeOldPrice =
        variantOldPrice !== null
          ? variantOldPrice
          : productOldPrice;

      /*
       * --------------------------------------------------------
       * AVAILABLE STOCK
       * --------------------------------------------------------
       */

      const availableStock = variant
        ? getAvailableStock(
            variant.stock,
            variant.reservedStock
          )
        : getAvailableStock(
            product.stock,
            product.reservedStock
          );

      /*
       * --------------------------------------------------------
       * PRIMARY IMAGE
       * --------------------------------------------------------
       */

      const primaryImage =
        product.images.find(
          (image) => image.isPrimary
        ) ??
        product.images[0] ??
        null;

      /*
       * --------------------------------------------------------
       * FRONTEND OBJECT
       * --------------------------------------------------------
       */

      return {
        id: item.id,

        productId: item.productId,

        variantId: item.variantId,

        quantity: item.quantity,

        product: {
          id: product.id,

          title: product.title,

          slug: product.slug,

          status: product.status,

          price: activePrice,

          oldPrice: activeOldPrice,

          availableStock,

          image: primaryImage
            ? {
                url:
                  primaryImage.thumbnailUrl ??
                  primaryImage.url,

                alt:
                  primaryImage.alt ??
                  product.title,
              }
            : null,

          shop: product.shop,
        },

        variant: variant
          ? {
              id: variant.id,

              title: variant.title,
            }
          : null,
      };
    });

    /*
     * ==========================================================
     * TOTALS
     * ==========================================================
     */

    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        item.product.price *
          item.quantity,
      0
    );

    const oldSubtotal = items.reduce(
      (sum, item) =>
        sum +
        (item.product.oldPrice ??
          item.product.price) *
          item.quantity,
      0
    );

    const discount = Math.max(
      0,
      oldSubtotal - subtotal
    );

    const itemsCount = items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

    /*
     * ==========================================================
     * RESPONSE
     * ==========================================================
     */

    return NextResponse.json({
      success: true,

      cart: {
        id: cart.id,

        userId: cart.userId,

        items,

        itemsCount,

        subtotal,

        oldSubtotal,

        discount,

        total: subtotal,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/cart error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error: "INTERNAL_SERVER_ERROR",

        message:
          "Не вдалося завантажити кошик.",
      },
      { status: 500 }
    );
  }
}

/*
 * ============================================================
 * POST /api/cart
 * ============================================================
 *
 * Додає товар у кошик.
 *
 * Підтримує:
 *
 * 1. product
 * 2. product + variant
 *
 * ВАЖЛИВО:
 *
 * Для variantId === null НЕ використовуємо
 * compound findUnique.
 *
 * У цьому випадку використовуємо findFirst().
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ----------------------------------------------------------
     * AUTH
     * ----------------------------------------------------------
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,

          error: "UNAUTHORIZED",

          message:
            "Потрібно увійти в акаунт.",
        },
        { status: 401 }
      );
    }

    /*
     * ----------------------------------------------------------
     * BODY
     * ----------------------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,

          error: "INVALID_JSON",

          message:
            "Некоректний JSON запит.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null
    ) {
      return NextResponse.json(
        {
          success: false,

          error: "INVALID_BODY",

          message:
            "Некоректні дані запиту.",
        },
        { status: 400 }
      );
    }

    const data = body as Record<
      string,
      unknown
    >;

    /*
     * ----------------------------------------------------------
     * PRODUCT ID
     * ----------------------------------------------------------
     */

    const productId =
      typeof data.productId === "string"
        ? data.productId.trim()
        : "";

    if (!productId) {
      return NextResponse.json(
        {
          success: false,

          error: "PRODUCT_ID_REQUIRED",

          message:
            "productId є обов'язковим.",
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------------------------
     * VARIANT ID
     * ----------------------------------------------------------
     */

    const variantId =
      typeof data.variantId === "string" &&
      data.variantId.trim().length > 0
        ? data.variantId.trim()
        : null;

    /*
     * ----------------------------------------------------------
     * QUANTITY
     * ----------------------------------------------------------
     */

    const quantity = Number(
      data.quantity ?? 1
    );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      return NextResponse.json(
        {
          success: false,

          error: "INVALID_QUANTITY",

          message:
            "Кількість повинна бути цілим числом від 1 до 100.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * PRODUCT
     * ==========================================================
     */

    const product =
      await db.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,

          status: true,

          stock: true,

          reservedStock: true,

          shop: {
            select: {
              id: true,

              isActive: true,

              sellerStatus: true,
            },
          },
        },
      });

    /*
     * ----------------------------------------------------------
     * PRODUCT NOT FOUND
     * ----------------------------------------------------------
     */

    if (!product) {
      return NextResponse.json(
        {
          success: false,

          error: "PRODUCT_NOT_FOUND",

          message:
            "Товар не знайдено.",
        },
        { status: 404 }
      );
    }

    /*
     * ----------------------------------------------------------
     * PRODUCT STATUS
     * ----------------------------------------------------------
     */

    if (product.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,

          error: "PRODUCT_NOT_AVAILABLE",

          message:
            "Товар зараз недоступний.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * SHOP
     * ==========================================================
     */

    if (
      !product.shop ||
      !product.shop.isActive ||
      product.shop.sellerStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,

          error: "SHOP_NOT_AVAILABLE",

          message:
            "Магазин зараз недоступний.",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * STOCK
     * ==========================================================
     */

    let availableStock =
      getAvailableStock(
        product.stock,
        product.reservedStock
      );

    /*
     * ==========================================================
     * VARIANT
     * ==========================================================
     */

    if (variantId) {
      const variant =
        await db.productVariant.findFirst({
          where: {
            id: variantId,

            productId,

            isActive: true,
          },

          select: {
            id: true,

            productId: true,

            stock: true,

            reservedStock: true,
          },
        });

      /*
       * --------------------------------------------------------
       * VARIANT NOT FOUND
       * --------------------------------------------------------
       */

      if (!variant) {
        return NextResponse.json(
          {
            success: false,

            error: "VARIANT_NOT_FOUND",

            message:
              "Варіант товару не знайдено або він недоступний.",
          },
          { status: 404 }
        );
      }

      /*
       * --------------------------------------------------------
       * VARIANT STOCK
       * --------------------------------------------------------
       */

      availableStock =
        getAvailableStock(
          variant.stock,
          variant.reservedStock
        );
    }

    /*
     * ==========================================================
     * OUT OF STOCK
     * ==========================================================
     */

    if (availableStock <= 0) {
      return NextResponse.json(
        {
          success: false,

          error: "OUT_OF_STOCK",

          message:
            "Товару немає в наявності.",

          availableStock: 0,
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * CART
     * ==========================================================
     */

    let cart =
      await db.cart.findUnique({
        where: {
          userId: user.id,
        },
      });

    /*
     * ----------------------------------------------------------
     * CREATE CART
     * ----------------------------------------------------------
     */

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId: user.id,
        },
      });
    }

    /*
     * ==========================================================
     * FIND EXISTING ITEM
     * ==========================================================
     */

    let existingItem = null;

    /*
     * ----------------------------------------------------------
     * PRODUCT + VARIANT
     * ----------------------------------------------------------
     */

    if (variantId) {
      existingItem =
        await db.cartItem.findUnique({
          where: {
            cartId_productId_variantId: {
              cartId: cart.id,

              productId,

              variantId,
            },
          },
        });
    }

    /*
     * ----------------------------------------------------------
     * PRODUCT WITHOUT VARIANT
     * ----------------------------------------------------------
     */

    else {
      existingItem =
        await db.cartItem.findFirst({
          where: {
            cartId: cart.id,

            productId,

            variantId: null,
          },
        });
    }

    /*
     * ==========================================================
     * NEW QUANTITY
     * ==========================================================
     */

    const newQuantity =
      (existingItem?.quantity ?? 0) +
      quantity;

    /*
     * ==========================================================
     * STOCK CHECK
     * ==========================================================
     */

    if (
      newQuantity >
      availableStock
    ) {
      return NextResponse.json(
        {
          success: false,

          error: "INSUFFICIENT_STOCK",

          message: `Доступно лише ${availableStock} шт.`,

          availableStock,
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================================
     * CREATE / UPDATE
     * ==========================================================
     */

    const item = existingItem
      ? await db.cartItem.update({
          where: {
            id: existingItem.id,
          },

          data: {
            quantity: newQuantity,
          },
        })
      : await db.cartItem.create({
          data: {
            cartId: cart.id,

            productId,

            variantId,

            quantity,
          },
        });

    /*
     * ==========================================================
     * RESPONSE
     * ==========================================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Товар додано до кошика.",

        item: {
          id: item.id,

          productId: item.productId,

          variantId: item.variantId,

          quantity: item.quantity,
        },
      },
      {
        status: existingItem
          ? 200
          : 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/cart error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error: "INTERNAL_SERVER_ERROR",

        message:
          "Не вдалося додати товар до кошика.",
      },
      { status: 500 }
    );
  }
}