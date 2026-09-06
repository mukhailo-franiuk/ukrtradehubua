import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

import {
  getMonoInvoiceStatus,
  isMonoSuccessfulStatus,
  isMonoFailedStatus,
  isMonoProcessingStatus,
} from "@/lib/payments/monobank";

import { finalizePaidOrder } from "@/lib/orders/finalize-paid-order";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const paymentInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
    },
  },
} as const;

function serializePayment(payment: any) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    provider: payment.provider,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function serializeOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    /*
     * =====================================================
     * AUTH
     * =====================================================
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * PARAMS
     * =====================================================
     */

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "PAYMENT_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * LOAD PAYMENT
     * =====================================================
     */

    const payment =
      await db.payment.findFirst({
        where: {
          id: id.trim(),
          userId: user.id,
        },

        include: paymentInclude,
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "PAYMENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * NON MONOBANK
     * =====================================================
     */

    if (
      payment.provider !==
      "MONOBANK"
    ) {
      return NextResponse.json({
        success: true,
        payment:
          serializePayment(payment),
        order:
          serializeOrder(payment.order),
        monobank: null,
        finalized: false,
      });
    }

    /*
     * =====================================================
     * NO INVOICE
     * =====================================================
     */

    if (!payment.transactionId) {
      return NextResponse.json({
        success: true,
        payment:
          serializePayment(payment),
        order:
          serializeOrder(payment.order),
        monobank: {
          available: false,
          status: null,
          invoiceId: null,
        },
        finalized: false,
      });
    }

    /*
     * =====================================================
     * ALREADY PAID
     * =====================================================
     */

    if (
      payment.status ===
      PaymentStatus.PAID
    ) {
      return NextResponse.json({
        success: true,
        payment:
          serializePayment(payment),
        order:
          serializeOrder(payment.order),
        monobank: {
          available: true,
          status: "success",
          invoiceId:
            payment.transactionId,
        },
        finalized: false,
      });
    }

    /*
     * =====================================================
     * CANCELLED / REFUNDED
     * =====================================================
     */

    if (
      payment.status ===
        PaymentStatus.CANCELLED ||
      payment.status ===
        PaymentStatus.REFUNDED
    ) {
      return NextResponse.json({
        success: true,
        payment:
          serializePayment(payment),
        order:
          serializeOrder(payment.order),
        monobank: {
          available: true,
          status: null,
          invoiceId:
            payment.transactionId,
        },
        finalized: false,
      });
    }

    /*
     * =====================================================
     * GET MONOBANK STATUS
     * =====================================================
     */

    let monoInvoice;

    try {
      monoInvoice =
        await getMonoInvoiceStatus(
          payment.transactionId
        );
    } catch (error) {
      console.error(
        "[GET /api/payments/[id]] Monobank status error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "MONOBANK_STATUS_UNAVAILABLE",
        },
        { status: 502 }
      );
    }

    const monoStatus =
      monoInvoice.status;

    /*
     * =====================================================
     * MONOBANK SUCCESS
     * =====================================================
     */

    if (
      isMonoSuccessfulStatus(
        monoStatus
      )
    ) {
      try {
        const result =
          await db.$transaction(
            async (tx) => {
              const currentPayment =
                await tx.payment.findUnique({
                  where: {
                    id: payment.id,
                  },
                });

              if (!currentPayment) {
                throw new Error(
                  "PAYMENT_NOT_FOUND"
                );
              }

              /*
               * Already paid.
               */

              if (
                currentPayment.status ===
                PaymentStatus.PAID
              ) {
                return {
                  finalized: false,
                  alreadyPaid: true,
                  status:
                    PaymentStatus.PAID,
                };
              }

              /*
               * Cancelled/refunded.
               */

              if (
                currentPayment.status ===
                  PaymentStatus.CANCELLED ||
                currentPayment.status ===
                  PaymentStatus.REFUNDED
              ) {
                return {
                  finalized: false,
                  ignored: true,
                  status:
                    currentPayment.status,
                };
              }

              /*
               * Verify amount.
               */

              const monoAmount =
                Number(
                  monoInvoice.amount
                );

              if (
                !Number.isFinite(
                  monoAmount
                ) ||
                monoAmount <= 0
              ) {
                throw new Error(
                  "MONOBANK_INVALID_AMOUNT"
                );
              }

              const expectedAmount =
                Number(
                  currentPayment.amount
                ) * 100;

              if (
                Math.round(
                  monoAmount
                ) !==
                Math.round(
                  expectedAmount
                )
              ) {
                throw new Error(
                  "MONOBANK_AMOUNT_MISMATCH"
                );
              }

              /*
               * Verify currency.
               */

              if (
                monoInvoice.ccy !==
                  undefined &&
                Number(
                  monoInvoice.ccy
                ) !== 980
              ) {
                throw new Error(
                  "MONOBANK_CURRENCY_MISMATCH"
                );
              }

              /*
               * Payment -> PAID
               */

              await tx.payment.update({
                where: {
                  id: currentPayment.id,
                },

                data: {
                  status:
                    PaymentStatus.PAID,

                  paidAt:
                    currentPayment.paidAt ??
                    new Date(),

                  transactionId:
                    monoInvoice.invoiceId ??
                    currentPayment.transactionId,
                },
              });

              /*
               * Finalize order.
               *
               * ВАЖЛИВО:
               * orderId ПЕРШИЙ,
               * tx ДРУГИЙ.
               */

              const finalized =
                await finalizePaidOrder(
                  currentPayment.orderId,
                  tx
                );

              return {
                finalized:
                  finalized.finalized,

                status:
                  finalized.status,
              };
            },
            {
              isolationLevel:
                Prisma.TransactionIsolationLevel.Serializable,

              maxWait: 5000,

              timeout: 15000,
            }
          );

        /*
         * Reload payment.
         */

        const updatedPayment =
          await db.payment.findUnique({
            where: {
              id: payment.id,
            },

            include:
              paymentInclude,
          });

        if (!updatedPayment) {
          return NextResponse.json(
            {
              success: false,
              error:
                "PAYMENT_NOT_FOUND",
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,

          payment:
            serializePayment(
              updatedPayment
            ),

          order:
            serializeOrder(
              updatedPayment.order
            ),

          monobank: {
            available: true,
            status: monoStatus,

            invoiceId:
              monoInvoice.invoiceId ??
              updatedPayment.transactionId,

            amount:
              monoInvoice.amount,

            ccy:
              monoInvoice.ccy,
          },

          finalized:
            result.finalized,
        });
      } catch (error) {
        console.error(
          "[GET /api/payments/[id]] Finalization error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR";

        if (
          message ===
          "MONOBANK_AMOUNT_MISMATCH"
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "MONOBANK_AMOUNT_MISMATCH",
            },
            { status: 409 }
          );
        }

        if (
          message ===
          "MONOBANK_CURRENCY_MISMATCH"
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "MONOBANK_CURRENCY_MISMATCH",
            },
            { status: 409 }
          );
        }

        if (
          message ===
          "MONOBANK_INVALID_AMOUNT"
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "MONOBANK_INVALID_AMOUNT",
            },
            { status: 409 }
          );
        }

        if (
          message ===
          "PAYMENT_NOT_FOUND"
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "PAYMENT_NOT_FOUND",
            },
            { status: 404 }
          );
        }

        if (
          message ===
          "PAYMENT_NOT_PAID"
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "PAYMENT_NOT_PAID",
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "PAYMENT_FINALIZATION_FAILED",
          },
          { status: 500 }
        );
      }
    }

    /*
     * =====================================================
     * PROCESSING / HOLD
     * =====================================================
     */

    if (
      isMonoProcessingStatus(
        monoStatus
      )
    ) {
      if (
        payment.status ===
        PaymentStatus.PENDING
      ) {
        await db.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status:
              PaymentStatus.PROCESSING,

            transactionId:
              monoInvoice.invoiceId ??
              payment.transactionId,
          },
        });
      }

      const updatedPayment =
        await db.payment.findUnique({
          where: {
            id: payment.id,
          },

          include:
            paymentInclude,
        });

      if (!updatedPayment) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PAYMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,

        payment:
          serializePayment(
            updatedPayment
          ),

        order:
          serializeOrder(
            updatedPayment.order
          ),

        monobank: {
          available: true,
          status: monoStatus,

          invoiceId:
            monoInvoice.invoiceId ??
            updatedPayment.transactionId,

          amount:
            monoInvoice.amount,

          ccy:
            monoInvoice.ccy,
        },

        finalized: false,
      });
    }

    /*
     * =====================================================
     * FAILURE
     * =====================================================
     */

    if (
      isMonoFailedStatus(
        monoStatus
      )
    ) {
      if (
        payment.status ===
          PaymentStatus.PENDING ||
        payment.status ===
          PaymentStatus.PROCESSING
      ) {
        await db.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status:
              PaymentStatus.FAILED,

            transactionId:
              monoInvoice.invoiceId ??
              payment.transactionId,
          },
        });
      }

      const updatedPayment =
        await db.payment.findUnique({
          where: {
            id: payment.id,
          },

          include:
            paymentInclude,
        });

      if (!updatedPayment) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PAYMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,

        payment:
          serializePayment(
            updatedPayment
          ),

        order:
          serializeOrder(
            updatedPayment.order
          ),

        monobank: {
          available: true,
          status: monoStatus,

          invoiceId:
            monoInvoice.invoiceId ??
            updatedPayment.transactionId,

          amount:
            monoInvoice.amount,

          ccy:
            monoInvoice.ccy,
        },

        finalized: false,
      });
    }

    /*
     * =====================================================
     * EXPIRED
     * =====================================================
     */

    if (
      monoStatus === "expired"
    ) {
      if (
        payment.status ===
          PaymentStatus.PENDING ||
        payment.status ===
          PaymentStatus.PROCESSING
      ) {
        await db.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status:
              PaymentStatus.FAILED,
          },
        });
      }

      const updatedPayment =
        await db.payment.findUnique({
          where: {
            id: payment.id,
          },

          include:
            paymentInclude,
        });

      if (!updatedPayment) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PAYMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,

        payment:
          serializePayment(
            updatedPayment
          ),

        order:
          serializeOrder(
            updatedPayment.order
          ),

        monobank: {
          available: true,
          status: monoStatus,

          invoiceId:
            monoInvoice.invoiceId ??
            updatedPayment.transactionId,

          amount:
            monoInvoice.amount,

          ccy:
            monoInvoice.ccy,
        },

        finalized: false,
      });
    }

    /*
     * =====================================================
     * REVERSED
     * =====================================================
     */

    if (
      monoStatus === "reversed"
    ) {
      const updatedPayment =
        await db.payment.findUnique({
          where: {
            id: payment.id,
          },

          include:
            paymentInclude,
        });

      if (!updatedPayment) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PAYMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,

        payment:
          serializePayment(
            updatedPayment
          ),

        order:
          serializeOrder(
            updatedPayment.order
          ),

        monobank: {
          available: true,
          status: monoStatus,

          invoiceId:
            monoInvoice.invoiceId ??
            updatedPayment.transactionId,

          amount:
            monoInvoice.amount,

          ccy:
            monoInvoice.ccy,
        },

        finalized: false,
      });
    }

    /*
     * =====================================================
     * FALLBACK
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      payment:
        serializePayment(payment),

      order:
        serializeOrder(payment.order),

      monobank: {
        available: true,
        status: monoStatus,

        invoiceId:
          monoInvoice.invoiceId ??
          payment.transactionId,

        amount:
          monoInvoice.amount,

        ccy:
          monoInvoice.ccy,
      },

      finalized: false,
    });
  } catch (error) {
    console.error(
      "[GET /api/payments/[id]]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}