"use client";

export const GUEST_CART_KEY =
"ukrtradehub_guest_cart";

export const GUEST_CART_UPDATED_EVENT =
"ukrtradehub:cart-updated";

export type GuestCartItem = {
id: string;
productId: string;
variantId: string | null;
quantity: number;
};

// =====================================================
// BROWSER CHECK
// =====================================================

function isBrowser() {
return typeof window !== "undefined";
}

// =====================================================
// ITEM ID
// =====================================================

function createGuestCartItemId(
productId: string,
variantId: string | null
) {
return `${productId}::${variantId ?? "base"}`;
}

// =====================================================
// NORMALIZE ITEM
// =====================================================

function normalizeItem(
item: Partial<GuestCartItem>
): GuestCartItem | null {
if (
typeof item.productId !== "string" ||
!item.productId
) {
return null;
}

const variantId =
typeof item.variantId === "string" &&
item.variantId.length > 0
? item.variantId
: null;

const quantity = Math.floor(
Number(item.quantity)
);

if (
!Number.isFinite(quantity) ||
quantity < 1
) {
return null;
}

return {
id:
typeof item.id === "string" &&
item.id.length > 0
? item.id
: createGuestCartItemId(
item.productId,
variantId
),


productId: item.productId,

variantId,

quantity,


};
}

// =====================================================
// GET GUEST CART
// =====================================================

export function getGuestCart(): GuestCartItem[] {
if (!isBrowser()) {
return [];
}

try {
const raw =
window.localStorage.getItem(
GUEST_CART_KEY
);


if (!raw) {
  return [];
}

const parsed: unknown =
  JSON.parse(raw);

if (!Array.isArray(parsed)) {
  return [];
}

return parsed
  .map((item) => {
    if (
      !item ||
      typeof item !== "object"
    ) {
      return null;
    }

    return normalizeItem(
      item as Partial<GuestCartItem>
    );
  })
  .filter(
    (
      item
    ): item is GuestCartItem =>
      item !== null
  );


} catch (error) {
console.error(
"Guest cart read error:",
error
);


return [];


}
}

// =====================================================
// SAVE GUEST CART
// =====================================================

export function saveGuestCart(
items: GuestCartItem[]
) {
if (!isBrowser()) {
return;
}

try {
const normalizedItems = items
.map((item) =>
normalizeItem(item)
)
.filter(
(
item
): item is GuestCartItem =>
item !== null
);


window.localStorage.setItem(
  GUEST_CART_KEY,
  JSON.stringify(normalizedItems)
);

window.dispatchEvent(
  new CustomEvent(
    GUEST_CART_UPDATED_EVENT
  )
);


} catch (error) {
console.error(
"Guest cart save error:",
error
);
}
}

// =====================================================
// CLEAR GUEST CART
// =====================================================

export function clearGuestCart() {
if (!isBrowser()) {
return;
}

try {
window.localStorage.removeItem(
GUEST_CART_KEY
);


window.dispatchEvent(
  new CustomEvent(
    GUEST_CART_UPDATED_EVENT
  )
);


} catch (error) {
console.error(
"Guest cart clear error:",
error
);
}
}

// =====================================================
// ADD TO GUEST CART
// =====================================================

export function addToGuestCart(
productId: string,
variantId: string | null,
quantity: number
) {
if (!productId) {
throw new Error(
"Не вказано товар."
);
}

const normalizedQuantity =
Math.floor(Number(quantity));

if (
!Number.isFinite(
normalizedQuantity
) ||
normalizedQuantity < 1
) {
throw new Error(
"Некоректна кількість товару."
);
}

const normalizedVariantId =
typeof variantId === "string" &&
variantId.length > 0
? variantId
: null;

const items = getGuestCart();

const existingIndex =
items.findIndex(
(item) =>
item.productId === productId &&
item.variantId ===
normalizedVariantId
);

if (existingIndex >= 0) {
items[existingIndex] = {
...items[existingIndex],


  quantity:
    items[existingIndex].quantity +
    normalizedQuantity,
};


} else {
items.push({
id: createGuestCartItemId(
productId,
normalizedVariantId
),


  productId,

  variantId:
    normalizedVariantId,

  quantity:
    normalizedQuantity,
});


}

saveGuestCart(items);

return items;
}

