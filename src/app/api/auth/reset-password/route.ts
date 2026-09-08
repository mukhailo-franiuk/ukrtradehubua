
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { resetPasswordByToken } from "@/lib/auth/password-reset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: "TOKEN_REQUIRED",
          message:
            "Токен відновлення відсутній.",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          code: "PASSWORD_REQUIRED",
          message:
            "Введіть новий пароль.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          code: "PASSWORD_TOO_SHORT",
          message:
            "Пароль повинен містити щонайменше 8 символів.",
        },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        {
          success: false,
          code: "PASSWORD_TOO_LONG",
          message:
            "Пароль не може містити більше 128 символів.",
        },
        { status: 400 }
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const result =
      await resetPasswordByToken(
        token,
        passwordHash
      );

    if (!result.success) {
      switch (result.reason) {
        case "EXPIRED":
          return NextResponse.json(
            {
              success: false,
              code: "PASSWORD_RESET_EXPIRED",
              message:
                "Термін дії посилання минув. Запросіть нове посилання.",
            },
            { status: 410 }
          );

        case "USED":
          return NextResponse.json(
            {
              success: false,
              code: "PASSWORD_RESET_USED",
              message:
                "Це посилання вже було використано.",
            },
            { status: 409 }
          );

        case "INVALID":
        default:
          return NextResponse.json(
            {
              success: false,
              code: "PASSWORD_RESET_INVALID",
              message:
                "Посилання для відновлення пароля недійсне.",
            },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(
      {
        success: true,
        code: "PASSWORD_RESET_SUCCESS",
        message:
          "Пароль успішно змінено. Увійдіть із новим паролем.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: "PASSWORD_RESET_ERROR",
        message:
          "Не вдалося змінити пароль. Спробуйте ще раз.",
      },
      { status: 500 }
    );
  }
}