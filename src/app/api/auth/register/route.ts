import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/prisma';
import { createEmailVerification } from '@/lib/auth/email-verification';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Content-Type must be application/json',
        },
        { status: 415 }
      );
    }

    const body = await request.json();

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : null;

    const phone =
      typeof body.phone === 'string'
        ? body.phone.trim()
        : null;

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email та пароль обовʼязкові',
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Пароль повинен містити мінімум 8 символів',
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // CHECK EXISTING USER
    // ---------------------------------------------------------

    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        isBlocked: true,
        emailVerifiedAt: true,
      },
    });

    if (existingUser) {
      // Якщо акаунт вже існує, але email не підтверджений
      if (!existingUser.emailVerifiedAt) {
        return NextResponse.json(
          {
            success: false,
            code: 'EMAIL_NOT_VERIFIED',
            message:
              'Акаунт з таким email вже існує, але email ще не підтверджено. Запросіть новий лист підтвердження.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Користувач з таким email вже існує',
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // HASH PASSWORD
    // ---------------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // ---------------------------------------------------------
    // CREATE USER
    // ---------------------------------------------------------

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        isBlocked: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    // ---------------------------------------------------------
    // EMAIL VERIFICATION
    // ---------------------------------------------------------
    //
    // Session НЕ створюємо.
    //
    // Спочатку користувач повинен підтвердити email.
    //

    try {
      await createEmailVerification({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      console.log(
        `EMAIL VERIFICATION SENT: ${user.email}`
      );
    } catch (emailError) {
      console.error(
        `EMAIL VERIFICATION ERROR: ${user.email}`,
        emailError
      );

      return NextResponse.json(
        {
          success: false,
          code: 'EMAIL_VERIFICATION_SEND_FAILED',
          message:
            'Акаунт створено, але не вдалося відправити лист підтвердження. Спробуйте запросити лист повторно.',
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message:
          'Реєстрація успішна. Перевірте вашу електронну пошту та підтвердьте email.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('REGISTER ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Помилка під час реєстрації',
      },
      { status: 500 }
    );
  }
}