// =====================================================
// UPDATE GUEST CART QUANTITY
// =====================================================

export function updateGuestCartQuantity(
id: string,
quantity: number
) {
if (!id) {
throw new Error(
"Не вказано товар у кошику."
);
}

const normalizedQuantity =
Math.floor(Number(quantity));

if (
!Number.isFinite(
normalizedQuantity
) ||
normalizedQuantity < 1
) {
throw new Error(
"Кількість повинна бути не менше 1."
);
}

const items = getGuestCart();

const index = items.findIndex(
(item) => item.id === id
);

if (index === -1) {
throw new Error(
"Товар у кошику не знайдено."
);
}

items[index] = {
...items[index],


quantity:
  normalizedQuantity,


};

saveGuestCart(items);

return items;
}

// =====================================================
// UPDATE GUEST CART ITEM
// Compatibility alias
// =====================================================

export function updateGuestCartItem(
id: string,
quantity: number
) {
return updateGuestCartQuantity(
id,
quantity
);
}

// =====================================================
// REMOVE GUEST CART ITEM
// =====================================================

export function removeGuestCartItem(
id: string
) {
if (!id) {
return getGuestCart();
}

const items = getGuestCart();

const filtered = items.filter(
(item) => item.id !== id
);

saveGuestCart(filtered);

return filtered;
}

// =====================================================
// GET TOTAL QUANTITY
// =====================================================

export function getGuestCartCount() {
return getGuestCart().reduce(
(total, item) =>
total + item.quantity,
0
);
}

// =====================================================
// GET NUMBER OF LINES
// =====================================================

export function getGuestCartItemsCount() {
return getGuestCart().length;
}

// =====================================================
// HAS ITEMS
// =====================================================

export function hasGuestCartItems() {
return getGuestCart().length > 0;
}

// =====================================================
// GET ITEM
// =====================================================

export function getGuestCartItem(
id: string
) {
return (
getGuestCart().find(
(item) => item.id === id
) ?? null
);
}

// =====================================================
// FIND PRODUCT ITEM
// =====================================================

export function findGuestCartItem(
productId: string,
variantId: string | null
) {
return (
getGuestCart().find(
(item) =>
item.productId ===
productId &&
item.variantId === variantId
) ?? null
);
}

// =====================================================
// INCREASE QUANTITY
// =====================================================

export function increaseGuestCartQuantity(
id: string,
amount = 1
) {
const item =
getGuestCartItem(id);

if (!item) {
throw new Error(
"Товар у кошику не знайдено."
);
}

const normalizedAmount =
Math.floor(Number(amount));

if (
!Number.isFinite(
normalizedAmount
) ||
normalizedAmount < 1
) {
throw new Error(
"Некоректна кількість."
);
}

return updateGuestCartQuantity(
id,
item.quantity +
normalizedAmount
);
}

// =====================================================
// DECREASE QUANTITY
// =====================================================

export function decreaseGuestCartQuantity(
id: string,
amount = 1
) {
const item =
getGuestCartItem(id);

if (!item) {
throw new Error(
"Товар у кошику не знайдено."
);
}

const normalizedAmount =
Math.floor(Number(amount));

if (
!Number.isFinite(
normalizedAmount
) ||
normalizedAmount < 1
) {
throw new Error(
"Некоректна кількість."
);
}

const nextQuantity =
item.quantity -
normalizedAmount;

if (nextQuantity <= 0) {
return removeGuestCartItem(id);
}

return updateGuestCartQuantity(
id,
nextQuantity
);
}
