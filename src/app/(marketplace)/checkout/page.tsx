"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Truck,
  Wallet,
  ArrowLeft,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

type CartItem = {
  id: string;
  quantity: number;
  productId: string;
  variantId: string | null;

  product: {
    id: string;
    title: string;
    slug: string;
    price: number | string;
    oldPrice: number | string | null;
    availableStock: number;
    image: {
      url: string;
      alt: string | null;
    } | null;
    shop: {
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
      sellerStatus: string;
    };
  };

  variant: {
    id: string;
    title: string;
    price: number | string | null;
  } | null;
};

type CartResponse = {
  success: boolean;
  cart?: {
    id: string;
    userId: string;
    items: CartItem[];
    itemsCount: number;
    subtotal: number | string;
    oldSubtotal: number | string;
    discount: number | string;
    total: number | string;
  };
  error?: string;
};

type Address = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  novaPoshtaWarehouse: string | null;
  isDefault: boolean;
};

type ShippingMethod =
  | "NOVA_POSHTA"
  | "UKRPOSHTA"
  | "MIST"
  | "COURIER"
  | "PICKUP";

type PaymentMethod =
  | "CARD"
  | "CASH_ON_DELIVERY"
  | "BANK_TRANSFER"
  | "APPLE_PAY"
  | "GOOGLE_PAY";

type CreatedOrder = {
  id: string;
  orderNumber: string;
  total: number | string;
};

type OrderResponse = {
  success?: boolean;
  ok?: boolean;

  /*
   * Наш API зараз повертає:
   *
   * {
   *   ok: true,
   *   order
   * }
   *
   * Підтримуємо також data для сумісності.
   */
  order?: CreatedOrder;

  data?: CreatedOrder;

  error?: string;
};

type PaymentResponse = {
  success: boolean;

  payment?: {
    id: string;
    status: string;
    method: PaymentMethod;
    provider?: string | null;
    transactionId?: string | null;
  };

  paymentUrl?: string | null;
  appUrl?: string | null;
  redirect?: boolean;
  error?: string;
};

// =====================================================
// OPTIONS
// =====================================================

const SHIPPING_OPTIONS: {
  value: ShippingMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "NOVA_POSHTA",
    label: "Нова пошта",
    description: "Відділення або поштомат",
  },
  {
    value: "UKRPOSHTA",
    label: "Укрпошта",
    description: "Доставка у відділення",
  },
  {
    value: "MIST",
    label: "Meest",
    description: "Відділення або поштомат",
  },
  {
    value: "COURIER",
    label: "Кур'єром",
    description: "Доставка за адресою",
  },
  {
    value: "PICKUP",
    label: "Самовивіз",
    description: "Забрати самостійно",
  },
];

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "CARD",
    label: "Оплата карткою онлайн",
    description: "Visa / Mastercard",
  },
  {
    value: "CASH_ON_DELIVERY",
    label: "Оплата при отриманні",
    description: "Накладений платіж",
  },
  {
    value: "BANK_TRANSFER",
    label: "Банківський переказ",
    description: "Оплата за реквізитами",
  },
  {
    value: "APPLE_PAY",
    label: "Apple Pay",
    description: "Швидка оплата",
  },
  {
    value: "GOOGLE_PAY",
    label: "Google Pay",
    description: "Швидка оплата",
  },
];

// =====================================================
// HELPERS
// =====================================================

function formatPrice(value: number | string | null | undefined) {
  const number = Number(value ?? 0);

  return (
    new Intl.NumberFormat("uk-UA", {
      maximumFractionDigits: 2,
    }).format(number) + " ₴"
  );
}

function getItemPrice(item: CartItem): number {
  if (item.variant?.price != null) {
    return Number(item.variant.price);
  }

  return Number(item.product.price);
}

function isOnlinePayment(method: PaymentMethod) {
  return (
    method === "CARD" ||
    method === "APPLE_PAY" ||
    method === "GOOGLE_PAY"
  );
}

// =====================================================
// COMPONENT
// =====================================================

