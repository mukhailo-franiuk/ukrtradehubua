import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { db } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    /* ========================================================
       CONTENT TYPE
    ======================================================== */

    const contentType =
      request.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Content-Type must be application/json",
        },
        { status: 415 }
      );
    }

    /* ========================================================
       BODY
    ======================================================== */

    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    /* ========================================================
       VALIDATION
    ======================================================== */

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email та пароль обовʼязкові",
        },
        { status: 400 }
      );
    }

    /* ========================================================
       FIND USER
    ======================================================== */

    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Невірний email або пароль",
        },
        { status: 401 }
      );
    }

    /* ========================================================
       BLOCKED
    ======================================================== */

    if (
      user.isBlocked ||
      user.status === "BLOCKED"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_BLOCKED",
          message:
            "Ваш акаунт заблокований",
        },
        { status: 403 }
      );
    }

    /* ========================================================
       SUSPENDED
    ======================================================== */

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "Ваш акаунт тимчасово призупинений",
        },
        { status: 403 }
      );
    }

    /* ========================================================
       PASSWORD
    ======================================================== */

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Невірний email або пароль",
        },
        { status: 401 }
      );
    }

    /* ========================================================
       EMAIL VERIFICATION
    ======================================================== */

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_VERIFIED",
          message:
            "Спочатку підтвердьте вашу електронну адресу.",
        },
        { status: 403 }
      );
    }

    /* ========================================================
       UPDATE LAST LOGIN
    ======================================================== */

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    /* ========================================================
       CREATE SESSION
       
       ВАЖЛИВО:
       Передаємо request, щоб зберегти:
       - IP
       - User-Agent
    ======================================================== */

    await createSession(
      user.id,
      request
    );

    /* ========================================================
       RESPONSE
    ======================================================== */

    return NextResponse.json({
      success: true,
      message: "Вхід успішний",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isBlocked: user.isBlocked,
        emailVerifiedAt:
          user.emailVerifiedAt,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Помилка під час входу",
      },
      { status: 500 }
    );
  }
}