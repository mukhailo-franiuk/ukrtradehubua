
import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth/password-reset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    /*
     * Навіть при неправильному email
     * повертаємо однакову відповідь.
     */
    if (!email) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Якщо акаунт з цією адресою існує, ми надіслали інструкції для відновлення пароля.",
        },
        { status: 200 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    /*
     * Не розкриваємо інформацію про існування
     * користувача.
     */
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Якщо акаунт з цією адресою існує, ми надіслали інструкції для відновлення пароля.",
        },
        { status: 200 }
      );
    }

    /*
     * Заблокований користувач не отримує
     * посилання на відновлення.
     */
    if (user.isBlocked) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Якщо акаунт з цією адресою існує, ми надіслали інструкції для відновлення пароля.",
        },
        { status: 200 }
      );
    }

    await createPasswordResetToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    console.log(
      `PASSWORD RESET EMAIL SENT: ${user.email}`
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Якщо акаунт з цією адресою існує, ми надіслали інструкції для відновлення пароля.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: "FORGOT_PASSWORD_ERROR",
        message:
          "Не вдалося обробити запит. Спробуйте ще раз.",
      },
      { status: 500 }
    );
  }
}