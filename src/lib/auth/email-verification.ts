import crypto from "node:crypto";

import { db } from "@/lib/prisma";
import { EmailService } from "@/lib/email";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ukrtradehub.com";

const TOKEN_EXPIRES_MS =
  1000 * 60 * 60 * 24; // 24 години

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createEmailVerification(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  // Видаляємо старі токени цього користувача
  await db.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
    },
  });

  // Генеруємо криптографічно випадковий токен
  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRES_MS
  );

  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const verificationUrl =
    `${SITE_URL}/verify-email?token=${encodeURIComponent(token)}`;

  await EmailService.sendEmailVerification({
    email: user.email,
    name: user.name,
    verificationUrl,
  });
}

export async function verifyEmailToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      success: false,
      reason: "INVALID",
    } as const;
  }

  const tokenHash = hashToken(normalizedToken);

  const verificationToken =
    await db.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (!verificationToken) {
    return {
      success: false,
      reason: "INVALID",
    } as const;
  }

  if (verificationToken.usedAt) {
    return {
      success: false,
      reason: "USED",
    } as const;
  }

  if (
    verificationToken.expiresAt.getTime() <
    Date.now()
  ) {
    return {
      success: false,
      reason: "EXPIRED",
    } as const;
  }

  const user = verificationToken.user;

  // Якщо email вже був підтверджений
  if (user.emailVerifiedAt) {
    await db.emailVerificationToken.update({
      where: {
        id: verificationToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return {
      success: true,
      alreadyVerified: true,
      user,
    } as const;
  }

  const now = new Date();

  const updatedUser = await db.$transaction(
    async (tx) => {
      const updated = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerifiedAt: now,
        },
      });

      await tx.emailVerificationToken.update({
        where: {
          id: verificationToken.id,
        },
        data: {
          usedAt: now,
        },
      });

      // Видаляємо всі інші токени користувача
      await tx.emailVerificationToken.deleteMany({
        where: {
          userId: user.id,
          id: {
            not: verificationToken.id,
          },
        },
      });

      return updated;
    }
  );

  return {
    success: true,
    alreadyVerified: false,
    user: updatedUser,
  } as const;
}