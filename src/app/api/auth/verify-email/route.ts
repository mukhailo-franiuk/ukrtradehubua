import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth";
import { EmailService } from "@/lib/email";
import {
  verifyEmailToken,
} from "@/lib/auth/email-verification";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    /* ========================================================
       TOKEN
    ======================================================== */

    const { searchParams } =
      new URL(request.url);

    const token =
      searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: "TOKEN_REQUIRED",
          message:
            "Токен підтвердження не вказано.",
        },
        { status: 400 }
      );
    }

    /* ========================================================
       VERIFY TOKEN
    ======================================================== */

    const result =
      await verifyEmailToken(token);

    if (!result.success) {
      switch (result.reason) {
        case "EXPIRED":
          return NextResponse.json(
            {
              success: false,
              code: "EMAIL_VERIFICATION_EXPIRED",
              message:
                "Термін дії посилання закінчився.",
            },
            { status: 410 }
          );

        case "USED":
          return NextResponse.json(
            {
              success: false,
              code: "EMAIL_VERIFICATION_USED",
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
              code: "EMAIL_VERIFICATION_INVALID",
              message:
                "Недійсне посилання підтвердження.",
            },
            { status: 400 }
          );
      }
    }

    const user = result.user;

    /* ========================================================
       CREATE SESSION
       
       Передаємо request:
       IP + User-Agent будуть збережені.
    ======================================================== */

    await createSession(
      user.id,
      request
    );

    /* ========================================================
       WELCOME EMAIL
    ======================================================== */

    if (!result.alreadyVerified) {
      try {
        await EmailService.sendWelcome({
          email: user.email,
          name: user.name,
        });
      } catch (emailError) {
        console.error(
          "WELCOME EMAIL ERROR:",
          emailError
        );
      }
    }

    /* ========================================================
       RESPONSE
    ======================================================== */

    return NextResponse.json({
      success: true,

      code: result.alreadyVerified
        ? "EMAIL_ALREADY_VERIFIED"
        : "EMAIL_VERIFIED",

      message: result.alreadyVerified
        ? "Email вже був підтверджений."
        : "Email успішно підтверджено.",

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isBlocked: user.isBlocked,
        emailVerifiedAt:
          user.emailVerifiedAt,
      },
    });
  } catch (error) {
    console.error(
      "VERIFY EMAIL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: "EMAIL_VERIFICATION_ERROR",
        message:
          "Не вдалося підтвердити email. Спробуйте ще раз.",
      },
      { status: 500 }
    );
  }
}