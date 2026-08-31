import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// GET /api/products
// =====================================================
// Публічний список товарів
//
// Підтримує:
// ?page=1
// ?limit=20
// ?search=iphone
// ?category=slug
// ?shop=slug
// ?brand=slug
// ?status=ACTIVE
// ?minPrice=100
// ?maxPrice=5000
// ?featured=true
// ?isNew=true
// ?sort=newest
// ?sort=price_asc
// ?sort=price_desc
// ?sort=rating
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(
      Number(searchParams.get("page") || "1"),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || "20"),
        1
      ),
      100
    );

    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const shop = searchParams.get("shop")?.trim() || "";
    const brand = searchParams.get("brand")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "ACTIVE";

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const featured = searchParams.get("featured");
    const isNew = searchParams.get("isNew");

    const sort = searchParams.get("sort") || "newest";

    const where: any = {
      status: status as any,
      shop: {
        isActive: true,
        sellerStatus: "ACTIVE",
      },
    };

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          sku: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // -------------------------------------------------
    // CATEGORY
    // -------------------------------------------------

    if (category) {
      where.category = {
        slug: category,
        isActive: true,
      };
    }

    // -------------------------------------------------
    // SHOP
    // -------------------------------------------------

    if (shop) {
      where.shop = {
        ...where.shop,
        slug: shop,
      };
    }

    // -------------------------------------------------
    // BRAND
    // -------------------------------------------------

    if (brand) {
      where.brand = {
        slug: brand,
        isActive: true,
      };
    }

    // -------------------------------------------------
    // PRICE
    // -------------------------------------------------

    if (minPrice || maxPrice) {
      where.price = {};

      if (minPrice) {
        const value = Number(minPrice);

        if (!Number.isNaN(value)) {
          where.price.gte = value;
        }
      }

      if (maxPrice) {
        const value = Number(maxPrice);

        if (!Number.isNaN(value)) {
          where.price.lte = value;
        }
      }
    }

    // -------------------------------------------------
    // FEATURED
    // -------------------------------------------------

    if (featured === "true") {
      where.isFeatured = true;
    }

    // -------------------------------------------------
    // NEW
    // -------------------------------------------------

    if (isNew === "true") {
      where.isNew = true;
    }

    // -------------------------------------------------
    // SORT
    // -------------------------------------------------

    let orderBy: any;

    switch (sort) {
      case "price_asc":
        orderBy = {
          price: "asc",
        };
        break;

      case "price_desc":
        orderBy = {
          price: "desc",
        };
        break;

      case "rating":
        orderBy = {
          rating: "desc",
        };
        break;

      case "popular":
        orderBy = {
          salesCount: "desc",
        };
        break;

      case "views":
        orderBy = {
          viewsCount: "desc",
        };
        break;

      case "newest":
      default:
        orderBy = {
          createdAt: "desc",
        };
        break;
    }

    const skip = (page - 1) * limit;

    // -------------------------------------------------
    // QUERY
    // -------------------------------------------------

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,

        skip,
        take: limit,

        orderBy,

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
              sellerStatus: true,
              isActive: true,

              logo: {
                select: {
                  url: true,
                  alt: true,
                },
              },
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
        },
      }),

      db.product.count({
        where,
      }),
    ]);

    // -------------------------------------------------
    // PAGINATION
    // -------------------------------------------------

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,

      data: products,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати товари",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/products
