import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

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
      },
    });
  } catch (error) {
    console.error('ME ERROR:', error);

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
// Оновлення профілю: імʼя, телефон, email, пароль
// =====================================================

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Необхідна авторизація',
        },
        { status: 401 }
      );
    }

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
          message: 'Некоректний JSON',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

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
      body.currentPassword ?? '';

    const newPassword =
      body.newPassword ?? '';

    const data: {
      name?: string | null;
      phone?: string | null;
      email?: string;
      passwordHash?: string;
    } = {};

    // -------------------------------------------------
    // EMAIL
    // -------------------------------------------------

    if (
      email !== undefined &&
      email !== currentUser.email
    ) {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            message: 'Email не може бути порожнім',
          },
          { status: 400 }
        );
      }

      const emailTaken =
        await db.user.findFirst({
          where: {
            email,
            NOT: {
              id: currentUser.id,
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
            message:
              'Цей email вже використовується',
          },
          { status: 409 }
        );
      }

      data.email = email;
    }

    // -------------------------------------------------
    // PHONE
    // -------------------------------------------------

    if (
      phone !== undefined &&
      phone !== currentUser.phone
    ) {
      if (phone) {
        const phoneTaken =
          await db.user.findFirst({
            where: {
              phone,
              NOT: {
                id: currentUser.id,
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
                'Цей телефон вже використовується',
            },
            { status: 409 }
          );
        }
      }

      data.phone = phone;
    }

    // -------------------------------------------------
    // NAME
    // -------------------------------------------------

    if (name !== undefined) {
      data.name = name;
    }

    // -------------------------------------------------
    // PASSWORD
    // -------------------------------------------------

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Вкажіть поточний пароль',
          },
          { status: 400 }
        );
      }

      const passwordValid =
        await bcrypt.compare(
          currentPassword,
          currentUser.passwordHash
        );

      if (!passwordValid) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Поточний пароль невірний',
          },
          { status: 401 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Новий пароль повинен містити мінімум 8 символів',
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

    // -------------------------------------------------
    // NO CHANGES
    // -------------------------------------------------

    if (
      Object.keys(data).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Немає змін для збереження',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // UPDATE USER
    // -------------------------------------------------

    const updatedUser =
      await db.user.update({
        where: {
          id: currentUser.id,
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
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Профіль оновлено',

      user: updatedUser,
    });
  } catch (error) {
    console.error(
      'PATCH /api/auth/me error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Не вдалося оновити профіль',
      },
      { status: 500 }
    );
  }
}