
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { db } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const token =
      typeof body.token === "string"
        ? body.token
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Посилання для відновлення пароля недійсне.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Пароль повинен містити щонайменше 6 символів.",
        },
        {
          status: 400,
        }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken =
      await db.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },

        select: {
          id: true,
          userId: true,
          expiresAt: true,
        },
      });

    if (!resetToken) {
      return NextResponse.json(
        {
          error:
            "Посилання для відновлення пароля недійсне або вже використане.",
        },
        {
          status: 400,
        }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      await db.passwordResetToken.delete({
        where: {
          id: resetToken.id,
        },
      });

      return NextResponse.json(
        {
          error:
            "Термін дії посилання закінчився. Створіть новий запит.",
        },
        {
          status: 400,
        }
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    await db.$transaction([
      db.user.update({
        where: {
          id: resetToken.userId,
        },

        data: {
          passwordHash,
        },
      }),

      /*
       * Виходимо з усіх старих пристроїв.
       *
       * Користувач після зміни пароля
       * знову авторизується.
       */
      db.session.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),

      db.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
    ]);

    return NextResponse.json(
      {
        message:
          "Пароль успішно змінено. Тепер ви можете увійти.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Не вдалося змінити пароль. Спробуйте ще раз.",
      },
      {
        status: 500,
      }
    );
  }
}