// =====================================================
// Створення товару.
//
// Доступ:
// SELLER
// ADMIN
//
// Авторизація через session_token.
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------
    // SESSION
    // -------------------------------------------------

    const token = request.cookies.get("session_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідно увійти в систему",
        },
        {
          status: 401,
        }
      );
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
      return NextResponse.json(
        {
          success: false,
          message: "Сесія недійсна",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------
    // EXPIRED SESSION
    // -------------------------------------------------

    if (session.expiresAt < new Date()) {
      await db.session.delete({
        where: {
          id: session.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Сесія закінчилася",
        },
        {
          status: 401,
        }
      );
    }

    const user = session.user;

    // -------------------------------------------------
    // ROLE
    // -------------------------------------------------

    if (
      user.role !== "SELLER" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Недостатньо прав",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------
    // BLOCKED USER
    // -------------------------------------------------

    if (
      user.isBlocked ||
      user.status === "BLOCKED" ||
      user.status === "SUSPENDED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ваш акаунт заблокований або призупинений",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------
    // SELLER SHOP
    // -------------------------------------------------

    if (
      user.role === "SELLER" &&
      (!user.shop ||
        user.shop.sellerStatus !== "ACTIVE" ||
        !user.shop.isActive)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ваш магазин ще не активований",
        },
        {
          status: 403,
        }
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

      images,
      attributes,
      variants,

      seo,
    } = body;

    // -------------------------------------------------
    // REQUIRED
    // -------------------------------------------------

    if (!title || !slug || !categoryId || price === undefined) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Поля title, slug, categoryId та price є обов'язковими",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // SHOP
    // -------------------------------------------------

    let shopId: string | undefined;

    if (user.role === "SELLER") {
      shopId = user.shop?.id;
    }

    if (user.role === "ADMIN") {
      if (!body.shopId) {
        return NextResponse.json(
          {
            success: false,
            message: "Для ADMIN необхідно передати shopId",
          },
          {
            status: 400,
          }
        );
      }

      shopId = body.shopId;
    }

    if (!shopId) {
      return NextResponse.json(
        {
          success: false,
          message: "Магазин не знайдено",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // CHECK SHOP
    // -------------------------------------------------

    const shop = await db.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          message: "Магазин не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // CHECK CATEGORY
    // -------------------------------------------------

    const categoryExists = await db.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!categoryExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Категорію не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // CHECK SLUG
    // -------------------------------------------------

    const existingSlug = await db.product.findUnique({
      where: {
        slug,
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Товар з таким slug вже існує",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // CHECK SKU
    // -------------------------------------------------

    if (sku) {
      const existingSku = await db.product.findUnique({
        where: {
          sku,
        },
      });

      if (existingSku) {
        return NextResponse.json(
          {
            success: false,
            message: "Товар з таким SKU вже існує",
          },
          {
            status: 409,
          }
        );
      }
    }

    // -------------------------------------------------
    // CREATE PRODUCT
    // -------------------------------------------------

    const product = await db.product.create({
      data: {
        shopId,
        categoryId,
        brandId: brandId || null,

        title,
        slug,
        description: description || null,
        shortDescription: shortDescription || null,

        sku: sku || null,

        price,
        oldPrice: oldPrice ?? null,

        stock: Number(stock ?? 0),
        reservedStock: Number(reservedStock ?? 0),

        status: status || "DRAFT",

        weight: weight ?? null,
        length: length ?? null,
        width: width ?? null,
        height: height ?? null,

        isFeatured: Boolean(isFeatured ?? false),
        isNew: Boolean(isNew ?? false),

        images:
          Array.isArray(images) && images.length > 0
            ? {
                create: images.map(
                  (
                    image: {
                      url: string;
                      thumbnailUrl?: string;
                      alt?: string;
                      width?: number;
                      height?: number;
                      sortOrder?: number;
                      isPrimary?: boolean;
                    },
                    index: number
                  ) => ({
                    url: image.url,
                    thumbnailUrl:
                      image.thumbnailUrl || null,
                    alt: image.alt || null,
                    width: image.width ?? null,
                    height: image.height ?? null,
                    sortOrder:
                      image.sortOrder ?? index,
                    isPrimary:
                      image.isPrimary ??
                      index === 0,
                  })
                ),
              }
            : undefined,

        seo: seo
          ? {
              create: {
                title: seo.title || null,
                description:
                  seo.description || null,
                keywords:
                  seo.keywords || null,
                canonical:
                  seo.canonical || null,
              },
            }
          : undefined,
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
          },
        },

        seo: true,
      },
    });

    // -------------------------------------------------
    // UPDATE SHOP COUNTER
    // -------------------------------------------------

    await db.shop.update({
      where: {
        id: shopId,
      },

      data: {
        productsCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Товар успішно створено",
        data: product,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error("POST /api/products error:", error);

    // Prisma unique constraint
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "Товар з такими унікальними даними вже існує",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося створити товар",
      },
      {
        status: 500,
      }
    );
  }
}