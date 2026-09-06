
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    // =========================================================
    // ADMIN AUTH
    // =========================================================

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Не авторизовано",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // PARAMS
    // =========================================================

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID товару не вказано",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // PRODUCT
    // =========================================================

    const product = await db.product.findUnique({
      where: {
        id,
      },

      include: {
        // -----------------------------------------------------
        // SHOP
        // -----------------------------------------------------

        shop: {
          select: {
            id: true,
            userId: true,
            name: true,
            slug: true,
            sellerStatus: true,

            // Продавець магазину
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                isBlocked: true,
              },
            },
          },
        },

        // -----------------------------------------------------
        // CATEGORY
        // -----------------------------------------------------

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            icon: true,
            isActive: true,
            sortOrder: true,
          },
        },

        // -----------------------------------------------------
        // BRAND
        // -----------------------------------------------------

        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        // -----------------------------------------------------
        // IMAGES
        // -----------------------------------------------------

        images: {
          orderBy: {
            sortOrder: "asc",
          },

          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            alt: true,
            width: true,
            height: true,
            sortOrder: true,
            isPrimary: true,
          },
        },

        // -----------------------------------------------------
        // SEO
        // -----------------------------------------------------

        seo: {
          select: {
            id: true,
            title: true,
            description: true,
            keywords: true,
            canonical: true,
          },
        },
      },
    });

    // =========================================================
    // NOT FOUND
    // =========================================================

    if (!product) {
      return NextResponse.json(
        {
          error: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================
    // SELLER / SHOP MODERATION CHECKS
    // =========================================================

    const seller = product.shop?.user ?? null;

    const sellerChecks = {
      exists: Boolean(seller),

      isSellerRole:
        seller?.role === "SELLER",

      isBlocked:
        seller?.isBlocked === true,

      userActive:
        seller?.status === "ACTIVE",

      shopExists:
        Boolean(product.shop),

      shopSellerStatus:
        product.shop?.sellerStatus ?? null,

      shopSellerStatusAllowed:
        product.shop?.sellerStatus === "ACTIVE",
    };

    // =========================================================
    // OVERALL SELLER STATUS
    // =========================================================

    const sellerCanSell =
      sellerChecks.exists &&
      sellerChecks.isSellerRole &&
      !sellerChecks.isBlocked &&
      sellerChecks.userActive &&
      sellerChecks.shopExists &&
      sellerChecks.shopSellerStatusAllowed;

    // =========================================================
    // MODERATION SUMMARY
    // =========================================================

    const moderation = {
      product: {
        id: product.id,
        title: product.title,
        status: product.status,
      },

      seller: {
        id: seller?.id ?? null,
        name: seller?.name ?? null,
        email: seller?.email ?? null,
        phone: seller?.phone ?? null,
        role: seller?.role ?? null,
        status: seller?.status ?? null,
        isBlocked: seller?.isBlocked ?? false,
      },

      shop: {
        id: product.shop?.id ?? null,
        userId: product.shop?.userId ?? null,
        name: product.shop?.name ?? null,
        slug: product.shop?.slug ?? null,
        sellerStatus:
          product.shop?.sellerStatus ?? null,
      },

      checks: sellerChecks,

      sellerCanSell,
    };

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json(
      {
        product,

        seller: seller
          ? {
              id: seller.id,
              name: seller.name,
              email: seller.email,
              phone: seller.phone,
              role: seller.role,
              status: seller.status,
              isBlocked: seller.isBlocked,
            }
          : null,

        shop: product.shop
          ? {
              id: product.shop.id,
              userId: product.shop.userId,
              name: product.shop.name,
              slug: product.shop.slug,
              sellerStatus: product.shop.sellerStatus,
            }
          : null,

        moderation,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/admin/products/[id]/moderation error:",
      error
    );

    return NextResponse.json(
      {
        error: "Не вдалося отримати дані для модерації товару",
      },
      {
        status: 500,
      }
    );
  }
}