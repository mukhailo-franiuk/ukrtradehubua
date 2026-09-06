import { Prisma } from "@prisma/client";

const DEFAULT_COMMISSION_RATE = 10;

function getMarketplaceCommissionRate(): Prisma.Decimal {
  const raw = process.env.MARKETPLACE_COMMISSION_PERCENT;

  if (!raw || raw.trim() === "") {
    return new Prisma.Decimal(
      DEFAULT_COMMISSION_RATE
    );
  }

  const value = Number(raw);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      "Invalid MARKETPLACE_COMMISSION_PERCENT. Value must be between 0 and 100."
    );
  }

  return new Prisma.Decimal(value);
}

/**
 * Розрахунок комісії маркетплейсу.
 *
 * Наприклад:
 *
 * subtotal = 1000
 * commission = 10%
 *
 * amount = 100
 * sellerAmount = 900
 */
export function calculateCommission(
  subtotal: Prisma.Decimal
) {
  const rate =
    getMarketplaceCommissionRate();

  const amount =
    subtotal
      .mul(rate)
      .div(100);

  const sellerAmount =
    subtotal.sub(amount);

  return {
    rate,
    amount,
    sellerAmount,
  };
}