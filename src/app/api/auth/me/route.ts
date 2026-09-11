import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// =====================================================
// GET /api/auth/me
// Поточний авторизований користувач
// =====================================================

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 401 }
      );
    }

    // Завантажуємо актуальні дані користувача
    // разом з аватаром.
    const user = await db.user.findUnique({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        status: true,
        isBlocked: true,
        emailVerifiedAt: true,
        createdAt: true,

        avatar: {
          select: {
            id: true,
            url: true,
            alt: true,
            width: true,
            height: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,

      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        status: user.status,
        isBlocked: user.isBlocked,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,

        // ---------------------------------------------
        // AVATAR
        // ---------------------------------------------

        avatar: user.avatar
          ? {
              id: user.avatar.id,
              url: user.avatar.url,
              alt: user.avatar.alt,
              width: user.avatar.width,
              height: user.avatar.height,
              createdAt: user.avatar.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);

    return NextResponse.json(
      {
        authenticated: false,
        user: null,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/auth/me
// Оновлення профілю:
// - name
// - phone
// - email
// - password
// =====================================================

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Необхідна авторизація",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------
    // Перевіряємо, що користувач існує
    // ---------------------------------------------

    const existingUser = await db.user.findUnique({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        passwordHash: true,
        role: true,
        status: true,
        isBlocked: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Користувача не знайдено",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------
    // JSON
    // ---------------------------------------------

    let body: {
      name?: string | null;
      phone?: string | null;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // NORMALIZE
    // ---------------------------------------------

    const name =
      body.name !== undefined
        ? body.name?.trim() || null
        : undefined;

    const phone =
      body.phone !== undefined
        ? body.phone?.trim() || null
        : undefined;

    const email =
      body.email !== undefined
        ? body.email.trim().toLowerCase()
        : undefined;

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    // ---------------------------------------------
    // UPDATE DATA
    // ---------------------------------------------

    const data: {
      name?: string | null;
      phone?: string | null;
      email?: string;
      passwordHash?: string;
    } = {};

    // =================================================
    // NAME
    // =================================================

    if (name !== undefined) {
      if (name !== existingUser.name) {
        data.name = name;
      }
    }

    // =================================================
    // EMAIL
    // =================================================

    if (
      email !== undefined &&
      email !== existingUser.email
    ) {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            message: "Email не може бути порожнім",
          },
          { status: 400 }
        );
      }

      // Базова перевірка email
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return NextResponse.json(
          {
            success: false,
            message: "Некоректний формат email",
          },
          { status: 400 }
        );
      }

      const emailTaken =
        await db.user.findFirst({
          where: {
            email,
            NOT: {
              id: existingUser.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (emailTaken) {
        return NextResponse.json(
          {
            success: false,
            message: "Цей email вже використовується",
          },
          { status: 409 }
        );
      }

      data.email = email;
    }

    // =================================================
    // PHONE
    // =================================================

    if (
      phone !== undefined &&
      phone !== existingUser.phone
    ) {
      if (phone) {
        const phoneTaken =
          await db.user.findFirst({
            where: {
              phone,
              NOT: {
                id: existingUser.id,
              },
            },
            select: {
              id: true,
            },
          });

        if (phoneTaken) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Цей телефон вже використовується",
            },
            { status: 409 }
          );
        }
      }

      data.phone = phone;
    }

    // =================================================
    // PASSWORD
    // =================================================

    if (newPassword) {
      // Поточний пароль обов'язковий
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "Вкажіть поточний пароль",
          },
          { status: 400 }
        );
      }

      // Перевірка поточного пароля
      const passwordValid =
        await bcrypt.compare(
          currentPassword,
          existingUser.passwordHash
        );

      if (!passwordValid) {
        return NextResponse.json(
          {
            success: false,
            message: "Поточний пароль невірний",
          },
          { status: 401 }
        );
      }

      // Мінімум 8 символів
      if (newPassword.length < 8) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Новий пароль повинен містити мінімум 8 символів",
          },
          { status: 400 }
        );
      }

      // Не дозволяємо встановити той самий пароль
      const samePassword =
        await bcrypt.compare(
          newPassword,
          existingUser.passwordHash
        );

      if (samePassword) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Новий пароль повинен відрізнятися від поточного",
          },
          { status: 400 }
        );
      }

      data.passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );
    }

    // =================================================
    // NOTHING TO UPDATE
    // =================================================

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Немає змін для збереження",
        },
        { status: 400 }
      );
    }

    // =================================================
    // UPDATE USER
    // =================================================

    const updatedUser =
      await db.user.update({
        where: {
          id: existingUser.id,
        },

        data,

        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          isBlocked: true,
          emailVerifiedAt: true,
          createdAt: true,

          avatar: {
            select: {
              id: true,
              url: true,
              alt: true,
              width: true,
              height: true,
              createdAt: true,
            },
          },
        },
      });

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,
      message: "Профіль оновлено",

      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
        isBlocked: updatedUser.isBlocked,
        emailVerifiedAt:
          updatedUser.emailVerifiedAt,
        createdAt: updatedUser.createdAt,

        avatar: updatedUser.avatar
          ? {
              id: updatedUser.avatar.id,
              url: updatedUser.avatar.url,
              alt: updatedUser.avatar.alt,
              width: updatedUser.avatar.width,
              height: updatedUser.avatar.height,
              createdAt:
                updatedUser.avatar.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "PATCH /api/auth/me error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося оновити профіль",
      },
      { status: 500 }
    );
  }
}