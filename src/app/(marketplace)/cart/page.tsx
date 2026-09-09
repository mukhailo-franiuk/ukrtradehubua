"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  AlertCircle,
  RefreshCw,
  Store,
  Package,
  ShieldCheck,
  Truck,
  CreditCard,
  ChevronRight,
} from "lucide-react";

import {
  clearGuestCart,
  getGuestCart,
  updateGuestCartQuantity,
  removeGuestCartItem,
  type GuestCartItem,
} from "@/lib/guest-cart";

// =====================================================
// TYPES
// =====================================================

type CartImage = {
  url: string;
  alt: string;
};

type CartShop = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  sellerStatus?: string;
};

type CartProduct = {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  oldPrice: number | null;
  availableStock: number;
  image: CartImage | null;
  shop: CartShop | null;
};

type CartVariant = {
  id: string;
  title: string;
};

type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: CartProduct;
  variant: CartVariant | null;
};

type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
  itemsCount: number;
  subtotal: number;
  oldSubtotal: number;
  discount: number;
  total: number;
};

type CartResponse = {
  success: boolean;
  cart?: Cart;
  message?: string;
  error?: string;
};

type CartItemResponse = {
  success: boolean;
  data?: CartItem;
  message?: string;
  error?: string;
  availableStock?: number;
};

type AuthResponse = {
  success?: boolean;
  user?: unknown;
};

type ProductApiImage = {
  id?: string;
  url?: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

type ProductApiVariant = {
  id?: string;
  title?: string | null;
  name?: string | null;
};

type ProductApiShop = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  isActive?: boolean;
  sellerStatus?: string;
};

type ProductApiProduct = {
  id?: string;
  title?: string;
  slug?: string;
  status?: string;
  price?: number | string;
  oldPrice?: number | string | null;
  stock?: number;
  reservedStock?: number;
  availableStock?: number;
  images?: ProductApiImage[];
  variants?: ProductApiVariant[];
  shop?: ProductApiShop | null;
};

type ProductsApiResponse = {
  success?: boolean;
  products?: ProductApiProduct[];
  data?: ProductApiProduct[];
  product?: ProductApiProduct;
};

// =====================================================
// HELPERS
// =====================================================

function formatPrice(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(value);
}

function toNumber(
  value: number | string | null | undefined,
  fallback = 0
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function getAvailableStock(
  product: ProductApiProduct
) {
  if (
    typeof product.availableStock === "number"
  ) {
    return Math.max(
      0,
      Math.floor(product.availableStock)
    );
  }

  const stock =
    typeof product.stock === "number"
      ? product.stock
      : 0;

  const reservedStock =
    typeof product.reservedStock === "number"
      ? product.reservedStock
      : 0;

  return Math.max(
    0,
    Math.floor(
      stock - reservedStock
    )
  );
}

function getPrimaryImage(
  product: ProductApiProduct
): CartImage | null {
  if (
    !Array.isArray(product.images) ||
    product.images.length === 0
  ) {
    return null;
  }

  const primary =
    product.images.find(
      (image) =>
        image.isPrimary === true
    ) ??
    [...product.images].sort(
      (a, b) =>
        (a.sortOrder ?? 0) -
        (b.sortOrder ?? 0)
    )[0];

  if (
    !primary ||
    typeof primary.url !== "string" ||
    !primary.url
  ) {
    return null;
  }

  return {
    url:
      primary.thumbnailUrl ||
      primary.url,
    alt:
      primary.alt ||
      product.title ||
      "Товар",
  };
}

function normalizeProduct(
  product: ProductApiProduct
): CartProduct | null {
  if (
    typeof product.id !== "string" ||
    !product.id ||
    typeof product.title !== "string" ||
    !product.title ||
    typeof product.slug !== "string" ||
    !product.slug
  ) {
    return null;
  }

  return {
    id: product.id,


    title: product.title,

    slug: product.slug,

    status:
      typeof product.status === "string"
        ? product.status
        : "ACTIVE",

    price: toNumber(
      product.price
    ),

    oldPrice:
      product.oldPrice === null ||
        product.oldPrice === undefined
        ? null
        : toNumber(
          product.oldPrice,
          0
        ),

    availableStock:
      getAvailableStock(product),

    image:
      getPrimaryImage(product),

    shop:
      product.shop &&
        typeof product.shop.id ===
        "string" &&
        typeof product.shop.name ===
        "string" &&
        typeof product.shop.slug ===
        "string"
        ? {
          id: product.shop.id,
          name: product.shop.name,
          slug: product.shop.slug,
          isActive:
            product.shop.isActive,
          sellerStatus:
            product.shop.sellerStatus,
        }
        : null,


  };
}

function getProductsFromResponse(
  data: ProductsApiResponse
) {
  if (
    Array.isArray(data.products)
  ) {
    return data.products;
  }

  if (
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  if (data.product) {
    return [data.product];
  }

  return [];
}

// =====================================================
// CALCULATIONS
// =====================================================

function calculateTotals(
  items: CartItem[]
) {
  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        item.product.price *
        item.quantity,
      0
    );

  const oldSubtotal =
    items.reduce(
      (sum, item) =>
        sum +
        (item.product.oldPrice ??
          item.product.price) *
        item.quantity,
      0
    );

  const discount =
    Math.max(
      0,
      oldSubtotal -
      subtotal
    );

  const itemsCount =
    items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  return {
    subtotal,
    oldSubtotal,
    discount,
    total: subtotal,
    itemsCount,
  };
}

function recalculateCart(
  cart: Cart
): Cart {
  return {
    ...cart,
    ...calculateTotals(
      cart.items
    ),
  };
}

// =====================================================
// UKRAINIAN PLURAL
// =====================================================

function getItemWord(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "товарів";
  }

  if (last === 1) {
    return "товар";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "товари";
  }

  return "товарів";
}