export default function CheckoutPage() {
  const router = useRouter();

  // ===================================================
  // STATE
  // ===================================================

  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<CartItem[]>([]);

  const [cartTotal, setCartTotal] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartDiscount, setCartDiscount] = useState(0);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("NOVA_POSHTA");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CARD");

  const [note, setNote] = useState("");

  const [showAddressForm, setShowAddressForm] = useState(false);

  const [addressForm, setAddressForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    region: "",
    street: "",
    building: "",
    apartment: "",
    novaPoshtaWarehouse: "",
  });

  const [savingAddress, setSavingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ===================================================
  // LOAD CHECKOUT DATA
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    async function loadCheckout() {
      setLoading(true);
      setError(null);

      try {
        const [cartRes, addressRes] = await Promise.all([
          fetch("/api/cart", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),

          fetch("/api/addresses", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (cartRes.status === 401 || addressRes.status === 401) {
          router.replace("/login?redirect=/checkout");
          return;
        }

        const cartJson = (await cartRes.json()) as CartResponse;

        if (!cartRes.ok || !cartJson.success || !cartJson.cart) {
          throw new Error(
            cartJson.error ?? "Не вдалося завантажити кошик"
          );
        }

        if (cancelled) return;

        const cart = cartJson.cart;

        setItems(cart.items ?? []);
        setCartSubtotal(Number(cart.subtotal ?? 0));
        setCartDiscount(Number(cart.discount ?? 0));
        setCartTotal(Number(cart.total ?? 0));

        const addressJson = await addressRes.json();

        if (!addressRes.ok || !addressJson.success) {
          throw new Error(
            addressJson.error ?? "Не вдалося завантажити адреси"
          );
        }

        if (cancelled) return;

        const addressList: Address[] = Array.isArray(addressJson.data)
          ? addressJson.data
          : Array.isArray(addressJson.addresses)
            ? addressJson.addresses
            : [];

        setAddresses(addressList);

        const defaultAddress =
          addressList.find((address) => address.isDefault) ??
          addressList[0];

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Не вдалося завантажити дані оформлення"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCheckout();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // ===================================================
  // FALLBACK TOTAL
  // ===================================================

  const calculatedSubtotal = items.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  const subtotal =
    cartSubtotal > 0 ? cartSubtotal : calculatedSubtotal;

  const total =
    cartTotal > 0
      ? cartTotal
      : Math.max(0, subtotal - cartDiscount);

  // ===================================================
  // ADDRESS FORM
  // ===================================================

  function updateAddressField(
    field: keyof typeof addressForm,
    value: string
  ) {
    setAddressForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // ===================================================
  // SAVE ADDRESS
  // ===================================================

  async function handleSaveAddress() {
    setError(null);

    if (!addressForm.city.trim()) {
      setError("Вкажіть місто доставки");
      return;
    }

    setSavingAddress(true);

    try {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: "SHIPPING",
          firstName: addressForm.firstName.trim() || null,
          lastName: addressForm.lastName.trim() || null,
          phone: addressForm.phone.trim() || null,
          city: addressForm.city.trim(),
          region: addressForm.region.trim() || null,
          street: addressForm.street.trim() || null,
          building: addressForm.building.trim() || null,
          apartment: addressForm.apartment.trim() || null,
          novaPoshtaWarehouse:
            addressForm.novaPoshtaWarehouse.trim() || null,
          isDefault: addresses.length === 0,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(
          json.error ?? "Не вдалося зберегти адресу"
        );
        return;
      }

      const newAddress: Address = json.data;

      setAddresses((prev) => [newAddress, ...prev]);
      setSelectedAddressId(newAddress.id);
      setShowAddressForm(false);

      setAddressForm({
        firstName: "",
        lastName: "",
        phone: "",
        city: "",
        region: "",
        street: "",
        building: "",
        apartment: "",
        novaPoshtaWarehouse: "",
      });
    } catch {
      setError("Не вдалося зберегти адресу");
    } finally {
      setSavingAddress(false);
    }
  }

  // ===================================================
  // CREATE PAYMENT
  // ===================================================

  async function createPayment(orderId: string) {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        orderId,
        method: paymentMethod,
      }),
    });

    let json: PaymentResponse;

    try {
      json = (await response.json()) as PaymentResponse;
    } catch {
      throw new Error(
        "Не вдалося отримати відповідь від сервера оплати."
      );
    }

    if (!response.ok || !json.success) {
      throw new Error(
        json.error ?? "Не вдалося ініціювати оплату"
      );
    }

    return json;
  }

  // ===================================================
  // CLEAR LOCAL CART STATE
  // ===================================================

  function clearLocalCartState() {
    setItems([]);
    setCartSubtotal(0);
    setCartDiscount(0);
    setCartTotal(0);
  }

  // ===================================================
  // SUBMIT ORDER
  // ===================================================

  async function handleSubmit() {
    if (submitting) return;

    setError(null);

    if (items.length === 0) {
      setError("Кошик порожній");
      return;
    }

    if (!selectedAddressId) {
      setError("Оберіть або додайте адресу доставки");
      return;
    }

    setSubmitting(true);

    try {
      // =================================================
      // CREATE ORDER
      // =================================================

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          shippingAddressId: selectedAddressId,
          shippingMethod,
          customerNote: note.trim() || null,
        }),
      });

      let orderJson: OrderResponse;

      try {
        orderJson = (await orderResponse.json()) as OrderResponse;
      } catch {
        throw new Error(
          "Сервер повернув некоректну відповідь під час створення замовлення."
        );
      }

      /*
       * ===================================================
       * IMPORTANT
       * ===================================================
       *
       * API /api/orders повертає:
       *
       * {
       *   ok: true,
       *   order: {...}
       * }
       *
       * а старий checkout очікував:
       *
       * {
       *   success: true,
       *   data: {...}
       * }
       *
       * Через це замовлення реально створювалось,
       * але frontend показував помилку.
       *
       * Підтримуємо обидва формати.
       */

      const createdOrder =
        orderJson.order ?? orderJson.data;

      if (
        !orderResponse.ok ||
        !(orderJson.success === true || orderJson.ok === true) ||
        !createdOrder?.id
      ) {
        throw new Error(
          orderJson.error ??
            "Не вдалося створити замовлення"
        );
      }

      const order = createdOrder;

      // =================================================
      // ORDER CREATED SUCCESSFULLY
      // =================================================

      /*
       * На цьому етапі замовлення вже реально створене
       * в БД, а CartItem видалені transaction-ом.
       *
       * Очищаємо також локальний React state.
       */
      clearLocalCartState();

      /*
       * =================================================
       * CREATE PAYMENT
       * =================================================
       *
       * Якщо платіж не створиться, це НЕ означає,
       * що замовлення не створене.
       */

      let paymentJson: PaymentResponse;

      try {
        paymentJson = await createPayment(order.id);
      } catch (paymentError) {
        console.error(
          "[CHECKOUT_PAYMENT_ERROR]",
          paymentError
        );

        /*
         * Замовлення вже існує.
         *
         * Переводимо користувача прямо в замовлення,
         * де він зможе побачити його статус і повторити
         * необхідну дію.
         */
        router.replace(`/orders/${order.id}`);
        return;
      }

      // =================================================
      // ONLINE PAYMENT
      // =================================================

      if (
        isOnlinePayment(paymentMethod) &&
        paymentJson.paymentUrl
      ) {
        /*
         * Monobank hosted checkout.
         *
         * Не зберігаємо карткові дані на UkrTradeHub.
         */
        window.location.assign(paymentJson.paymentUrl);
        return;
      }

      // =================================================
      // LOCAL PAYMENT
      // =================================================

      /*
       * CASH_ON_DELIVERY
       * BANK_TRANSFER
       *
       * Payment створений зі статусом PENDING.
       *
       * Переходимо прямо на сторінку замовлення.
       */
      router.replace(`/orders/${order.id}`);
    } catch (err) {
      console.error(
        "[CHECKOUT_ORDER_ERROR]",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося оформити замовлення. Спробуйте ще раз."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />

          <p className="text-sm text-zinc-500">
            Завантажуємо оформлення...
          </p>
        </div>
      </main>
    );
  }

  // ===================================================
  // EMPTY CART
  // ===================================================

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <Package className="h-7 w-7 text-zinc-500" />
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Кошик порожній
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Додайте товари до кошика, щоб оформити замовлення.
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
          >
            Перейти до каталогу
          </Link>
        </div>
      </main>
    );
  }

  // ===================================================
  // MAIN
  // ===================================================

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* TOP */}

        <div className="mb-8">
          <Link
            href="/cart"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Повернутися до кошика
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <Package className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-black sm:text-4xl">
                Оформлення замовлення
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Перевірте дані та підтвердьте замовлення
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* CONTENT */}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          {/* LEFT */}

          <section className="space-y-6">
            {/* ADDRESS */}

            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <MapPin className="h-5 w-5 text-amber-400" />
                    Адреса доставки
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Куди доставити ваше замовлення
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddressForm((value) => !value)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs font-bold text-amber-400 transition hover:bg-amber-400/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Нова адреса
                </button>
              </div>

              {/* SAVED ADDRESSES */}

              <div className="mt-5 space-y-3">
                {addresses.map((address) => {
                  const selected =
                    selectedAddressId === address.id;

                  return (
                    <label
                      key={address.id}
                      className={`block cursor-pointer rounded-xl border p-4 transition ${
                        selected
                          ? "border-amber-400/60 bg-amber-400/5"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selected}
                          onChange={() =>
                            setSelectedAddressId(address.id)
                          }
                          className="mt-1 accent-amber-400"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-100">
                              {[
                                address.firstName,
                                address.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") || "Отримувач"}
                            </span>

                            {address.isDefault && (
                              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                Основна
                              </span>
                            )}
                          </div>

                          {address.phone && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {address.phone}
                            </p>
                          )}

                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                            {[
                              address.region,
                              address.city,
                              address.street,
                              address.building,
                              address.apartment,
                            ]
                              .filter(Boolean)
                              .join(", ")}

                            {address.novaPoshtaWarehouse && (
                              <>
                                {" · "}
                                {address.novaPoshtaWarehouse}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}

                {addresses.length === 0 &&
                  !showAddressForm && (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-5 text-center">
                      <MapPin className="mx-auto h-6 w-6 text-zinc-600" />

                      <p className="mt-2 text-sm text-zinc-500">
                        У вас ще немає збережених адрес.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowAddressForm(true)
                        }
                        className="mt-3 text-sm font-semibold text-amber-400 hover:text-amber-300"
                      >
                        Додати адресу
                      </button>
                    </div>
                  )}
              </div>

              {/* NEW ADDRESS FORM */}

              {showAddressForm && (
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-bold text-zinc-200">
                    Нова адреса
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      placeholder="Ім'я"
                      value={addressForm.firstName}
                      onChange={(event) =>
                        updateAddressField(
                          "firstName",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Прізвище"
                      value={addressForm.lastName}
                      onChange={(event) =>
                        updateAddressField(
                          "lastName",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Телефон"
                      value={addressForm.phone}
                      onChange={(event) =>
                        updateAddressField(
                          "phone",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Місто *"
                      value={addressForm.city}
                      onChange={(event) =>
                        updateAddressField(
                          "city",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Область"
                      value={addressForm.region}
                      onChange={(event) =>
                        updateAddressField(
                          "region",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Вулиця"
                      value={addressForm.street}
                      onChange={(event) =>
                        updateAddressField(
                          "street",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
                    />

                    <input
                      placeholder="Будинок"
                      value={addressForm.building}
                      onChange={(event) =>
                        updateAddressField(
                          "building",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Квартира"
                      value={addressForm.apartment}
                      onChange={(event) =>
                        updateAddressField(
                          "apartment",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
                    />

                    <input
                      placeholder="Відділення Нової пошти"
                      value={addressForm.novaPoshtaWarehouse}
                      onChange={(event) =>
                        updateAddressField(
                          "novaPoshtaWarehouse",
                          event.target.value
                        )
                      }
                      className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60 sm:col-span-2"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={savingAddress}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingAddress && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}

                      Зберегти адресу
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAddressForm(false)
                      }
                      disabled={savingAddress}
                      className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SHIPPING */}

            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Truck className="h-5 w-5 text-amber-400" />
                  Спосіб доставки
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Виберіть зручний спосіб отримання
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {SHIPPING_OPTIONS.map((option) => {
                  const selected =
                    shippingMethod === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        selected
                          ? "border-amber-400/60 bg-amber-400/5"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selected}
                          onChange={() =>
                            setShippingMethod(option.value)
                          }
                          className="mt-1 accent-amber-400"
                        />

                        <div>
                          <p className="text-sm font-bold text-zinc-100">
                            {option.label}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* PAYMENT */}

            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Wallet className="h-5 w-5 text-amber-400" />
                  Спосіб оплати
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Виберіть спосіб оплати замовлення
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((option) => {
                  const selected =
                    paymentMethod === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        selected
                          ? "border-amber-400/60 bg-amber-400/5"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={selected}
                          onChange={() =>
                            setPaymentMethod(option.value)
                          }
                          className="mt-1 accent-amber-400"
                        />

                        <div>
                          <p className="text-sm font-bold text-zinc-100">
                            {option.label}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* PAYMENT INFORMATION */}

              {isOnlinePayment(paymentMethod) && (
                <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                    <div>
                      <p className="text-sm font-bold text-zinc-200">
                        Безпечна онлайн-оплата
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Після підтвердження замовлення ви будете
                        перенаправлені на захищену сторінку
                        Monobank для завершення оплати.
                      </p>

                      <p className="mt-2 text-[11px] text-zinc-600">
                        Дані банківської картки не зберігаються
                        на UkrTradeHub.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "CASH_ON_DELIVERY" && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-bold text-zinc-200">
                    Оплата при отриманні
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Оплата здійснюється під час отримання
                    замовлення у перевізника.
                  </p>
                </div>
              )}

              {paymentMethod === "BANK_TRANSFER" && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-bold text-zinc-200">
                    Банківський переказ
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Після створення замовлення ви зможете
                    переглянути його та отримати реквізити
                    для оплати.
                  </p>
                </div>
              )}
            </div>

            {/* NOTE */}

            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <h2 className="text-lg font-bold">
                Коментар до замовлення
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Необов'язково
              </p>

              <textarea
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="Наприклад: зателефонувати перед доставкою"
                rows={4}
                maxLength={1000}
                className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/60"
              />

              <p className="mt-2 text-right text-[11px] text-zinc-600">
                {note.length}/1000
              </p>
            </div>
          </section>

          {/* RIGHT SUMMARY */}

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-xl sm:p-6">
              <h2 className="text-xl font-black">
                Ваше замовлення
              </h2>

              {/* ITEMS */}

              <div className="mt-5 space-y-4">
                {items.map((item) => {
                  const price = getItemPrice(item);

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-zinc-200">
                          {item.product.title}
                        </p>

                        {item.variant && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {item.variant.title}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-zinc-500">
                          {formatPrice(price)} × {item.quantity}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-bold text-zinc-200">
                        {formatPrice(
                          price * item.quantity
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="my-6 border-t border-white/10" />

              {/* TOTALS */}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    Товари
                  </span>

                  <span className="font-medium text-zinc-300">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">
                      Знижка
                    </span>

                    <span className="font-medium text-emerald-400">
                      -{formatPrice(cartDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    Доставка
                  </span>

                  <span className="font-medium text-zinc-300">
                    За тарифом
                  </span>
                </div>
              </div>

              <div className="my-5 border-t border-white/10" />

              {/* FINAL TOTAL */}

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500">
                    До сплати
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Разом
                  </p>
                </div>

                <span className="text-3xl font-black text-amber-400">
                  {formatPrice(total)}
                </span>
              </div>

              {/* SUBMIT */}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !selectedAddressId ||
                  items.length === 0
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-4 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />

                    {isOnlinePayment(paymentMethod)
                      ? "Переходимо до оплати..."
                      : "Оформлюємо замовлення..."}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />

                    {isOnlinePayment(paymentMethod)
                      ? "Перейти до оплати"
                      : "Підтвердити замовлення"}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-zinc-600">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                <span>
                  Ваші дані захищені. Натискаючи кнопку,
                  ви погоджуєтесь з умовами покупки.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}