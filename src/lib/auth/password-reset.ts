
import crypto from "node:crypto";

import { db } from "@/lib/prisma";
import { EmailService } from "@/lib/email";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ukrtradehub.com";

const TOKEN_EXPIRES_MS =
  1000 * 60 * 60; // 1 година

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createPasswordResetToken(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  // Видаляємо старі токени цього користувача
  await db.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
    },
  });

  // Криптографічно безпечний токен
  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRES_MS
  );

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl =
    `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await EmailService.sendPasswordReset(
    {
      email: user.email,
      name: user.name,
    },
    {
      resetUrl,
    }
  );
}

export async function resetPasswordByToken(
  token: string,
  passwordHash: string
) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      success: false,
      reason: "INVALID",
    } as const;
  }

  const tokenHash =
    hashToken(normalizedToken);

  const resetToken =
    await db.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!resetToken) {
    return {
      success: false,
      reason: "INVALID",
    } as const;
  }

  if (
    resetToken.expiresAt.getTime() <
    Date.now()
  ) {
    await db.passwordResetToken.deleteMany({
      where: {
        id: resetToken.id,
      },
    });

    return {
      success: false,
      reason: "EXPIRED",
    } as const;
  }

  try {
    await db.$transaction(async (tx) => {
      /*
       * Видаляємо token всередині транзакції.
       *
       * Якщо інший запит уже використав token,
       * deleteMany поверне 0 і транзакція завершиться
       * помилкою.
       */
      const deleted =
        await tx.passwordResetToken.deleteMany({
          where: {
            id: resetToken.id,
            tokenHash,
          },
        });

      if (deleted.count !== 1) {
        throw new Error(
          "PASSWORD_RESET_TOKEN_ALREADY_USED"
        );
      }

      // Змінюємо пароль
      await tx.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
        },
      });

      // ВАЖЛИВО:
      // видаляємо всі активні сесії користувача
      await tx.session.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      });
    });

    return {
      success: true,
    } as const;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "PASSWORD_RESET_TOKEN_ALREADY_USED"
    ) {
      return {
        success: false,
        reason: "USED",
      } as const;
    }

    throw error;
  }
}