// =====================================================
// PAGE
// =====================================================

export default function CartPage() {
  const [cart, setCart] =
    useState<Cart | null>(null);

  const [isGuest, setIsGuest] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  // ===================================================
  // BUILD GUEST CART
  // ===================================================

  const buildGuestCart =
    useCallback(async () => {
      const guestItems =
        getGuestCart();


      setIsGuest(true);

      if (
        guestItems.length === 0
      ) {
        setCart(
          recalculateCart({
            id: "guest-cart",
            userId: "guest",
            items: [],
            itemsCount: 0,
            subtotal: 0,
            oldSubtotal: 0,
            discount: 0,
            total: 0,
          })
        );

        return;
      }

      /*
       * Guest cart зберігає тільки:
       *
       * productId
       * variantId
       * quantity
       *
       * Тому тут завантажуємо
       * актуальні дані товарів.
       */

      const uniqueProductIds =
        Array.from(
          new Set(
            guestItems.map(
              (item) =>
                item.productId
            )
          )
        );

      const productResults =
        await Promise.all(
          uniqueProductIds.map(
            async (productId) => {
              try {
                const response =
                  await fetch(
                    `/api/products/${encodeURIComponent(
                      productId
                    )}`,
                    {
                      method: "GET",
                      cache:
                        "no-store",
                    }
                  );

                if (
                  response.ok
                ) {
                  const data =
                    (await response.json()) as ProductsApiResponse;

                  const products =
                    getProductsFromResponse(
                      data
                    );

                  return (
                    products[0] ??
                    null
                  );
                }
              } catch (error) {
                console.error(
                  "Guest product load error:",
                  productId,
                  error
                );
              }

              return null;
            }
          )
        );

      /*
       * Якщо API по ID не підтримує
       * такий маршрут, пробуємо
       * універсальний /api/products
       * для кожного товару.
       */

      const productsById =
        new Map<
          string,
          ProductApiProduct
        >();

      for (
        let index = 0;
        index <
        uniqueProductIds.length;
        index++
      ) {
        const product =
          productResults[index];

        if (
          product &&
          typeof product.id ===
          "string"
        ) {
          productsById.set(
            product.id,
            product
          );
        }
      }

      /*
       * Fallback через /api/products
       * якщо /api/products/[id]
       * не повернув товар.
       */

      const missingIds =
        uniqueProductIds.filter(
          (id) =>
            !productsById.has(id)
        );

      if (
        missingIds.length > 0
      ) {
        await Promise.all(
          missingIds.map(
            async (productId) => {
              try {
                const response =
                  await fetch(
                    `/api/products?productId=${encodeURIComponent(
                      productId
                    )}`,
                    {
                      method: "GET",
                      cache:
                        "no-store",
                    }
                  );

                if (
                  !response.ok
                ) {
                  return;
                }

                const data =
                  (await response.json()) as ProductsApiResponse;

                const products =
                  getProductsFromResponse(
                    data
                  );

                const product =
                  products.find(
                    (item) =>
                      item.id ===
                      productId
                  );

                if (
                  product &&
                  typeof product.id ===
                  "string"
                ) {
                  productsById.set(
                    product.id,
                    product
                  );
                }
              } catch (error) {
                console.error(
                  "Guest product fallback error:",
                  productId,
                  error
                );
              }
            }
          )
        );
      }

      const items: CartItem[] =
        [];

      const invalidIds: string[] =
        [];

      for (
        const guestItem of guestItems
      ) {
        const apiProduct =
          productsById.get(
            guestItem.productId
          );

        const product =
          apiProduct
            ? normalizeProduct(
              apiProduct
            )
            : null;

        if (!product) {
          invalidIds.push(
            guestItem.id
          );
          continue;
        }

        let variant:
          | CartVariant
          | null = null;

        if (
          guestItem.variantId &&
          Array.isArray(
            apiProduct?.variants
          )
        ) {
          const apiVariant =
            apiProduct.variants.find(
              (item) =>
                item.id ===
                guestItem.variantId
            );

          if (apiVariant) {
            variant = {
              id:
                apiVariant.id ??
                guestItem.variantId,

              title:
                apiVariant.title ||
                apiVariant.name ||
                "Варіант",
            };
          }
        }

        items.push({
          id: guestItem.id,
          productId:
            guestItem.productId,
          variantId:
            guestItem.variantId,
          quantity:
            guestItem.quantity,
          product,
          variant,
        });
      }

      /*
       * Якщо товар був видалений
       * з бази — прибираємо його
       * з guest cart.
       */

      if (
        invalidIds.length > 0
      ) {
        let current =
          getGuestCart();

        current =
          current.filter(
            (item) =>
              !invalidIds.includes(
                item.id
              )
          );

        /*
         * Не викликаємо saveGuestCart
         * тут, щоб не створювати
         * зайвих storage events.
         */

        if (
          current.length === 0
        ) {
          clearGuestCart();
        } else {
          window.localStorage.setItem(
            "ukrtradehub_guest_cart",
            JSON.stringify(
              current
            )
          );
        }
      }

      /*
       * Перевіряємо залишки.
       *
       * Якщо quantity більша
       * за актуальний stock —
       * обмежуємо її.
       */

      const normalizedItems =
        items
          .map((item) => {
            const maxStock =
              item.product
                .availableStock;

            if (
              maxStock <= 0
            ) {
              return {
                ...item,
                quantity:
                  item.quantity,
              };
            }

            if (
              item.quantity >
              maxStock
            ) {
              return {
                ...item,
                quantity:
                  maxStock,
              };
            }

            return item;
          });

      setCart(
        recalculateCart({
          id: "guest-cart",
          userId: "guest",
          items:
            normalizedItems,
          itemsCount: 0,
          subtotal: 0,
          oldSubtotal: 0,
          discount: 0,
          total: 0,
        })
      );
    }, []);


  // ===================================================
  // SYNC GUEST CART TO USER
  // ===================================================

  const syncGuestCartToUser =
    useCallback(async () => {
      const guestItems =
        getGuestCart();


      if (
        guestItems.length === 0
      ) {
        return true;
      }

      for (
        const item of guestItems
      ) {
        try {
          const response =
            await fetch(
              "/api/cart",
              {
                method: "POST",
                credentials:
                  "include",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  productId:
                    item.productId,
                  variantId:
                    item.variantId,
                  quantity:
                    item.quantity,
                }),
              }
            );

          const data: CartResponse =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            console.error(
              "Guest cart sync failed:",
              data
            );

            return false;
          }
        } catch (error) {
          console.error(
            "Guest cart sync error:",
            error
          );

          return false;
        }
      }

      clearGuestCart();

      return true;
    }, []);


  // ===================================================
  // LOAD CART
  // ===================================================

  const loadCart =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);


        const authResponse =
          await fetch(
            "/api/auth/me",
            {
              method: "GET",
              credentials:
                "include",
              cache: "no-store",
            }
          );

        let authenticated =
          false;

        if (
          authResponse.ok
        ) {
          const authData: AuthResponse =
            await authResponse.json();

          authenticated =
            Boolean(
              authData.user
            );
        }

        // =============================================
        // GUEST
        // =============================================

        if (!authenticated) {
          await buildGuestCart();
          return;
        }

        // =============================================
        // AUTHENTICATED
        // =============================================

        setIsGuest(false);

        await syncGuestCartToUser();

        const response =
          await fetch(
            "/api/cart",
            {
              method: "GET",
              credentials:
                "include",
              cache: "no-store",
            }
          );

        const data: CartResponse =
          await response.json();

        if (
          response.status === 401
        ) {
          await buildGuestCart();
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
            data.error ||
            "Не вдалося завантажити кошик."
          );
        }

        if (!data.cart) {
          throw new Error(
            "Сервер не повернув дані кошика."
          );
        }

        setCart(data.cart);
      } catch (err) {
        console.error(
          "Cart load error:",
          err
        );

        /*
         * Якщо guest cart є,
         * не показуємо помилку —
         * пробуємо відновити його.
         */

        const guestItems =
          getGuestCart();

        if (
          guestItems.length > 0
        ) {
          try {
            await buildGuestCart();
            setError(null);
          } catch (guestError) {
            console.error(
              "Guest cart rebuild error:",
              guestError
            );

            setError(
              err instanceof Error
                ? err.message
                : "Не вдалося завантажити кошик."
            );
          }
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося завантажити кошик."
          );
        }
      } finally {
        setLoading(false);
      }
    }, [
      buildGuestCart,
      syncGuestCartToUser,
    ]);


  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  // ===================================================
  // GUEST STORAGE EVENTS
  // ===================================================

  useEffect(() => {
    const handleGuestCartUpdate =
      () => {
        if (!isGuest) {
          return;
        }

        void buildGuestCart();
      };

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key ===
        "ukrtradehub_guest_cart"
      ) {
        if (isGuest) {
          void buildGuestCart();
        }
      }
    };

    window.addEventListener(
      "ukrtradehub:cart-updated",
      handleGuestCartUpdate
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "ukrtradehub:cart-updated",
        handleGuestCartUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };


  }, [
    isGuest,
    buildGuestCart,
  ]);

  // ===================================================
  // UPDATE QUANTITY
  // ===================================================

  const updateQuantity =
    async (
      item: CartItem,
      nextQuantity: number
    ) => {
      if (
        updatingId ||
        deletingId
      ) {
        return;
      }


      if (
        nextQuantity < 1
      ) {
        return;
      }

      if (
        nextQuantity >
        item.product.availableStock
      ) {
        setError(
          `Доступно лише ${item.product.availableStock} шт.`
        );

        return;
      }

      // ===============================================
      // GUEST
      // ===============================================

      if (isGuest) {
        setUpdatingId(item.id);
        setError(null);

        try {
          updateGuestCartQuantity(
            item.id,
            nextQuantity
          );

          await buildGuestCart();
        } catch (err) {
          console.error(
            "Guest cart quantity update error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося змінити кількість."
          );
        } finally {
          setUpdatingId(null);
        }

        return;
      }

      // ===============================================
      // AUTHENTICATED
      // ===============================================

      try {
        setUpdatingId(item.id);
        setError(null);

        const response =
          await fetch(
            `/api/cart/${encodeURIComponent(
              item.id
            )}`,
            {
              method: "PATCH",
              credentials:
                "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                quantity:
                  nextQuantity,
              }),
            }
          );

        const data: CartItemResponse =
          await response.json();

        if (
          response.status === 401
        ) {
          await buildGuestCart();
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          setError(
            data.message ||
            data.error ||
            "Не вдалося змінити кількість."
          );

          await loadCart();

          return;
        }

        if (data.data) {
          setCart(
            (current) => {
              if (!current) {
                return current;
              }

              const updatedItems =
                current.items.map(
                  (currentItem) =>
                    currentItem.id ===
                      item.id
                      ? data.data!
                      : currentItem
                );

              return recalculateCart({
                ...current,
                items:
                  updatedItems,
              });
            }
          );
        } else {
          await loadCart();
        }
      } catch (err) {
        console.error(
          "Cart quantity update error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося змінити кількість."
        );

        await loadCart();
      } finally {
        setUpdatingId(null);
      }
    };


  // ===================================================
  // DELETE ITEM
  // ===================================================

  const deleteItem =
    async (
      itemId: string
    ) => {
      if (
        deletingId ||
        updatingId
      ) {
        return;
      }


      // ===============================================
      // GUEST
      // ===============================================

      if (isGuest) {
        setDeletingId(itemId);
        setError(null);

        try {
          removeGuestCartItem(
            itemId
          );

          await buildGuestCart();
        } catch (err) {
          console.error(
            "Guest cart delete error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Не вдалося видалити товар."
          );
        } finally {
          setDeletingId(null);
        }

        return;
      }

      // ===============================================
      // AUTHENTICATED
      // ===============================================

      try {
        setDeletingId(itemId);
        setError(null);

        const response =
          await fetch(
            `/api/cart/${encodeURIComponent(
              itemId
            )}`,
            {
              method: "DELETE",
              credentials:
                "include",
            }
          );

        const data: CartItemResponse =
          await response.json();

        if (
          response.status === 401
        ) {
          await buildGuestCart();
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
            data.error ||
            "Не вдалося видалити товар."
          );
        }

        setCart(
          (current) => {
            if (!current) {
              return current;
            }

            const updatedItems =
              current.items.filter(
                (item) =>
                  item.id !==
                  itemId
              );

            return recalculateCart({
              ...current,
              items:
                updatedItems,
            });
          }
        );
      } catch (err) {
        console.error(
          "Cart delete error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося видалити товар."
        );

        await loadCart();
      } finally {
        setDeletingId(null);
      }
    };


  // ===================================================
  // CALCULATED
  // ===================================================

  const calculated =
    useMemo(() => {
      if (!cart) {
        return {
          subtotal: 0,
          oldSubtotal: 0,
          discount: 0,
          total: 0,
          itemsCount: 0,
        };
      }


      return calculateTotals(
        cart.items
      );
    }, [cart]);


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (<main className="min-h-screen bg-[#050505] text-white"> <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4"> <div className="flex flex-col items-center gap-4 text-zinc-400"> <Loader2 className="h-8 w-8 animate-spin text-amber-400" />


      <p>
        Завантажуємо ваш кошик...
      </p>
    </div>
    </div>
    </main>
    );


  }

  // ===================================================
  // ERROR
  // ===================================================

  if (
    error &&
    !cart
  ) {
    return (<main className="min-h-screen bg-[#050505] text-white"> <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4"> <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl"> <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10"> <AlertCircle className="h-8 w-8 text-red-400" /> </div>

      ```
      <h1 className="text-2xl font-bold">
        Не вдалося завантажити кошик
      </h1>

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {error}
      </p>

      <button
        type="button"
        onClick={() =>
          void loadCart()
        }
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
      >
        <RefreshCw className="h-4 w-4" />
        Спробувати ще раз
      </button>
    </div>
    </div>
    </main>
    );


  }

  // ===================================================
  // EMPTY
  // ===================================================

  if (
    !cart ||
    cart.items.length === 0
  ) {
    return (<main className="min-h-screen bg-[#050505] text-white"> <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"> <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
    > <ArrowLeft className="h-4 w-4" />
      Продовжити покупки </Link>

      ```
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="max-w-lg text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
            <ShoppingBag className="h-10 w-10 text-zinc-500" />
          </div>

          <h1 className="mt-7 text-3xl font-black tracking-tight sm:text-4xl">
            Кошик порожній
          </h1>

          <p className="mt-4 text-base leading-7 text-zinc-400">
            Додайте товари, які вам
            сподобалися, і вони
            з&apos;являться тут.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-7 py-4 font-bold text-black transition hover:bg-amber-300"
          >
            Перейти до покупок
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
    </main>
    );


  }

  // ===================================================
  // CART
  // ===================================================

  return (<main className="min-h-screen bg-[#050505] text-white"> <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    {/* HEADER */}

    <div className="mb-8">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Продовжити покупки
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
              <ShoppingBag className="h-5 w-5 text-amber-400" />
            </div>

            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              UkrTradeHub
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Мій кошик
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {calculated.itemsCount}{" "}
            {getItemWord(
              calculated.itemsCount
            )}

            {isGuest && (
              <span className="ml-2 text-amber-400/70">
                • кошик гостя
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadCart()
          }
          disabled={
            loading ||
            !!updatingId ||
            !!deletingId
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Оновити
        </button>
      </div>
    </div>

    {/* GUEST NOTICE */}

    {isGuest && (
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-amber-200">
            Ви переглядаєте кошик гостя
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Товари зберігаються у вашому
            браузері. Після входу вони
            будуть перенесені у ваш акаунт.
          </p>
        </div>

        <Link
          href="/login?redirect=%2Fcart"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300"
        >
          Увійти
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    )}

    {/* ERROR */}

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

        <div className="min-w-0">
          <p className="font-medium text-red-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="mt-1 text-xs text-red-400 underline underline-offset-2 hover:text-red-300"
          >
            Закрити
          </button>
        </div>
      </div>
    )}

    {/* CONTENT */}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">

      {/* ITEMS */}

      <section className="space-y-4">
        {cart.items.map(
          (item) => {
            const isUpdating =
              updatingId ===
              item.id;

            const isDeleting =
              deletingId ===
              item.id;

            const unitPrice =
              item.product.price;

            const oldPrice =
              item.product.oldPrice;

            const itemTotal =
              unitPrice *
              item.quantity;

            const itemOldTotal =
              (oldPrice ??
                unitPrice) *
              item.quantity;

            return (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition hover:border-white/15 hover:bg-white/[0.04]"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex gap-4 sm:gap-5">

                    {/* IMAGE */}

                    <Link
                      href={`/products/${item.product.slug}`}
                      className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.04] sm:h-36 sm:w-36"
                    >
                      {item.product.image ? (
                        <img
                          src={
                            item.product
                              .image.url
                          }
                          alt={
                            item.product
                              .image.alt
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-10 w-10 text-zinc-700" />
                        </div>
                      )}
                    </Link>

                    {/* INFO */}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="line-clamp-2 text-base font-bold leading-6 text-white transition hover:text-amber-300 sm:text-lg"
                          >
                            {
                              item.product.title
                            }
                          </Link>

                          {item.variant && (
                            <p className="mt-1 text-sm text-zinc-500">
                              Варіант:{" "}
                              <span className="text-zinc-300">
                                {
                                  item.variant.title
                                }
                              </span>
                            </p>
                          )}
                        </div>

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={() =>
                            void deleteItem(
                              item.id
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting
                          }
                          aria-label="Видалити товар"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* SHOP */}

                      {item.product.shop && (
                        <Link
                          href={`/shops/${item.product.shop.slug}`}
                          className="mt-3 inline-flex max-w-full items-center gap-2 text-sm text-zinc-500 transition hover:text-amber-300"
                        >
                          <Store className="h-4 w-4 shrink-0" />

                          <span className="truncate">
                            {
                              item.product
                                .shop.name
                            }
                          </span>
                        </Link>
                      )}

                      {/* BOTTOM */}

                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                        {/* PRICE */}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-white">
                              {formatPrice(
                                unitPrice
                              )}
                            </span>

                            {oldPrice !==
                              null &&
                              oldPrice >
                              unitPrice && (
                                <span className="text-sm text-zinc-600 line-through">
                                  {formatPrice(
                                    oldPrice
                                  )}
                                </span>
                              )}
                          </div>

                          {oldPrice !==
                            null &&
                            oldPrice >
                            unitPrice && (
                              <span className="mt-1 inline-block text-xs font-semibold text-emerald-400">
                                Економія{" "}
                                {formatPrice(
                                  oldPrice -
                                  unitPrice
                                )}
                              </span>
                            )}
                        </div>

                        {/* QUANTITY */}

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="flex items-center rounded-xl border border-white/10 bg-black/30">
                            <button
                              type="button"
                              onClick={() =>
                                void updateQuantity(
                                  item,
                                  item.quantity -
                                  1
                                )
                              }
                              disabled={
                                item.quantity <=
                                1 ||
                                isUpdating ||
                                isDeleting
                              }
                              className="flex h-10 w-10 items-center justify-center text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Зменшити кількість"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <div className="flex h-10 min-w-10 items-center justify-center border-x border-white/10 px-2 text-sm font-bold">
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                              ) : (
                                item.quantity
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void updateQuantity(
                                  item,
                                  item.quantity +
                                  1
                                )
                              }
                              disabled={
                                item.quantity >=
                                item
                                  .product
                                  .availableStock ||
                                isUpdating ||
                                isDeleting
                              }
                              className="flex h-10 w-10 items-center justify-center text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Збільшити кількість"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          {/* TOTAL */}

                          <div className="min-w-[110px] text-right">
                            <p className="text-lg font-black text-white">
                              {formatPrice(
                                itemTotal
                              )}
                            </p>

                            {itemOldTotal >
                              itemTotal && (
                                <p className="text-xs text-zinc-600 line-through">
                                  {formatPrice(
                                    itemOldTotal
                                  )}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* STOCK */}

                      <div className="mt-3 flex items-center gap-2 text-xs">
                        {item.product
                          .availableStock >
                          0 ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                            <span className="text-zinc-500">
                              В наявності:{" "}
                              {
                                item.product
                                  .availableStock
                              }{" "}
                              шт.
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                            <span className="text-red-400">
                              Немає в наявності
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          }
        )}
      </section>

      {/* SUMMARY */}

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl">

          <div className="border-b border-white/10 p-6">
            <h2 className="text-xl font-black">
              Підсумок замовлення
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {calculated.itemsCount}{" "}
              {getItemWord(
                calculated.itemsCount
              )}
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                Товари
              </span>

              <span className="font-medium text-zinc-200">
                {formatPrice(
                  calculated.subtotal
                )}
              </span>
            </div>

            {calculated.discount >
              0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    Знижка
                  </span>

                  <span className="font-semibold text-emerald-400">
                    −
                    {formatPrice(
                      calculated.discount
                    )}
                  </span>
                </div>
              )}

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-500">
                Доставка
              </span>

              <span className="text-right font-medium text-emerald-400">
                Розраховується при оформленні
              </span>
            </div>

            <div className="my-5 h-px bg-white/10" />

            <div className="flex items-end justify-between gap-4">
              <span className="text-base font-semibold text-zinc-300">
                Разом
              </span>

              <div className="text-right">
                <p className="text-3xl font-black tracking-tight text-white">
                  {formatPrice(
                    calculated.total
                  )}
                </p>

                {calculated.discount >
                  0 && (
                    <p className="mt-1 text-xs text-zinc-600 line-through">
                      {formatPrice(
                        calculated.oldSubtotal
                      )}
                    </p>
                  )}
              </div>
            </div>

            {/* CHECKOUT */}

            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 font-black text-black transition hover:bg-amber-300 active:scale-[0.99]"
            >
              Оформити замовлення
              <ChevronRight className="h-5 w-5" />
            </Link>

            <p className="text-center text-xs leading-5 text-zinc-600">
              Перевірка адреси, доставки
              та способу оплати буде
              виконана під час оформлення.
            </p>
          </div>

          {/* BENEFITS */}

          <div className="border-t border-white/10 bg-black/20 p-6">
            <div className="space-y-4">

              <Benefit
                icon={
                  <ShieldCheck className="h-4 w-4" />
                }
                title="Безпечна покупка"
                text="Захист покупця UkrTradeHub"
              />

              <Benefit
                icon={
                  <Truck className="h-4 w-4" />
                }
                title="Зручна доставка"
                text="Нова пошта, Укрпошта та інші"
              />

              <Benefit
                icon={
                  <CreditCard className="h-4 w-4" />
                }
                title="Безпечна оплата"
                text="Кілька способів оплати"
              />

            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
  </main>


  );
}

// =====================================================
// BENEFIT
// =====================================================

function Benefit({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (<div className="flex items-start gap-3"> <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
    {icon} </div>


    <div className="min-w-0">
      <p className="text-sm font-semibold text-zinc-200">
        {title}
      </p>

      <p className="mt-0.5 text-xs text-zinc-600">
        {text}
      </p>
    </div>
  </div>


  );
}
