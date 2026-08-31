
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { db } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          error: "Введіть email.",
        },
        {
          status: 400,
        }
      );
    }

    const genericResponse = {
      message:
        "Якщо акаунт із таким email існує, ми надішлемо інструкції для відновлення пароля.",
    };

    const user = await db.user.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    /*
     * Не повідомляємо клієнту,
     * чи існує конкретний email.
     *
     * Це захищає від account enumeration.
     */
    if (!user) {
      return NextResponse.json(
        genericResponse,
        {
          status: 200,
        }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 30
    );

    /*
     * Видаляємо старі токени цього користувача.
     *
     * Одночасно буде активний тільки
     * останній запит на відновлення.
     */
    await db.$transaction([
      db.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
        },
      }),

      db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const resetUrl =
      `${appUrl}/reset-password?token=${encodeURIComponent(
        token
      )}`;

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json(
      genericResponse,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Не вдалося обробити запит. Спробуйте ще раз пізніше.",
      },
      {
        status: 500,
      }
    );
  }
}

